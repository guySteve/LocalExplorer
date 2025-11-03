<script>
	import { createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { fetchWhat3Words } from '$lib/utils/api-extended';
	import { getPlaceDetails } from '$lib/utils/api';
	import { currentPosition } from '$lib/stores/appState';
	import { get } from 'svelte/store';
	
	const dispatch = createEventDispatcher();
	
	// Configuration constants
	const REVIEW_TEXT_MAX_LENGTH = 150;
	
	// Props
	export let place = null;
	export let visible = false;

	let what3words = '';
	let streetViewActive = false;
	let loading = true;
	let reviews = [];
	let loadingReviews = false;
	
	function getPlaceCoordinates() {
		if (!place) return null;
		if (place.location && typeof place.location.lat === 'number' && typeof place.location.lng === 'number') {
			return place.location;
		}
		if (typeof place.lat === 'number' && typeof place.lng === 'number') {
			return { lat: place.lat, lng: place.lng };
		}
		return null;
	}

	// Reactive: Fetch What3Words and reviews when place changes
	$: {
		const coords = getPlaceCoordinates();
		if (place && coords) {
			loading = false;
			loadWhat3Words(coords);
			loadReviews();
		} else {
			loading = true;
			reviews = [];
		}
	}
	
	async function loadWhat3Words(coords) {
		if (!place || !coords) return;
		
		try {
			const w3w = await fetchWhat3Words(coords.lat, coords.lng);
			what3words = w3w || '';
		} catch (err) {
			console.error('Failed to load What3Words:', err);
			what3words = '';
		}
	}
	
	async function loadReviews() {
		if (!place || !place.id) return;
		
		// Only fetch reviews for Google Places
		if (place.provider?.toLowerCase() !== 'google') {
			reviews = [];
			return;
		}
		
		loadingReviews = true;
		try {
			// The place ID might be in id or _original.place_id
			const placeId = place._original?.place_id || place.id;
			if (!placeId) {
				console.warn('No place ID available for reviews');
				reviews = [];
				return;
			}
			
			const details = await getPlaceDetails(placeId);
			const allReviews = details?.reviews || [];
			
			// Process reviews to show most recent and worst (if within last year)
			reviews = processReviews(allReviews);
		} catch (err) {
			console.error('Failed to load reviews:', err);
			reviews = [];
		} finally {
			loadingReviews = false;
		}
	}
	
	function processReviews(allReviews) {
		if (!allReviews || allReviews.length === 0) return [];
		
		const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000);
		const processedReviews = [];
		
		// Sort by time (most recent first)
		const sortedByTime = [...allReviews].sort((a, b) => b.time - a.time);
		
		// Add most recent review
		if (sortedByTime.length > 0) {
			processedReviews.push({
				...sortedByTime[0],
				isRecent: true
			});
		}
		
		// Find worst review within last year
		// Note: Google Places API returns timestamps in seconds, not milliseconds
		const recentReviews = allReviews.filter(review => {
			const reviewTime = review.time * 1000; // Convert to milliseconds
			return reviewTime >= oneYearAgo;
		});
		
		if (recentReviews.length > 0) {
			// Sort by rating (lowest first)
			const sortedByRating = [...recentReviews].sort((a, b) => a.rating - b.rating);
			const worstReview = sortedByRating[0];
			
			// Only add if it's different from the most recent and has low rating
			if (worstReview.time !== sortedByTime[0].time && worstReview.rating <= 3) {
				processedReviews.push({
					...worstReview,
					isWorst: true
				});
			}
		}
		
		// Add one more positive review if space allows (for balance)
		const positiveReviews = allReviews.filter(r => 
			r.rating >= 4 && 
			!processedReviews.find(pr => pr.time === r.time)
		);
		if (positiveReviews.length > 0 && processedReviews.length < 3) {
			processedReviews.push(positiveReviews[0]);
		}
		
		return processedReviews;
	}
	
	function close() {
		visible = false;
		streetViewActive = false;
		reviews = [];
		dispatch('close');
	}
	
	function openMaps() {
		const coords = getPlaceCoordinates();
		if (!place || !coords) return;
		
		const url = place._original?.url || 
			`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
		
		window.open(url, '_blank');
	}
	
	function openWebsite() {
		if (!place || !place._original?.website) return;
		window.open(place._original.website, '_blank');
	}
	
	function sharePlace() {
		const coords = getPlaceCoordinates();
		if (!place) return;
		
		const mapUrl = place._original?.url || 
			(coords ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}` : '');
		
		if (navigator.share) {
			navigator.share({
				title: place.name,
				text: place.address || '',
				url: mapUrl
			}).catch(console.error);
		} else {
			alert('Sharing not supported on this device.');
		}
	}
	
	function savePlace() {
		const coords = getPlaceCoordinates();
		if (!place || !coords) return;
		
		try {
			const collection = JSON.parse(localStorage.getItem('myCollection') || '[]');
			
			// Check if already saved
			const exists = collection.find(p => p.id === place.id);
			if (exists) {
				alert(`${place.name} is already in your collection!`);
				return;
			}
			
			collection.push({
				id: place.id,
				name: place.name,
				address: place.address,
				location: coords,
				provider: place.provider,
				savedAt: new Date().toISOString()
			});
			
			localStorage.setItem('myCollection', JSON.stringify(collection));
			alert(`✅ ${place.name} added to your collection!`);
		} catch (err) {
			console.error('Failed to save place:', err);
			alert('Failed to save place. Please try again.');
		}
	}
	
	function startNavigation() {
		const coords = getPlaceCoordinates();
		if (!place || !coords) return;
		
		dispatch('startNavigation', {
			location: coords,
			name: place.name
		});
	}
	
	function formatRating(rating, provider) {
		if (!rating) return '';
		
		const full = Math.floor(rating);
		const half = (rating - full) >= 0.5;
		const stars = '★'.repeat(full) + (half ? '½' : '');
		
		return `<span class="stars">${stars}</span> <span style="font-size:0.85rem; opacity:0.8;">(${rating.toFixed(1)})</span>`;
	}
	
	function formatProviderBadge(provider) {
		const badges = {
			google: { text: 'Google', color: '#4285f4' },
			foursquare: { text: 'Foursquare', color: '#f94877' },
			nps: { text: 'National Park Service', color: '#2e7d32' },
			recreation: { text: 'Recreation.gov', color: '#1976d2' },
			ticketmaster: { text: 'Ticketmaster', color: '#026cdf' }
		};
		
		const badge = badges[provider] || { text: provider, color: '#757575' };
		return `<span style="background: ${badge.color}; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${badge.text}</span>`;
	}
