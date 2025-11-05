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
		<X size={12} color="currentColor" />
	</button>
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
	#primaryActions {
		position: relative;
	}
	
	.minimize-primary-btn {
		position: absolute;
		top: 0.4rem;
		right: 0.4rem;
		background: rgba(244, 67, 54, 0.85);
		border: none;
		cursor: pointer;
		padding: 0.3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		transition: all 0.2s ease;
		z-index: 20;
		opacity: 1;
		border-radius: 50%;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
		width: 26px;
		height: 26px;
	}
	
	.minimize-primary-btn:hover {
		transform: scale(1.1);
		background: rgba(244, 67, 54, 1);
		box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
	}
	
	.primary-action-btn {
		flex: 1;
		min-width: 0;
	}
</style>
