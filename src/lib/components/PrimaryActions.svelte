<script>
	import { createEventDispatcher } from 'svelte';
	import { BookMarked, Compass, MapPin } from 'lucide-svelte';
	
	const dispatch = createEventDispatcher();
	
	function handleCollectionClick() {
		dispatch('openCollection');
	}
	
	function handleCompassClick() {
		dispatch('openCompass');
	}
	
	function handleRecordTrackClick() {
		dispatch('openRecordTrack');
	}
</script>

<div id="primaryActions">
	<button class="primary-action-btn" id="myCollectionBtn" on:click={handleCollectionClick}>
		<BookMarked size={18} color="currentColor" />
		<span>Field Journal</span>
	</button>
	<button class="primary-action-btn" id="recordTrackBtn" on:click={handleRecordTrackClick}>
		<MapPin size={18} color="currentColor" />
		<span>Record Track</span>
	</button>
	<button class="primary-action-btn" id="compassBtn" on:click={handleCompassClick}>
		<Compass size={18} color="currentColor" />
		<span>Compass</span>
	</button>
</div>

<style>
	.primary-action-btn {
		flex: 1;
		min-width: 0;
	}
</style>
