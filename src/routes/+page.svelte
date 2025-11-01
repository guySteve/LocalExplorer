<script>
	import { onMount } from 'svelte';
	import { currentPosition, currentResults, latestLocationLabel } from '$lib/stores/appState';
	import { searchGooglePlaces, MILES_TO_METERS } from '$lib/utils/api';
	import { 
		searchLocalEvents, 
		searchBreweries, 
		searchNationalParks, 
		searchRecreationAreas,
		searchBirdSightings
	} from '$lib/utils/api-extended';
	
	// Import components
	import Header from '$lib/components/Header.svelte';
	import LocationDisplay from '$lib/components/LocationDisplay.svelte';
	import PrimaryActions from '$lib/components/PrimaryActions.svelte';
	import UnifiedSearch from '$lib/components/UnifiedSearch.svelte';
	import WeatherSimple from '$lib/components/WeatherSimple.svelte';
	import FilterGrid from '$lib/components/FilterGrid.svelte';
	import SupportCTA from '$lib/components/SupportCTA.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import CollectionModal from '$lib/components/CollectionModal.svelte';
	import SubMenuModal from '$lib/components/SubMenuModal.svelte';
	import ResultsModal from '$lib/components/ResultsModal.svelte';
	import DonateModal from '$lib/components/DonateModal.svelte';
	import ForecastModal from '$lib/components/ForecastModal.svelte';
	import DetailsSheet from '$lib/components/DetailsSheet.svelte';
	import Compass from '$lib/components/Compass.svelte';
	
	// Modal visibility state
	let showSettings = false;
	let showMyCollection = false;
	let showSubMenu = false;
	let showResults = false;
	let showDonate = false;
	let showForecast = false;
	let showDetails = false;
	let showCompass = false;
	
	// Modal data
	let subMenuTitle = '';
	let subMenuItems = [];
	let resultsTitle = 'Results';
	let searchResults = [];
	let forecastData = [];
	let selectedPlace = null;
	let compassDestination = null;
	let compassDestinationName = '';
	
	onMount(() => {
		// Initialize app
		console.log('LocalExplorer SvelteKit initialized');
	});
	
	function handleOpenSubMenu(event) {
		subMenuTitle = event.detail.title;
		subMenuItems = event.detail.items;
		showSubMenu = true;
	}
	
	async function handleSubMenuSelect(item) {
		showSubMenu = false;
		
		if (!$currentPosition) {
			alert('Location not available. Please enable location services.');
			return;
		}
		
		const { lat, lng } = $currentPosition;
		let results = [];
		
		try {
			// Detect category type and route to appropriate API
			if (item.value) {
				// Check if it's a bird watching search
				if (item.value === 'bird-sightings') {
					results = await searchBirdSightings(lat, lng, 'recent');
				} else if (item.value === 'rare-birds') {
					results = await searchBirdSightings(lat, lng, 'rare');
				} else if (item.value === 'bird-hotspots') {
					results = await searchBirdSightings(lat, lng, 'hotspots');
				} else {
					// Local Events (Ticketmaster)
					const classification = item.value === 'all' ? '' : item.value;
					const events = await searchLocalEvents(lat, lng, classification);
					results = transformEventsToStandardFormat(events);
				}
			} else if (item.search) {
				// Breweries or Recreation
				if (item.search === 'national_park') {
					const parks = await searchNationalParks(lat, lng);
					results = transformParksToStandardFormat(parks);
				} else if (item.search === 'recreation' || item.search === 'campground') {
					const recreation = await searchRecreationAreas(lat, lng);
					results = transformRecreationToStandardFormat(recreation, item.search);
				} else {
					// Breweries
					const query = item.search === 'breweries' ? '' : item.search;
					const breweries = await searchBreweries(lat, lng, query);
					results = transformBreweriesToStandardFormat(breweries);
				}
			} else {
				// Standard Google Places search
				results = await searchGooglePlaces(
					item.type,
					item.keyword,
					item.primaryTypeOnly
				);
			}
			
			resultsTitle = `${item.name} near you`;
			searchResults = results;
			currentResults.set(results);
			showResults = true;
		} catch (error) {
			console.error('Search failed:', error);
			alert('Search failed. Please try again.');
		}
	}
	
	// Transform functions to standardize results for ResultsModal
	function transformEventsToStandardFormat(events) {
		return events.map(event => ({
			id: event.id || event.name,
			name: event.name,
			address: event._embedded?.venues?.[0]?.address?.line1 || event._embedded?.venues?.[0]?.name || '',
			url: event.url,
			provider: 'Ticketmaster',
			lat: parseFloat(event._embedded?.venues?.[0]?.location?.latitude),
			lng: parseFloat(event._embedded?.venues?.[0]?.location?.longitude),
			image: event.images?.[0]?.url
		})).filter(e => e.lat && e.lng);
	}

	function transformBreweriesToStandardFormat(breweries) {
		return breweries.map(brewery => ({
			id: brewery.id,
			name: brewery.name,
			address: brewery.address,
			categories: [brewery.brewery_type],
			url: brewery.website,
			provider: 'OpenBreweryDB',
			lat: brewery.lat,
			lng: brewery.lng,
			distance: brewery.distance ? brewery.distance * MILES_TO_METERS : null
		}));
	}

	function transformParksToStandardFormat(parks) {
		return parks.map(park => ({
			id: park.id,
			name: park.name,
			address: park.states,
			categories: [park.designation],
			url: park.url,
			provider: 'NPS',
			lat: park.lat,
			lng: park.lng,
			distance: park.distance ? park.distance * MILES_TO_METERS : null,
			image: park.images?.[0]?.url
		}));
	}

	function transformRecreationToStandardFormat(facilities, searchType) {
		let filtered = facilities;
		if (searchType === 'campground') {
			filtered = facilities.filter(f => 
				f.name.toLowerCase().includes('campground') || 
				f.name.toLowerCase().includes('camp')
			);
		}
		
		return filtered.map(facility => ({
			id: facility.id,
			name: facility.name,
			address: `${facility.city}, ${facility.state}`,
			categories: ['Recreation Area'],
			url: facility.reservationUrl,
			provider: 'Recreation.gov',
			lat: facility.lat,
			lng: facility.lng
		})).filter(f => f.lat && f.lng);
	}
	
	function handleSearchResults(event) {
		const { query, results } = event.detail;
		resultsTitle = `${results.length} results for "${query}"`;
		searchResults = results;
		currentResults.set(results);
		showResults = true;
	}
	
	function handlePlaceSelect(place) {
		console.log('Place selected:', place);
		selectedPlace = place;
		showDetails = true;
		showResults = false;
	}
	
	function handleOpenForecast(event) {
		forecastData = event.detail || [];
		showForecast = true;
	}
	
	function handleStartNavigation(event) {
		console.log('Starting navigation:', event.detail);
		const { location, name } = event.detail;
		
		compassDestination = location;
		compassDestinationName = name;
		showDetails = false;
		showCompass = true;
	}
	
	function handleCloseDetails() {
		showDetails = false;
		selectedPlace = null;
	}
	
	function handleCloseCompass() {
		showCompass = false;
		compassDestination = null;
		compassDestinationName = '';
	}
