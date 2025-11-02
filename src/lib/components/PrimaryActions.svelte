<script>
	import { createEventDispatcher } from 'svelte';
	
	const dispatch = createEventDispatcher();
	
	function handleCollectionClick() {
		dispatch('openCollection');
	}
	
	function handleCompassClick() {
		dispatch('openCompass');
	}
</script>

<div id="primaryActions">
	<button id="myCollectionBtn" on:click={handleCollectionClick}>📋 My Collection</button>
	<button id="compassBtn" on:click={handleCompassClick}>🧭 Compass</button>
</div>

<style>
	/* Component-specific styles scoped by default */
</style>
