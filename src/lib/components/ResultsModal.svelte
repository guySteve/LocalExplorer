<script>
	import { createEventDispatcher } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { calculateDistance } from '$lib/utils/api';
	
	const dispatch = createEventDispatcher();
	
	// Props
	let { 
		visible = false,
		title = 'Results',
		results = [],
		onSelectPlace = (place) => {},
		onLoadMore = null,
		loading = false
	} = $props();
	
	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			dispatch('close');
		}
	}
	
	function handlePlaceClick(place) {
		onSelectPlace(place);
	}
	
	function formatDistance(meters) {
		if (!meters) return '';
		const km = meters / 1000;
		return km < 1 ? `${meters.toFixed(0)}m away` : `${km.toFixed(1)}km away`;
	}
</script>

{#if visible}
<div class="modal active" on:click={handleBackdropClick} transition:fade={{ duration: 200 }} role="dialog" aria-modal="true" tabindex="-1" on:keydown={(e) => e.key === 'Escape' && dispatch('close')}>
	<div class="modal-content" transition:fly={{ y: 50, duration: 300 }} role="document">
		<div class="modal-header">
			<h3>{title}</h3>
			<button class="close-btn" on:click={() => dispatch('close')} type="button">×</button>
		</div>
		
		{#if loading}
			<div class="loading-state">
				<div class="spinner"></div>
				<p>🔍 Searching all sources...</p>
			</div>
		{:else if results.length === 0}
			<div class="empty-state">
				<p>No results found. Try a different search term.</p>
			</div>
		{:else}
			<div class="results-list">
				{#each results as place, i (place.id + '-' + i)}
					<button
						type="button"
						class="result-card" 
						on:click={() => handlePlaceClick(place)}
						transition:fly={{ y: 20, duration: 300, delay: i * 30 }}
					>
						<div class="result-header">
							<h4>{place.name}</h4>
							{#if place.provider}
								<span class="provider-badge">{place.provider}</span>
							{/if}
						</div>
						
						{#if place.date}
							<div class="result-date">
								📅 {new Date(place.date).toLocaleDateString()}
							</div>
						{/if}
						
						{#if place.address}
							<p class="result-address">{place.address}</p>
						{/if}
						
						{#if place.categories && place.categories.length > 0}
							<p class="result-categories">
								{place.categories.slice(0, 2).join(', ')}
							</p>
						{/if}
						
						{#if place.rating}
							<p class="result-rating">
								⭐ {place.rating.toFixed(1)}
							</p>
						{/if}
						
						{#if place.distance}
							<p class="result-distance">{formatDistance(place.distance)}</p>
						{/if}
					</button>
				{/each}
			</div>
			
			{#if onLoadMore}
				<button 
					class="load-more-btn" 
					on:click={onLoadMore}
					disabled={loading}
				>
					{loading ? 'Loading...' : 'Keep scanning'}
				</button>
			{/if}
		{/if}
	</div>
</div>
{/if}

<style>
	.loading-state, .empty-state {
		text-align: center;
		padding: 3rem 2rem;
		color: var(--card);
	}
	
	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid var(--accent);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 1rem;
	}
	
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	
	.results-list {
		max-height: 60vh;
		overflow-y: auto;
		padding: 0.5rem 0;
	}
	
	.result-card {
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(200, 121, 65, 0.2);
		border-radius: var(--button-radius, 12px);
		padding: 1rem;
		margin-bottom: 0.75rem;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}
	
	.result-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
		border-color: var(--primary);
		background: rgba(255, 255, 255, 0.08);
	}
	
	.result-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.5rem;
		gap: 0.5rem;
	}
	
	.result-header h4 {
		margin: 0;
		color: var(--card);
		font-size: 1.05rem;
		font-weight: 600;
		flex: 1;
	}
	
	.provider-badge {
		background: var(--accent);
		color: var(--text-light);
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		white-space: nowrap;
	}
	
	.result-date {
		color: var(--primary);
		font-weight: 600;
		margin-bottom: 0.4rem;
		font-size: 0.9rem;
	}
	
	.result-address {
		margin: 0.25rem 0;
		color: var(--card);
		opacity: 0.8;
		font-size: 0.9rem;
	}
	
	.result-categories {
		margin: 0.25rem 0;
		color: var(--accent);
		font-size: 0.85rem;
	}
	
	.result-rating {
		margin: 0.25rem 0;
		color: var(--primary);
		font-size: 0.9rem;
		font-weight: 600;
	}
	
	.result-distance {
		margin: 0.25rem 0;
		color: var(--primary);
		font-size: 0.85rem;
		font-weight: 600;
	}
	
	.load-more-btn {
		width: 100%;
		padding: 0.9rem;
		margin-top: 1rem;
		background: var(--primary);
		color: var(--text-light);
		border: none;
		border-radius: var(--button-radius, 12px);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}
	
	.load-more-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
	}
	
	.load-more-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
