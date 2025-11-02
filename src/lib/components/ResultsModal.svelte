<script>
import { createEventDispatcher } from 'svelte';
import { fade, fly } from 'svelte/transition';
import { calculateDistance } from '$lib/utils/api';

export let title = 'Results';
export let results = [];
export let onSelectPlace = (place) => {};
export let onLoadMore = null;
export let loading = false;
export let visible = false;

const dispatch = createEventDispatcher();

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
return km < 1 ? "${meters.toFixed(0)}m away" : "${km.toFixed(1)}km away";
}
</script>

<div class="modal" class:active={visible} on:click={handleBackdropClick} transition:fade={{ duration: 200 }} role="dialog" aria-modal="true" tabindex="-1" on:keydown={(e) => e.key === 'Escape' && dispatch('close')}>
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
<p>No results found nearby. Try adjusting your location or search criteria.</p>
</div>
{:else}
<div class="results-list">
{#each results as place}
<button 
class="results-item"
on:click={() => handlePlaceClick(place)}
type="button"
>
<div class="results-info">
<h4>{place.name}</h4>
{#if place.rating}
<div class="rating">⭐ {place.rating.toFixed(1)}</div>
{/if}
{#if place.vicinity || place.formatted_address}
<p class="address">{place.vicinity || place.formatted_address}</p>
{/if}
{#if place.distance}
<p class="distance">📍 {formatDistance(place.distance)}</p>
{/if}
</div>
</button>
{/each}
</div>

{#if onLoadMore}
<button 
class="load-more-btn"
on:click={onLoadMore}
disabled={loading}
type="button"
>
{loading ? 'Loading...' : 'Load More Results'}
</button>
{/if}
{/if}
</div>
</div>

<style>
.loading-state {
text-align: center;
padding: 2rem 1rem;
color: var(--card);
}

.spinner {
border: 4px solid rgba(0, 0, 0, 0.1);
border-left-color: var(--primary);
border-radius: 50%;
width: 40px;
height: 40px;
animation: spin 1s linear infinite;
margin: 0 auto 1rem;
}

@keyframes spin {
to { transform: rotate(360deg); }
}

.empty-state {
text-align: center;
padding: 2rem 1rem;
color: var(--card);
}

.results-list {
display: flex;
flex-direction: column;
gap: 0.5rem;
max-height: 60vh;
overflow-y: auto;
}

.results-item {
width: 100%;
background: linear-gradient(135deg, var(--card) 0%, var(--secondary) 100%);
color: var(--text-light);
border: none;
border-radius: var(--button-radius, 12px);
padding: 0.9rem;
cursor: pointer;
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
text-align: left;
}

.results-item:hover {
transform: translateY(-2px);
box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}

.results-item:active {
transform: translateY(0);
}

.results-info h4 {
margin: 0 0 0.25rem 0;
font-size: 1rem;
font-weight: 600;
}

.rating {
font-size: 0.85rem;
margin-bottom: 0.25rem;
}

.address {
font-size: 0.8rem;
opacity: 0.9;
margin: 0.25rem 0;
}

.distance {
font-size: 0.75rem;
opacity: 0.8;
margin: 0.25rem 0 0 0;
}

.load-more-btn {
width: 100%;
margin-top: 1rem;
padding: 0.75rem;
background: var(--primary);
color: var(--text-light);
border: none;
border-radius: var(--button-radius, 12px);
font-weight: 600;
cursor: pointer;
transition: all 0.2s ease;
}

.load-more-btn:hover:not(:disabled) {
transform: translateY(-2px);
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.load-more-btn:disabled {
opacity: 0.6;
cursor: not-allowed;
}
</style>
