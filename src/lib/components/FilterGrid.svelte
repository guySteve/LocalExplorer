<script>
	import { createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';
	import { categories, currentWeatherCondition } from '$lib/stores/appState';
	import { widgetState } from '$lib/stores/widgetState';
	import { X, GripVertical } from 'lucide-svelte';
	import ThemeIcon from '$lib/components/ThemeIcon.svelte';
	
	const dispatch = createEventDispatcher();
	
	// Track hidden categories and custom ordering
	let hiddenCategories = [];
	let draggedIndex = null;
	let categoryOrder = [];
	let categoryOrderInitialized = false;
	
	// Reactive category ordering based on weather
	$: orderedCategories = reorderCategoriesByWeather(Object.keys(categories).filter(cat => cat !== 'Bird Watching' && !hiddenCategories.includes(cat)), $currentWeatherCondition);
	
	// Initialize category order on first load only
	$: if (!categoryOrderInitialized && orderedCategories.length > 0) {
		categoryOrder = [...orderedCategories];
		categoryOrderInitialized = true;
	}
	
	// Use custom order if available, otherwise use weather-based order
	$: displayCategories = categoryOrder.length > 0 ? categoryOrder.filter(cat => !hiddenCategories.includes(cat)) : orderedCategories;
	
	function reorderCategoriesByWeather(categoryList, weatherCondition) {
		const list = [...categoryList];
		
		// Define weather-based priority
		if (weatherCondition === 'rain' || weatherCondition === 'snow') {
			// Move outdoor categories to the end
			const outdoorCategories = ['Outdoor', 'Recreation'];
			const outdoor = list.filter(cat => outdoorCategories.includes(cat));
			const rest = list.filter(cat => !outdoorCategories.includes(cat));
			return [...rest, ...outdoor];
		} else if (weatherCondition === 'sunny') {
			// Move outdoor categories to the beginning
			const outdoorCategories = ['Outdoor', 'Recreation'];
			const outdoor = list.filter(cat => outdoorCategories.includes(cat));
			const rest = list.filter(cat => !outdoorCategories.includes(cat));
			return [...outdoor, ...rest];
		}
		
		// Default order
		return list;
	}
	
	function handleCategoryClick(categoryName) {
		const categoryItems = categories[categoryName];
		if (categoryItems && categoryItems.length > 0) {
			dispatch('openSubMenu', { 
				title: categoryName, 
				items: categoryItems 
			});
		}
	}
	
	function hideCategory(categoryName, event) {
		event.stopPropagation();
		hiddenCategories = [...hiddenCategories, categoryName];
	}
	
	// Drag and drop handlers
	function handleDragStart(e, index) {
		draggedIndex = index;
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', index.toString());
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
		
		// Validate indices before proceeding
		if (draggedIndex !== null && 
		    draggedIndex !== dropIndex &&
		    draggedIndex >= 0 && 
		    dropIndex >= 0 &&
		    draggedIndex < displayCategories.length && 
		    dropIndex < displayCategories.length) {
			const newOrder = [...displayCategories];
			const draggedItem = newOrder[draggedIndex];
			
			// Remove from old position
			newOrder.splice(draggedIndex, 1);
			
			// Insert at new position
			newOrder.splice(dropIndex, 0, draggedItem);
			
			// Update the order
			categoryOrder = newOrder;
		}
		
		draggedIndex = null;
		return false;
	}
	
	function handleDragEnd() {
		draggedIndex = null;
	}
</script>

<div class="filters" id="filterGrid">
	<button 
		class="minimize-filter-btn" 
		on:click={() => widgetState.hide('filterGrid')} 
		title="Hide all category filters"
		aria-label="Hide all category filters"
	>
		<X size={16} color="currentColor" />
	</button>
	{#each displayCategories as category, i (category)}
		<div 
			class="filter-wrapper"
			draggable="true"
			on:dragstart={(e) => handleDragStart(e, i)}
			on:dragover={handleDragOver}
			on:drop={(e) => handleDrop(e, i)}
			on:dragend={handleDragEnd}
			role="button"
			tabindex="0"
			transition:fly={{ y: 20, duration: 400, delay: i * 50 }}
		>
			<button 
				class="filter-btn"
				on:click={() => handleCategoryClick(category)}
			>
				<div class="drag-handle" title="Drag to reorder">
					<GripVertical size={14} color="currentColor" />
				</div>
				<button 
					class="filter-close-btn" 
					on:click={(e) => hideCategory(category, e)} 
					title="Hide this category"
					aria-label="Hide {category} category"
				>
					<X size={12} color="currentColor" />
				</button>
				<div class="filter-icon">
					<ThemeIcon iconName={category} />
				</div>
				<span class="filter-label">{category}</span>
			</button>
		</div>
	{/each}
</div>

<style>
	.filters {
		position: relative;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
		gap: 0.8rem;
		width: 100%;
		margin: 0;
	}
	
	.minimize-filter-btn {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: var(--card);
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-light);
		transition: all 0.2s ease;
		z-index: 20;
		opacity: 0.9;
		border-radius: 50%;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
	}
	
	.minimize-filter-btn:hover {
		transform: scale(1.1);
		color: rgba(244, 67, 54, 0.9);
		opacity: 1;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}
	
	.filter-wrapper {
		position: relative;
		cursor: move;
	}
	
	.filter-btn {
		background: linear-gradient(135deg, var(--card) 0%, var(--secondary) 100%);
		color: var(--text-light);
		border: none;
		border-radius: var(--button-radius, 12px);
		padding: 1.1rem 0.8rem;
		font-size: 0.95rem;
		font-weight: 700;
		font-family: var(--font-primary);
		text-transform: uppercase;
		letter-spacing: 0.05rem;
		cursor: pointer;
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
		position: relative;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		width: 100%;
	}
	
	.filter-btn::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
		transition: left 0.6s;
	}
	
	.filter-btn:hover {
		transform: translateY(-5px) scale(1.03);
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
	}
	
	.filter-btn:hover::before {
		left: 100%;
	}
	
	.filter-btn:active {
		transform: translateY(-2px) scale(0.98);
	}
	
	.drag-handle {
		position: absolute;
		top: 0.25rem;
		left: 0.25rem;
		opacity: 0.4;
		cursor: grab;
		z-index: 5;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.2rem;
		transition: opacity 0.2s;
	}
	
	.filter-wrapper:hover .drag-handle {
		opacity: 0.8;
	}
	
	.drag-handle:active {
		cursor: grabbing;
	}
	
	.filter-close-btn {
		position: absolute;
		top: 0.25rem;
		right: 0.25rem;
		background: rgba(244, 67, 54, 0.2);
		border: none;
		border-radius: 50%;
		cursor: pointer;
		padding: 0.3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: rgba(244, 67, 54, 0.9);
		transition: all 0.2s ease;
		z-index: 5;
		opacity: 0.6;
		width: 24px;
		height: 24px;
	}
	
	.filter-close-btn:hover {
		opacity: 1;
		background: rgba(244, 67, 54, 0.4);
		transform: scale(1.1);
	}
	
	.filter-icon {
		/* Removed bouncing animation for better UX */
		transition: transform 0.2s ease;
	}
	
	.filter-btn:hover .filter-icon {
		transform: scale(1.1);
	}
	
	.filter-label {
		font-size: 0.8rem;
	}
	
	/* Responsive adjustments */
	@media (max-width: 600px) {
		.filters {
			grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
			gap: 0.6rem;
		}
		
		.filter-btn {
			padding: 0.9rem 0.6rem;
		}
		
		.filter-label {
			font-size: 0.75rem;
		}
	}
</style>
