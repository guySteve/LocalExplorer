<script>
	import { currentPosition } from '$lib/stores/appState';
	
	export let locationDisplay = 'Determining your location…';
	
	$: coords = $currentPosition 
		? `${$currentPosition.lat.toFixed(4)}°, ${$currentPosition.lng.toFixed(4)}°`
		: null;
</script>

<div id="locationDisplay">
	<div class="location-city">{locationDisplay}</div>
	{#if coords}
		<div class="location-coords">{coords}</div>
	{/if}
</div>

<div id="manualInputContainer">
	<input type="text" id="manualInput" placeholder="Enter a location" />
</div>

<style>
	.location-city {
		font-weight: 600;
	}
	
	.location-coords {
		font-size: 0.75rem;
		opacity: 0.7;
		margin-top: 0.15rem;
	}
</style>
