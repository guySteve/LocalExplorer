<script>
	import { createEventDispatcher } from 'svelte';
	import { BookMarked, Compass, MapPin, Search } from 'lucide-svelte';
	
	const dispatch = createEventDispatcher();
	
	function handleCollectionClick() { dispatch('openCollection'); }
	function handleCompassClick() { dispatch('openCompass'); }
	function handleRecordTrackClick() { dispatch('openRecordTrack'); }
	function handleHomeClick() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
</script>

<div class="bottom-nav">
	<button class="nav-item" on:click={handleHomeClick}>
		<Search size={22} color="currentColor" />
		<span>Explore</span>
	</button>
	<button class="nav-item" on:click={handleCollectionClick}>
		<BookMarked size={22} color="currentColor" />
		<span>Journal</span>
	</button>
	<button class="nav-item" on:click={handleRecordTrackClick}>
		<MapPin size={22} color="currentColor" />
		<span>Track</span>
	</button>
	<button class="nav-item" on:click={handleCompassClick}>
		<Compass size={22} color="currentColor" />
		<span>Compass</span>
	</button>
</div>

<style>
	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		width: 100%;
		background: rgba(253, 251, 250, 0.95);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-top: 1px solid rgba(42, 40, 37, 0.1);
		display: flex;
		justify-content: space-around;
		align-items: center;
		padding: 0.5rem 0 calc(0.5rem + env(safe-area-inset-bottom, 0px));
		z-index: 100;
		box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05);
	}

	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		background: none;
		border: none;
		color: var(--text-dark, #2A2825);
		font-family: var(--font-secondary, sans-serif);
		font-size: 0.7rem;
		font-weight: 600;
		cursor: pointer;
		padding: 0.5rem;
		transition: all 0.2s ease;
		flex: 1;
	}

	.nav-item:hover, .nav-item:active {
		color: var(--primary, #D45D3B);
		transform: translateY(-2px);
	}
</style>
