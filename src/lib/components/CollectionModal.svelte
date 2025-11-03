<script>
	import { createEventDispatcher } from 'svelte';
	import { savedPlaces } from '$lib/stores/storage';
	
	const dispatch = createEventDispatcher();
	
	// Props
	export let visible = false;
	
	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			dispatch('close');
		}
	}
	
	function handleClose() {
		dispatch('close');
	}
</script>

{#if visible}
<div id="myCollectionModal" class="modal active" on:click={handleBackdropClick} role="dialog" aria-modal="true" tabindex="-1" on:keydown={(e) => e.key === 'Escape' && handleClose()}>
	<div class="modal-content" role="document">
		<div class="modal-header">
			<h3>My Collection</h3>
			<button class="close-btn" on:click={handleClose} type="button">×</button>
		</div>
		<div id="listView" class="collection-view">
			<div class="results-list">
				{#if $savedPlaces.length > 0}
					{#each $savedPlaces as place}
						<div class="result-item">
							<h4>{place.name}</h4>
							<p>{place.formatted_address}</p>
						</div>
					{/each}
				{:else}
					<div class="empty-state">Your saved places will appear here.</div>
				{/if}
			</div>
		</div>
	</div>
</div>
{/if}

<style>
	/* Component-specific styles scoped by default */
</style>
