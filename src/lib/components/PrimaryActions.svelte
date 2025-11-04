<script>
	import { createEventDispatcher } from 'svelte';
	import { BookMarked, Compass } from 'lucide-svelte';
	
	const dispatch = createEventDispatcher();
	
	function handleCollectionClick() {
		dispatch('openCollection');
	}
	
	function handleCompassClick() {
		dispatch('openCompass');
	}
</script>

<div id="primaryActions">
	<button id="myCollectionBtn" on:click={handleCollectionClick}>
		<BookMarked size={18} color="currentColor" />
		<span>My Collection</span>
	</button>
	<button id="compassBtn" on:click={handleCompassClick}>
		<Compass size={18} color="currentColor" />
		<span>Compass</span>
	</button>
</div>

<style>
	/* Component-specific styles scoped by default */
</style>
