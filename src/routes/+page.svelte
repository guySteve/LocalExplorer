<script>
	import { onMount } from 'svelte';
	import { currentPosition, currentResults } from '$lib/stores/appState';
	import { searchGooglePlaces } from '$lib/utils/api';
	
	// Import components
	import Header from '$lib/components/Header.svelte';
	import LocationDisplay from '$lib/components/LocationDisplay.svelte';
	import PrimaryActions from '$lib/components/PrimaryActions.svelte';
	import UnifiedSearch from '$lib/components/UnifiedSearch.svelte';
	import WeatherWidget from '$lib/components/WeatherWidget.svelte';
	import FilterGrid from '$lib/components/FilterGrid.svelte';
	import SupportCTA from '$lib/components/SupportCTA.svelte';
	import SettingsModal from '$lib/components/SettingsModal.svelte';
	import CollectionModal from '$lib/components/CollectionModal.svelte';
	import SubMenuModal from '$lib/components/SubMenuModal.svelte';
	import ResultsModal from '$lib/components/ResultsModal.svelte';
	import DonateModal from '$lib/components/DonateModal.svelte';
	import ForecastModal from '$lib/components/ForecastModal.svelte';
	
	// Modal visibility state
	let locationDisplay = 'Determining your location…';
	let showSettings = false;
	let showMyCollection = false;
	let showSubMenu = false;
	let showResults = false;
	let showDonate = false;
	let showForecast = false;
	
	// Modal data
	let subMenuTitle = '';
	let subMenuItems = [];
	let resultsTitle = 'Results';
	let searchResults = [];
	let forecastData = [];
	
	onMount(() => {
		// Initialize app
		console.log('LocalExplorer SvelteKit initialized');
		
		// Request geolocation
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					currentPosition.set({
						lat: position.coords.latitude,
						lng: position.coords.longitude
					});
					// Display approximate location for privacy
					locationDisplay = `Location acquired`;
				},
				(error) => {
					console.error('Geolocation error:', error);
					locationDisplay = 'Location access denied';
				}
			);
		} else {
			locationDisplay = 'Geolocation not supported';
		}
		
		// Load Google Maps API if not already loaded
		if (!window.google) {
			const script = document.createElement('script');
			const apiKey = window.GOOGLE_MAPS_API_KEY || '';
			script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
			script.async = true;
			script.defer = true;
			document.head.appendChild(script);
		}
	});
	
	function handleOpenSubMenu(event) {
		subMenuTitle = event.detail.title;
		subMenuItems = event.detail.items;
		showSubMenu = true;
	}
	
	async function handleSubMenuSelect(item) {
		showSubMenu = false;
		
		try {
			// Search Google Places for this category
			const results = await searchGooglePlaces(
				item.type,
				item.keyword,
				item.primaryTypeOnly
			);
			
			resultsTitle = `${item.name} near you`;
			searchResults = results;
			currentResults.set(results);
			showResults = true;
		} catch (error) {
			console.error('Search failed:', error);
			alert('Search failed. Please try again.');
		}
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
		// TODO: Implement DetailsSheet modal
		alert(`Details for ${place.name} - To be implemented`);
	}
	
	function handleOpenForecast(event) {
		forecastData = event.detail || [];
		showForecast = true;
	}
</script>

<Header on:openSettings={() => showSettings = true} />

<main class="appShell">
	<LocationDisplay {locationDisplay} />
	
	<PrimaryActions 
		on:openCollection={() => showMyCollection = true}
	/>
	
	<UnifiedSearch on:searchResults={handleSearchResults} />
	
	<WeatherWidget on:openForecast={handleOpenForecast} />
	
	<FilterGrid on:openSubMenu={handleOpenSubMenu} />
	
	<SupportCTA on:openDonate={() => showDonate = true} />
</main>

<!-- Hidden map div for Google Places service -->
<div id="hiddenMap" style="display: none;"></div>

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

<style>
	/* Page-specific styles if needed */
</style>
