<script>
	import { onMount } from 'svelte';
	import { currentPosition, currentResults, latestLocationLabel } from '$lib/stores/appState';
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
	import DetailsSheet from '$lib/components/DetailsSheet.svelte';
	import Compass from '$lib/components/Compass.svelte';
	import NearbyNow from '$lib/components/NearbyNow.svelte';
	
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
	
	function handleOpenBirdWatching() {
		// Trigger the "Watch Birds" submenu
		handleOpenSubMenu({
			detail: {
				title: 'Bird Watching',
				items: [
					{ label: 'Recent Sightings', value: 'bird-sightings' },
					{ label: 'Rare Species Alert', value: 'rare-birds' },
					{ label: 'Birding Hotspots', value: 'bird-hotspots' }
				]
			}
		});
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
	
	<WeatherWidget on:openForecast={handleOpenForecast} />
	
	<NearbyNow on:openBirdWatching={handleOpenBirdWatching} />
	
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
