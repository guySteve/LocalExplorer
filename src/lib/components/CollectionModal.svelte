<script>
	import { createEventDispatcher } from 'svelte';
	import { savedPlaces, dayPlan } from '$lib/stores/storage';
	
	const dispatch = createEventDispatcher();
	
	// Props
	export let visible = false;
	
	// Tab state
	let activeTab = 'collection'; // 'collection' or 'dayplan'
	
	// Drag and drop state for day plan
	let draggedIndex = null;
	
	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			dispatch('close');
		}
	}
	
	function handleClose() {
		dispatch('close');
	}
	
	function switchTab(tab) {
		activeTab = tab;
	}
	
	function removeFromCollection(placeId) {
		if (confirm('Remove this place from your collection?')) {
			savedPlaces.remove(placeId);
		}
	}
	
	function removeFromDayPlan(placeId) {
		if (confirm('Remove this place from your day plan?')) {
			dayPlan.remove(placeId);
		}
	}
	
	function startTrip() {
		if ($dayPlan.length === 0) {
			alert('Your day plan is empty. Add some places first!');
			return;
		}
		
		// Dispatch event to start compass with the day plan
		dispatch('startTrip', { stops: $dayPlan });
	}
	
	// Drag and drop handlers
	function handleDragStart(e, index) {
		draggedIndex = index;
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/html', e.target.innerHTML);
	}
	
	function handleDragOver(e) {
		if (e.preventDefault) {
			e.preventDefault();
		}
		e.dataTransfer.dropEffect = 'move';
		return false;
	}
	
	function handleDrop(e, dropIndex) {
		if (e.stopPropagation) {
			e.stopPropagation();
		}
		
		if (draggedIndex !== null && draggedIndex !== dropIndex) {
			const items = [...$dayPlan];
			const draggedItem = items[draggedIndex];
			
			// Remove from old position
			items.splice(draggedIndex, 1);
			
			// Insert at new position
			items.splice(dropIndex, 0, draggedItem);
			
			// Update the store
			dayPlan.set(items);
		}
		
		draggedIndex = null;
		return false;
	}
	
	function handleDragEnd() {
		draggedIndex = null;
	}
</script>