</script>

<Header on:openSettings={() => showSettings = true} />

<main class="appShell">
	<LocationDisplay locationDisplay={$latestLocationLabel || 'Determining your location…'} />
	
	<PrimaryActions 
    on:openCollection={() => showMyCollection = true}
    on:openCompass={() => showCompass = true}
/>
	
	<UnifiedSearch on:searchResults={handleSearchResults} />
	
	<WeatherSimple on:openForecast={handleOpenForecast} />
	
	<FilterGrid on:openSubMenu={handleOpenSubMenu} />
	
	<SupportCTA on:openDonate={() => showDonate = true} />
</main>

<!-- Hidden map div for Google Places service -->
<div id="hiddenMap" style="display: none; pointer-events: none;"></div>

<!-- Modals -->
{#if showSettings}
	<SettingsModal on:close={() => showSettings = false} />
{/if}

{#if showMyCollection}
	<CollectionModal on:close={() => showMyCollection = false} />
{/if}

{#if showSubMenu}
	<SubMenuModal 
		title={subMenuTitle}
		items={subMenuItems}
		onSelectItem={handleSubMenuSelect}
		on:close={() => showSubMenu = false}
	/>
{/if}

{#if showResults}
	<ResultsModal 
		title={resultsTitle}
		results={searchResults}
		onSelectPlace={handlePlaceSelect}
		on:close={() => showResults = false}
	/>
{/if}

{#if showDonate}
	<DonateModal on:close={() => showDonate = false} />
{/if}

{#if showForecast}
	<ForecastModal 
		forecastData={forecastData}
		on:close={() => showForecast = false}
	/>
{/if}

<!-- NEW: Details Sheet -->
<DetailsSheet 
	place={selectedPlace}
	visible={showDetails}
	on:close={handleCloseDetails}
	on:startNavigation={handleStartNavigation}
/>

<!-- NEW: Compass -->
<Compass 
	destination={compassDestination}
	destinationName={compassDestinationName}
	visible={showCompass}
	on:close={handleCloseCompass}
/>

<style>
	/* Page-specific styles if needed */
</style>
