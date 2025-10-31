<script>
	import { currentPosition } from '$lib/stores/appState';
	
	export let locationDisplay = 'Determining your location…';
</script>

<div id="locationDisplay">{locationDisplay}</div>

<div id="manualInputContainer">
	<input type="text" id="manualInput" placeholder="Enter a location" />
</div>

<style>
	/* Component-specific styles scoped by default */
</style>
