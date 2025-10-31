<script>
	import { createEventDispatcher } from 'svelte';
	
	const dispatch = createEventDispatcher();
	
	function handleCollectionClick() {
		dispatch('openCollection');
	}
	
	// Compass functionality reserved for future implementation
	// function handleCompassClick() {
	// 	dispatch('openCompass');
	// }
</script>

<div id="primaryActions">
	<button id="myCollectionBtn" on:click={handleCollectionClick}>📋 My Collection</button>
	<!-- Compass button disabled until CompassModal.svelte is implemented -->
	<button id="compassBtn" on:click={() => dispatch('openCompass')}>🧭 Compass</button>
</div>

<style>
	/* Component-specific styles scoped by default */
</style>