</script>

{#if visible && place}
<div class="details-sheet-overlay" class:active={visible} onclick={close} onkeydown={(e) => e.key === 'Enter' && close()} role="button" tabindex="0">
  <div class="details-sheet" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
    <!-- Header -->
    <div class="details-header">
      <div>
        <h2 class="details-name">{place.name}</h2>
        {#if place.provider}
          <div style="margin-top: 0.5rem;">
            {@html formatProviderBadge(place.provider)}
          </div>
        {/if}
      </div>
      <button class="close-btn" onclick={close} aria-label="Close details">×</button>
    </div>
    
    <!-- Content -->
    <div class="details-content">
      <!-- Rating -->
      {#if place.rating}
        <div class="details-row">
          <span class="details-label">Rating:</span>
          <div>{@html formatRating(place.rating, place.provider)}</div>
        </div>
      {/if}
      
      <!-- Address -->
      {#if place.address}
        <div class="details-row">
          <span class="details-label">📍 Address:</span>
          <span>{place.address}</span>
        </div>
      {/if}
      
      <!-- What3Words -->
      {#if what3words}
        <div class="details-row">
          <span class="details-label">🔷 What3Words:</span>
          <span style="font-weight: 600; color: var(--accent);">{what3words}</span>
        </div>
      {/if}
      
      <!-- Phone -->
      {#if place._original?.formatted_phone_number || place._original?.tel}
        <div class="details-row">
          <span class="details-label">📞 Phone:</span>
          <a href="tel:{place._original.formatted_phone_number || place._original.tel}" 
             style="color: var(--primary); text-decoration: none;">
            {place._original.formatted_phone_number || place._original.tel}
          </a>
        </div>
      {/if}
      
      <!-- Description (for NPS/Recreation) -->
      {#if place._original?.description}
        <div class="details-row" style="flex-direction: column; align-items: flex-start;">
          <span class="details-label">ℹ️ About:</span>
          <p style="margin: 0.5rem 0 0; line-height: 1.6; opacity: 0.9;">
            {place._original.description.substring(0, 300)}{place._original.description.length > 300 ? '...' : ''}
          </p>
        </div>
      {/if}
      
      <!-- Categories -->
      {#if place.categories && place.categories.length > 0}
        <div class="details-row">
          <span class="details-label">🏷️ Categories:</span>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            {#each place.categories.slice(0, 3) as category}
              <span style="background: rgba(var(--accent-rgb, 138, 90, 68), 0.2); 
                           padding: 0.25rem 0.5rem; 
                           border-radius: 4px; 
                           font-size: 0.85rem;">
                {category}
              </span>
            {/each}
          </div>
        </div>
      {/if}
      
      <!-- Reviews -->
      {#if loadingReviews}
        <div class="details-row">
          <span class="details-label">⭐ Reviews:</span>
          <span style="opacity: 0.7;">Loading reviews...</span>
        </div>
      {:else if reviews && reviews.length > 0}
        <div class="details-row" style="flex-direction: column; align-items: flex-start; border-bottom: none;">
          <span class="details-label" style="margin-bottom: 0.75rem;">⭐ Reviews ({reviews.length}):</span>
          <div class="reviews-container">
            {#each reviews.slice(0, 3) as review}
              <div class="review-card">
                <div class="review-header">
                  <div class="review-author">
                    {#if review.profile_photo_url}
                      <img src={review.profile_photo_url} alt={review.author_name} class="review-avatar" />
                    {/if}
                    <div>
                      <div class="review-author-name">{review.author_name}</div>
                      <div class="review-rating">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                    </div>
                  </div>
                  <div class="review-time">{review.relative_time_description}</div>
                </div>
                <p class="review-text">
                  {review.text.length > REVIEW_TEXT_MAX_LENGTH ? review.text.substring(0, REVIEW_TEXT_MAX_LENGTH) + '...' : review.text}
                </p>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
    
    <!-- Action Buttons -->
    <div class="details-actions">
      <button class="action-btn primary" onclick={startNavigation}>
        🧭 Guide Me
      </button>
      <button class="action-btn" onclick={openMaps}>
        🗺️ Maps
      </button>
      {#if place._original?.website}
        <button class="action-btn" onclick={openWebsite}>
          🌐 Website
        </button>
      {/if}
      <button class="action-btn" onclick={savePlace}>
        💾 Save
      </button>
      <button class="action-btn" onclick={sharePlace}>
        📤 Share
      </button>
    </div>
  </div>
</div>
{/if}

<style>
	.details-sheet-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: none;
		z-index: 1000;
		align-items: flex-end;
	}
	
	.details-sheet-overlay.active {
		display: flex;
	}
	
	.details-sheet {
		background: var(--background);
		width: 100%;
		max-height: 85vh;
		border-radius: 20px 20px 0 0;
		box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
		display: flex;
		flex-direction: column;
		animation: slideUp 0.3s ease-out;
	}
	
	@keyframes slideUp {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
	
	.details-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 1.5rem;
		border-bottom: 1px solid rgba(var(--card-rgb, 26, 43, 68), 0.1);
	}
	
	.details-name {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--card);
	}
	
	.close-btn {
		background: none;
		border: none;
		font-size: 2rem;
		color: var(--card);
		cursor: pointer;
		padding: 0;
		line-height: 1;
		opacity: 0.7;
		transition: opacity 0.2s;
	}
	
	.close-btn:hover {
		opacity: 1;
	}
	
	.details-content {
		padding: 1rem 1.5rem;
		overflow-y: auto;
		flex: 1;
	}
	
	.details-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid rgba(var(--card-rgb, 26, 43, 68), 0.05);
		color: var(--card);
	}
	
	.details-row:last-child {
		border-bottom: none;
	}
	
	.details-label {
		font-weight: 600;
		min-width: 120px;
		opacity: 0.8;
	}
	
	.details-actions {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
		gap: 0.75rem;
		padding: 1.5rem;
		border-top: 1px solid rgba(var(--card-rgb, 26, 43, 68), 0.1);
	}
	
	.action-btn {
		padding: 0.75rem 1rem;
		border: 2px solid var(--card);
		background: transparent;
		color: var(--card);
		border-radius: var(--button-radius, 12px);
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s;
		font-family: var(--font-primary);
	}
	
	.action-btn:hover {
		background: var(--card);
		color: var(--text-light);
		transform: translateY(-2px);
	}
	
	.action-btn.primary {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--text-light);
	}
	
	.action-btn.primary:hover {
		background: var(--secondary);
		border-color: var(--secondary);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(var(--primary-rgb, 200, 121, 65), 0.3);
	}
	
	.reviews-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
	}
	
	.review-card {
		background: rgba(var(--card-rgb, 26, 43, 68), 0.03);
		padding: 1rem;
		border-radius: 8px;
		border-left: 3px solid var(--accent);
	}
	
	.review-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.5rem;
		gap: 0.5rem;
	}
	
	.review-author {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.review-avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		object-fit: cover;
	}
	
	.review-author-name {
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--card);
	}
	
	.review-rating {
		color: #ffa000;
		font-size: 0.85rem;
	}
	
	.review-time {
		font-size: 0.75rem;
		opacity: 0.6;
		color: var(--card);
		white-space: nowrap;
	}
	
	.review-text {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.5;
		color: var(--card);
		opacity: 0.9;
	}
	
	@media (max-width: 768px) {
		.details-actions {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.action-btn {
			font-size: 0.85rem;
			padding: 0.65rem 0.85rem;
		}
		
		.review-card {
			padding: 0.75rem;
		}
		
		.review-avatar {
			width: 28px;
			height: 28px;
		}
		
		.review-header {
			flex-direction: column;
			align-items: flex-start;
		}
		
		.review-time {
			margin-top: 0.25rem;
		}
	}
</style>
