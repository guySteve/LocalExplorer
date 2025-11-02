<script>
	import { onMount } from 'svelte';
	import { currentPosition } from '$lib/stores/appState';
	import { searchLocalEvents, fetchRecentBirdSightings } from '$lib/utils/api-extended';
	import { createEventDispatcher } from 'svelte';
	
	const dispatch = createEventDispatcher();
	
	let loading = true;
	let event = null;
	let birdSighting = null;
	let error = null;
	
	onMount(() => {
		// Wait for position to be available
		const unsubscribe = currentPosition.subscribe(pos => {
			if (pos && loading) {
				loadNearbyContent();
			}
		});
		
		return unsubscribe;
	});
	
	async function loadNearbyContent() {
		const pos = $currentPosition;
		if (!pos) return;
		
		loading = true;
		error = null;
		
		try {
			// Fetch in parallel
			const [eventsData, birdData] = await Promise.all([
				searchLocalEvents(pos.lat, pos.lng).catch(err => {
					console.warn('Events fetch failed:', err);
					return [];
				}),
				fetchRecentBirdSightings(pos.lat, pos.lng).catch(err => {
					console.warn('Bird sightings fetch failed:', err);
					return null;
				})
			]);
			
			// Pick a random event if available
			if (eventsData && eventsData.length > 0) {
				event = eventsData[Math.floor(Math.random() * eventsData.length)];
			}
			
			// Set bird sighting if available
			if (birdData && birdData !== 'configure-key') {
				birdSighting = birdData;
			}
		} catch (err) {
			console.error('Failed to load nearby content:', err);
			error = 'Unable to load nearby happenings';
		} finally {
			loading = false;
		}
	}
	
	function handleEventClick() {
		if (event && event.url) {
			window.open(event.url, '_blank');
		}
	}
	
	function handleBirdClick() {
		dispatch('openBirdWatching');
	}
	
	function handleKeyDown(handler) {
		return (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				handler();
			}
		};
	}
	
	function formatEventDate(event) {
		if (!event || !event.dates || !event.dates.start) return '';
		
		const date = new Date(event.dates.start.localDate);
		const today = new Date();
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		
		// Check if today or tomorrow
		if (date.toDateString() === today.toDateString()) {
			return '🔥 Tonight';
		} else if (date.toDateString() === tomorrow.toDateString()) {
			return '📅 Tomorrow';
		} else {
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		}
	}
</script>

<div class="nearby-now">
	<h3 class="nearby-title">
		✨ Happening Near You
	</h3>
	
	{#if loading}
		<div class="nearby-loading">
			<div class="spinner"></div>
			<p>Discovering local happenings...</p>
		</div>
	{:else if error}
		<div class="nearby-error">
			<p>⚠️ {error}</p>
		</div>
	{:else}
		<div class="nearby-content">
			<!-- Event Card -->
			{#if event}
				<div class="nearby-card event-card" onclick={handleEventClick} onkeydown={handleKeyDown(handleEventClick)} role="button" tabindex="0">
					<div class="card-badge event-badge">
						{formatEventDate(event)}
					</div>
					
					{#if event.images && event.images.length > 0}
						<div class="card-image" style="background-image: url({event.images[0].url})"></div>
					{/if}
					
					<div class="card-content">
						<h4 class="card-title">{event.name}</h4>
						
						{#if event._embedded?.venues?.[0]}
							<p class="card-subtitle">
								📍 {event._embedded.venues[0].name}
							</p>
						{/if}
						
						{#if event.classifications?.[0]?.segment?.name}
							<span class="card-tag">
								{event.classifications[0].segment.name}
							</span>
						{/if}
					</div>
				</div>
			{/if}
			
			<!-- Bird Sighting Card -->
			{#if birdSighting}
				<div class="nearby-card bird-card" onclick={handleBirdClick} onkeydown={handleKeyDown(handleBirdClick)} role="button" tabindex="0">
					<div class="card-badge bird-badge">
						🐦 Nature Watch
					</div>
					
					<div class="card-content">
						<h4 class="card-title">
							{birdSighting.split('🐦 ')[1]?.split(' (')[0] || 'Recent Bird Sighting'}
						</h4>
						<p class="card-subtitle">
							{birdSighting}
						</p>
					</div>
				</div>
			{/if}
			
			{#if !event && !birdSighting}
				<div class="nearby-empty">
					<p>🌍 No special happenings right now, but explore the categories below!</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.nearby-now {
		background: linear-gradient(135deg, var(--background) 0%, rgba(var(--primary-rgb, 200, 121, 65), 0.05) 100%);
		padding: 1.5rem;
		border-radius: var(--radius, 12px);
		margin: 1.5rem 0;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	}
	
	.nearby-title {
		margin: 0 0 1rem;
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--card);
		font-family: var(--font-primary);
		text-align: center;
	}
	
	.nearby-loading {
		text-align: center;
		padding: 2rem;
		color: var(--card);
	}
	
	.spinner {
		width: 40px;
		height: 40px;
		margin: 0 auto 1rem;
		border: 4px solid rgba(var(--primary-rgb, 200, 121, 65), 0.3);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	
	.nearby-error {
		text-align: center;
		padding: 1rem;
		color: var(--card);
		opacity: 0.8;
	}
	
	.nearby-content {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
	}
	
	.nearby-card {
		background: var(--background);
		border-radius: var(--radius, 12px);
		overflow: hidden;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		cursor: pointer;
		transition: all 0.3s ease;
		position: relative;
	}
	
	.nearby-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
	}
	
	.card-badge {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		padding: 0.4rem 0.75rem;
		border-radius: 20px;
		font-size: 0.75rem;
		font-weight: 700;
		z-index: 10;
		backdrop-filter: blur(10px);
	}
	
	.event-badge {
		background: rgba(255, 69, 0, 0.9);
		color: white;
	}
	
	.bird-badge {
		background: rgba(76, 175, 80, 0.9);
		color: white;
	}
	
	.card-image {
		width: 100%;
		height: 160px;
		background-size: cover;
		background-position: center;
		background-color: rgba(var(--card-rgb, 26, 43, 68), 0.1);
	}
	
	.card-content {
		padding: 1rem;
	}
	
	.card-title {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--card);
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	
	.card-subtitle {
		margin: 0.5rem 0;
		font-size: 0.9rem;
		color: var(--card);
		opacity: 0.8;
		line-height: 1.4;
	}
	
	.card-tag {
		display: inline-block;
		padding: 0.25rem 0.6rem;
		background: rgba(var(--accent-rgb, 138, 90, 68), 0.2);
		color: var(--accent);
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
		margin-top: 0.5rem;
	}
	
	.nearby-empty {
		grid-column: 1 / -1;
		text-align: center;
		padding: 2rem;
		color: var(--card);
		opacity: 0.7;
	}
	
	@media (max-width: 768px) {
		.nearby-content {
			grid-template-columns: 1fr;
		}
	}
</style>
