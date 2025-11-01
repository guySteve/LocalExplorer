<script>
	import { createEventDispatcher } from 'svelte';
	import { savedPlaces } from '$lib/stores/storage';
	
	const dispatch = createEventDispatcher();
	
	function handleClose() {
		dispatch('close');
	}
</script>

<div id="myCollectionModal" class="modal" style="display: block;" role="dialog" aria-modal="true">
	<div class="modal-content" on:click|stopPropagation>
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

<style>
	/* Component-specific styles scoped by default */
</style>