{#if visible}
<div id="myCollectionModal" class="modal active" on:click={handleBackdropClick} role="dialog" aria-modal="true" tabindex="-1" on:keydown={(e) => e.key === 'Escape' && handleClose()}>
	<div class="modal-content" role="document">
		<div class="modal-header">
			<h3>My Places</h3>
			<button class="close-btn" on:click={handleClose} type="button">×</button>
		</div>
		
		<!-- Tab Navigation -->
		<div class="tabs">
			<button 
				class="tab-btn" 
				class:active={activeTab === 'collection'}
				on:click={() => switchTab('collection')}
			>
				💾 My Collection
			</button>
			<button 
				class="tab-btn" 
				class:active={activeTab === 'dayplan'}
				on:click={() => switchTab('dayplan')}
			>
				📅 My Day Plan
			</button>
		</div>
		
		<!-- Tab Content -->
		<div id="listView" class="collection-view">
			{#if activeTab === 'collection'}
				<div class="results-list">
					{#if $savedPlaces.length > 0}
						{#each $savedPlaces as place}
							<div class="result-item">
								<div class="place-info">
									<h4>{place.name}</h4>
									<p>{place.formatted_address}</p>
								</div>
								<button 
									class="remove-btn" 
									on:click={() => removeFromCollection(place.place_id)}
									aria-label="Remove from collection"
									title="Remove"
								>
									×
								</button>
							</div>
						{/each}
					{:else}
						<div class="empty-state">Your saved places will appear here.</div>
					{/if}
				</div>
			{:else}
				<div class="results-list day-plan-list">
					{#if $dayPlan.length > 0}
						{#each $dayPlan as place, index (place.place_id)}
							<div 
								class="result-item draggable"
								draggable="true"
								on:dragstart={(e) => handleDragStart(e, index)}
								on:dragover={handleDragOver}
								on:drop={(e) => handleDrop(e, index)}
								on:dragend={handleDragEnd}
							>
								<div class="drag-handle" aria-label="Drag to reorder">☰</div>
								<div class="place-info">
									<div class="stop-number">Stop {index + 1}</div>
									<h4>{place.name}</h4>
									<p>{place.formatted_address}</p>
								</div>
								<button 
									class="remove-btn" 
									on:click={() => removeFromDayPlan(place.place_id)}
									aria-label="Remove from day plan"
									title="Remove"
								>
									×
								</button>
							</div>
						{/each}
						
						<button class="start-trip-btn" on:click={startTrip}>
							<span class="compass-icon" aria-hidden="true"></span> Start This Trip
						</button>
					{:else}
						<div class="empty-state">Add places to your day plan to build your trip.</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
{/if}

<style>
	/* Component-specific styles scoped by default */
	.tabs {
		display: flex;
		gap: 0.5rem;
		padding: 0 1rem;
		border-bottom: 2px solid rgba(var(--card-rgb, 26, 43, 68), 0.1);
		margin-bottom: 1rem;
	}
	
	.tab-btn {
		flex: 1;
		padding: 0.75rem 1rem;
		border: none;
		border-bottom: 3px solid transparent;
		background: transparent;
		color: var(--card);
		font-weight: 600;
		font-size: 0.95rem;
		cursor: pointer;
		transition: all 0.3s ease;
		opacity: 0.6;
	}
	
	.tab-btn:hover {
		opacity: 0.8;
		background: rgba(var(--card-rgb, 26, 43, 68), 0.05);
	}
	
	.tab-btn.active {
		opacity: 1;
		border-bottom-color: var(--primary);
	}
	
	.result-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: rgba(var(--card-rgb, 26, 43, 68), 0.03);
		border-radius: 8px;
		margin-bottom: 0.75rem;
		transition: all 0.2s ease;
	}
	
	.result-item:hover {
		background: rgba(var(--card-rgb, 26, 43, 68), 0.08);
		transform: translateX(4px);
	}
	
	.result-item.draggable {
		cursor: move;
	}
	
	.result-item.draggable:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}
	
	.drag-handle {
		font-size: 1.5rem;
		color: var(--accent);
		cursor: grab;
		user-select: none;
		padding: 0.25rem;
	}
	
	.drag-handle:active {
		cursor: grabbing;
	}
	
	.place-info {
		flex: 1;
	}
	
	.stop-number {
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--primary);
		text-transform: uppercase;
		margin-bottom: 0.25rem;
	}
	
	.place-info h4 {
		margin: 0 0 0.25rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--card);
	}
	
	.place-info p {
		margin: 0;
		font-size: 0.85rem;
		color: var(--card);
		opacity: 0.7;
	}
	
	.remove-btn {
		background: rgba(244, 67, 54, 0.1);
		border: 1px solid rgba(244, 67, 54, 0.3);
		color: #f44336;
		border-radius: 50%;
		width: 32px;
		height: 32px;
		font-size: 1.5rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		padding: 0;
		transition: all 0.2s ease;
	}
	
	.remove-btn:hover {
		background: rgba(244, 67, 54, 0.2);
		border-color: #f44336;
		transform: scale(1.1);
	}
	
	.empty-state {
		text-align: center;
		padding: 3rem 1rem;
		color: var(--card);
		opacity: 0.6;
		font-style: italic;
	}
	
	.start-trip-btn {
		width: 100%;
		padding: 1rem;
		margin-top: 1rem;
		background: var(--primary);
		color: var(--text-light);
		border: none;
		border-radius: var(--button-radius, 12px);
		font-weight: 700;
		font-size: 1.1rem;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		box-shadow: 0 4px 12px rgba(var(--primary-rgb, 200, 121, 65), 0.3);
	}
	
	.start-trip-btn:hover {
		background: var(--secondary);
		transform: translateY(-2px);
		box-shadow: 0 6px 18px rgba(var(--primary-rgb, 200, 121, 65), 0.4);
	}
	
	.start-trip-btn:active {
		transform: translateY(0);
	}
	
	.compass-icon {
		display: inline-block;
		width: 0;
		height: 0;
		border-left: 8px solid transparent;
		border-right: 8px solid transparent;
		border-bottom: 14px solid currentColor;
		position: relative;
		flex-shrink: 0;
	}
	
	.compass-icon::after {
		content: '';
		position: absolute;
		width: 0;
		height: 0;
		border-left: 8px solid transparent;
		border-right: 8px solid transparent;
		border-top: 14px solid currentColor;
		left: -8px;
		top: 4px;
		opacity: 0.5;
	}
</style>
