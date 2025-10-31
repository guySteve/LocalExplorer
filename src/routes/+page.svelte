<script>
	import { onMount } from 'svelte';
	import { currentPosition } from '$lib/stores/appState';
	
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
	
	// Modal visibility state
	let locationDisplay = 'Determining your location…';
	let showSettings = false;
	let showMyCollection = false;
	let showCompass = false;
	
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
	});
</script>

<Header on:openSettings={() => showSettings = true} />

<main class="appShell">
	<LocationDisplay {locationDisplay} />
	
	<PrimaryActions 
		on:openCollection={() => showMyCollection = true}
		on:openCompass={() => showCompass = true}
	/>
	
	<UnifiedSearch />
	
	<WeatherWidget />
	
	<FilterGrid />
	
	<SupportCTA />
</main>

{#if showSettings}
	<SettingsModal on:close={() => showSettings = false} />
{/if}

{#if showMyCollection}
	<CollectionModal on:close={() => showMyCollection = false} />
{/if}

<style>
	/* Page-specific styles if needed */
</style>
