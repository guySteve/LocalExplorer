<script>
	import { onMount } from 'svelte';
	import { currentPosition, currentResults, latestLocationLabel, categories, currentWeatherCondition } from '$lib/stores/appState';
	import { searchGooglePlaces, performUnifiedSearch, calculateDistance, MILES_TO_METERS } from '$lib/utils/api';
	import { 
		searchLocalEvents, 
		searchBreweries, 
		searchNationalParks, 
		searchRecreationAreas,
		searchBirdSightings,
		fetchBirdHotspots
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
				} else if (item.value === 'bird-hotspots-nearby') {
					results = await fetchBirdHotspots(lat, lng, 50);
				} else if (item.value === 'bird-notable') {
					results = await searchBirdSightings(lat, lng, 'notable');
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
				// Standard Google Places search with unified fallback
				try {
					const places = await searchGooglePlaces(
						item.type,
						item.keyword,
						item.primaryTypeOnly
					);
					results = normalizeGooglePlacesResults(places);
				} catch (primaryError) {
					console.error('Primary Google search failed, attempting fallback:', primaryError);
					const fallbackQuery = item.keyword || item.name;
					if (fallbackQuery) {
						const fallbackResults = await performUnifiedSearch(fallbackQuery);
						results = normalizeUnifiedResults(fallbackResults);
					} else {
						throw primaryError;
					}
				}
			}
			results = attachMissingDistances(results);
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
	function toStandardPlace({
		id,
		name,
		address = '',
		provider = 'LocalExplorer',
		location = null,
		lat = null,
		lng = null,
		url = '',
		categories = [],
		rating = null,
		distance = null,
		image = null,
		date = null,
		original = null,
		extra = {}
	}) {
		if (!id || !name) return null;
		const coords = location || (lat != null && lng != null ? { lat, lng } : null);
		if (!coords) return null;
		const parsedLat = Number(coords.lat);
		const parsedLng = Number(coords.lng);
		if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
		const normalizedCategories = Array.isArray(categories) ? categories.filter(Boolean) : [];
		const normalizedUrl = typeof url === 'string' ? url : '';
		const resolvedDistance = typeof distance === 'number' ? distance : null;
		return {
			id,
			name,
			address,
			provider,
			location: { lat: parsedLat, lng: parsedLng },
			lat: parsedLat,
			lng: parsedLng,
			url: normalizedUrl,
			categories: normalizedCategories,
			rating,
			distance: resolvedDistance,
			image,
			date,
			_original: original,
			...extra
		};
	}

	function transformEventsToStandardFormat(events) {
		return events.map(event => {
			const venue = event._embedded?.venues?.[0];
			const classifications = Array.isArray(event.classifications)
				? event.classifications.map(c => c.segment?.name || c.genre?.name || '').filter(Boolean)
				: [];
			return toStandardPlace({
				id: event.id || event.name,
				name: event.name,
				address: venue?.address?.line1 || venue?.name || '',
				provider: 'Ticketmaster',
				lat: venue?.location?.latitude,
				lng: venue?.location?.longitude,
				url: event.url,
				categories: classifications,
				date: event.dates?.start?.dateTime || event.dates?.start?.localDate || null,
				image: event.images?.[0]?.url,
				original: event
			});
		}).filter(Boolean);
	}

	function transformBreweriesToStandardFormat(breweries) {
		return breweries.map(brewery => {
			const meters = typeof brewery.distance === 'number' ? brewery.distance * MILES_TO_METERS : null;
			return toStandardPlace({
				id: brewery.id,
				name: brewery.name,
				address: brewery.address,
				provider: 'OpenBreweryDB',
				lat: brewery.lat,
				lng: brewery.lng,
				url: brewery.website,
				categories: brewery.brewery_type ? [brewery.brewery_type] : [],
				distance: meters,
				original: brewery
			});
		}).filter(Boolean);
	}

	function transformParksToStandardFormat(parks) {
		return parks.map(park => {
			const meters = typeof park.distance === 'number' ? park.distance * MILES_TO_METERS : null;
			return toStandardPlace({
				id: park.id,
				name: park.name,
				address: park.states,
				provider: 'NPS',
				lat: park.lat,
				lng: park.lng,
				url: park.url,
				categories: park.designation ? [park.designation] : [],
				distance: meters,
				image: park.images?.[0]?.url,
				original: park
			});
		}).filter(Boolean);
	}

	function transformRecreationToStandardFormat(facilities, searchType) {
		let filtered = facilities;
		if (searchType === 'campground') {
			filtered = facilities.filter(f => 
				f.name.toLowerCase().includes('campground') || 
				f.name.toLowerCase().includes('camp')
			);
		}
		
		return filtered.map(facility => toStandardPlace({
			id: facility.id,
			name: facility.name,
			address: `${facility.city}, ${facility.state}`.trim(),
			provider: 'Recreation.gov',
			lat: facility.lat,
			lng: facility.lng,
			url: facility.reservationUrl,
			categories: ['Recreation Area'],
			original: facility
		})).filter(Boolean);
	}

	function normalizeGooglePlacesResults(places = []) {
		return places.map(place => toStandardPlace({
			id: place.id,
			name: place.name,
			address: place.address,
			provider: place.provider || 'Google',
			location: place.location,
			url: place._original?.website || place.url || '',
			categories: place.categories || [],
			rating: typeof place.rating === 'number' ? place.rating : null,
			distance: typeof place.distance === 'number' ? place.distance : null,
			original: place._original || place
		})).filter(Boolean);
	}

	function normalizeUnifiedResults(places = []) {
		return places.map(place => toStandardPlace({
			id: place.id,
			name: place.name,
			address: place.address,
			provider: place.provider || 'LocalExplorer',
			location: place.location,
			url: place.url || place._original?.url || '',
			categories: place.categories || [],
			rating: typeof place.rating === 'number' ? place.rating : null,
			distance: typeof place.distance === 'number' ? place.distance : null,
			image: place.image || null,
			date: place.date || null,
			original: place._original || place
		})).filter(Boolean);
	}

	function attachMissingDistances(places) {
		if (!Array.isArray(places) || !$currentPosition) return places;
		const { lat, lng } = $currentPosition;
		return places.map(place => {
			if (!place?.location || typeof place.distance === 'number') {
				return place;
			}
			const meters = calculateDistance(lat, lng, place.location.lat, place.location.lng);
			return { ...place, distance: meters };
		});
	}
	
	function handleSearchResults(event) {
		const { query, results } = event.detail;
		const standardized = attachMissingDistances(normalizeUnifiedResults(results));
		resultsTitle = `${standardized.length} results for "${query}"`;
		searchResults = standardized;
		currentResults.set(standardized);
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
	
	<WeatherSimple 
		on:openForecast={handleOpenForecast}
		on:openBirdMenu={() => handleOpenSubMenu({ detail: { title: 'Bird Watching', items: categories['Bird Watching'] || [] } })}
	/>
	
	<FilterGrid on:openSubMenu={handleOpenSubMenu} />
	
	<SupportCTA on:openDonate={() => showDonate = true} />
</main>

<!-- Hidden map div for Google Places service -->
<div id="hiddenMap" style="display: none; pointer-events: none;"></div>

<!-- Modals -->
<SettingsModal 
	visible={showSettings} 
	on:close={() => showSettings = false} 
/>

<CollectionModal 
	visible={showMyCollection} 
	on:close={() => showMyCollection = false} 
/>

<SubMenuModal 
	visible={showSubMenu}
	title={subMenuTitle}
	items={subMenuItems}
	onSelectItem={handleSubMenuSelect}
	on:close={() => showSubMenu = false}
/>

<ResultsModal 
	visible={showResults}
	title={resultsTitle}
	results={searchResults}
	onSelectPlace={handlePlaceSelect}
	on:close={() => showResults = false}
/>

<DonateModal 
	visible={showDonate} 
	on:close={() => showDonate = false} 
/>

<ForecastModal 
	visible={showForecast}
	forecastData={forecastData}
	on:close={() => showForecast = false}
/>

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
