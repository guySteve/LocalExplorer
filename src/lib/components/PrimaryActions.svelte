<script>
	import { createEventDispatcher } from 'svelte';
	import { BookMarked, Compass, X } from 'lucide-svelte';
	import { widgetState } from '$lib/stores/widgetState';
	
	const dispatch = createEventDispatcher();
	
	function handleCollectionClick() {
		dispatch('openCollection');
	}
	
	function handleCompassClick() {
		dispatch('openCompass');
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
	#primaryActions {
		position: relative;
	}
	
	.minimize-primary-btn {
		position: absolute;
		bottom: 0.25rem;
		right: 0.25rem;
		background: rgba(0, 0, 0, 0.6);
		border: none;
		cursor: pointer;
		padding: 0.3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-light);
		transition: all 0.2s ease;
		z-index: 20;
		opacity: 0.5;
		border-radius: 4px;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
	}
	
	.minimize-primary-btn:hover {
		transform: scale(1.05);
		color: rgba(244, 67, 54, 0.9);
		opacity: 0.9;
	}
</style>
