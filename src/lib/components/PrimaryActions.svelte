<script>
	import { createEventDispatcher } from 'svelte';
	import { BookMarked, Compass, X, MapPin } from 'lucide-svelte';
	import { widgetState } from '$lib/stores/widgetState';
	
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
	<button 
		class="minimize-primary-btn" 
		on:click={() => widgetState.hide('primaryActions')} 
		title="Hide primary actions"
		aria-label="Hide primary actions"
	>
		<X size={10} color="currentColor" />
	</button>
	<button id="myCollectionBtn" on:click={handleCollectionClick}>
		<BookMarked size={18} color="currentColor" />
		<span>Field Journal</span>
	</button>
	<button id="recordTrackBtn" on:click={handleRecordTrackClick}>
		<MapPin size={18} color="currentColor" />
		<span>Record Track</span>
	</button>
	<button id="compassBtn" on:click={handleCompassClick}>
		<Compass size={18} color="currentColor" />
		<span>Compass</span>
	</button>
</div>

<style>
	#primaryActions {
		position: relative;
	}
	
	.minimize-primary-btn {
		position: absolute;
		top: 0.25rem;
		right: 0.25rem;
		background: rgba(0, 0, 0, 0.4);
		border: none;
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(255, 255, 255, 0.7);
		transition: all 0.2s ease;
		z-index: 20;
		opacity: 0;
		border-radius: 50%;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
		width: 22px;
		height: 22px;
	}
	
	#primaryActions:hover .minimize-primary-btn {
		opacity: 1;
	}
	
	.minimize-primary-btn:hover {
		transform: scale(1.1);
		background: rgba(244, 67, 54, 0.9);
		color: white;
	}
</style>
