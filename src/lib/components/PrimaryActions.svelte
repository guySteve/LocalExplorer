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
		<X size={16} color="currentColor" />
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
		top: 0.5rem;
		right: 0.5rem;
		background: var(--card);
		border: none;
		cursor: pointer;
		padding: 0.4rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-light);
		transition: all 0.2s ease;
		z-index: 20;
		opacity: 0.8;
		border-radius: 50%;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}
	
	.minimize-primary-btn:hover {
		transform: scale(1.1);
		color: rgba(244, 67, 54, 0.9);
		opacity: 1;
	}
</style>
