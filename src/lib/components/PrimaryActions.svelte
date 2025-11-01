<script>
	import { createEventDispatcher } from 'svelte';
	
	const dispatch = createEventDispatcher();
	
	function handleCollectionClick() {
		dispatch('openCollection');
	}
</script>

<div id="primaryActions">
	<button id="myCollectionBtn" on:click={handleCollectionClick}>📋 My Collection</button>
	<!-- Compass button disabled until CompassModal.svelte is implemented -->
	<button id="compassBtn" on:click={() => dispatch('openCompass')}>🧭 Compass</button>
</div>

<style>
	/* Component-specific styles scoped by default */
</style>
