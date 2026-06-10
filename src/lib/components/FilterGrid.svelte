<script>
	import { createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';
	import { categories, currentWeatherCondition } from '$lib/stores/appState';
	import { X, GripVertical } from 'lucide-svelte';
	import ThemeIcon from '$lib/components/ThemeIcon.svelte';
	
	const dispatch = createEventDispatcher();
	
	// Track hidden categories and custom ordering
	let hiddenCategories = [];
	let draggedIndex = null;
	let categoryOrder = [];
	let categoryOrderInitialized = false;
	
	// Reactive category ordering based on weather
	$: orderedCategories = reorderCategoriesByWeather(Object.keys(categories).filter(cat => cat !== 'Regional Bird Guide' && !hiddenCategories.includes(cat)), $currentWeatherCondition);
	
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
	{#each displayCategories as category, i (category)}
		<div 
			class="filter-wrapper"
			on:dragover={handleDragOver}
			on:drop={(e) => handleDrop(e, i)}
			role="button"
			tabindex="0"
			transition:fly={{ y: 20, duration: 400, delay: i * 50 }}
		>
			<div 
				class="drag-handle" 
				draggable="true"
				on:dragstart={(e) => handleDragStart(e, i)}
				on:dragend={handleDragEnd}
				title="Drag to reorder"
				role="button"
				tabindex="0"
				aria-label="Drag to reorder {category}"
			>
				<GripVertical size={16} color="currentColor" />
			</div>
			<button 
				class="filter-close-btn" 
				on:click={(e) => hideCategory(category, e)} 
				title="Hide this category"
				aria-label="Hide {category} category"
			>
				<X size={12} color="currentColor" />
			</button>
			<button 
				class="filter-btn"
				on:click={() => handleCategoryClick(category)}
			>
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
		display: flex;
		flex-wrap: nowrap;
		overflow-x: auto;
		overflow-y: hidden;
		gap: 0.5rem;
		width: 100%;
		padding-bottom: 0.5rem; /* For scrollbar */
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none; /* Firefox */
	}

	.filters::-webkit-scrollbar {
		display: none; /* Safari and Chrome */
	}
	
	.filter-wrapper {
		position: relative;
		flex: 0 0 auto;
	}
	
	.filter-btn {
		background: rgba(42, 40, 37, 0.05);
		color: var(--text-dark);
		border: 1px solid rgba(42, 40, 37, 0.1);
		border-radius: 20px; /* Pill shape */
		padding: 0.5rem 1rem;
		font-size: 0.85rem;
		font-weight: 600;
		font-family: var(--font-secondary);
		text-transform: capitalize;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		white-space: nowrap;
	}
	
	.filter-btn:hover {
		background: rgba(212, 93, 59, 0.1);
		border-color: var(--primary);
		transform: translateY(-1px);
	}
	
	.filter-btn:active {
		transform: translateY(0);
	}
	
	.drag-handle {
		display: none; /* Hide drag handles in pill row mode */
	}
	
	.filter-wrapper:hover .drag-handle {
		opacity: 1;
		transform: translateX(-50%) scale(1.1);
	}
	
	.drag-handle:active {
		cursor: grabbing;
		opacity: 1;
	}
	
	.filter-close-btn {
		display: none; /* Too cluttered on small pills, let users filter in settings instead if needed */
	}
	
	.filter-icon {
		display: flex;
		align-items: center;
	}
	
	.filter-btn:hover .filter-icon {
		color: var(--primary);
	}
	
	.filter-label {
		font-size: 0.85rem;
	}
	
	@media (max-width: 600px) {
		.filter-btn {
			padding: 0.4rem 0.8rem;
		}
		
		.filter-label {
			font-size: 0.8rem;
		}
	}
</style>
