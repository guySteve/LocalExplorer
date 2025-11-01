<script>
	import { createEventDispatcher } from 'svelte';
	import { fly } from 'svelte/transition';
	import { categories } from '$lib/stores/appState';
	
	const dispatch = createEventDispatcher();
	
	const categoryEmojis = {
		'Foodie Finds': '🍽️',
		'Iconic Sights': '🏛️',
		'Night Out': '🌙',
		'Hidden Gems': '💎',
		'Pet Friendly': '🐾',
		'Utilities & Help': '🚑',
		'Outdoor': '🏞️',
		'Local Events': '🎭',
		'Breweries': '🍺',
		'Recreation': '⛺'
	};
	
	function handleCategoryClick(categoryName) {
		const categoryItems = categories[categoryName];
		if (categoryItems && categoryItems.length > 0) {
			dispatch('openSubMenu', { 
				title: categoryName, 
				items: categoryItems 
			});
		}
	}
</script>

<div class="filters" id="filterGrid">
	{#each Object.keys(categories) as category, i}
		<button 
			class="filter-btn"
			on:click={() => handleCategoryClick(category)}
			in:fly={{ y: 20, duration: 400, delay: i * 50 }}
		>
			<span class="filter-emoji">{categoryEmojis[category] || '📍'}</span>
			<span class="filter-label">{category}</span>
		</button>
	{/each}
</div>

<style>
	.filters {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
		gap: 0.8rem;
		width: 100%;
		margin: 0;
		contain: layout;
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
	
	.filter-emoji {
		font-size: 1.8rem;
		animation: bounce 2s ease-in-out infinite;
		will-change: transform;
	}
	
	.filter-label {
		font-size: 0.8rem;
	}
	
	@keyframes bounce {
		0%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-3px);
		}
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
		
		.filter-emoji {
			font-size: 1.5rem;
		}
		
		.filter-label {
			font-size: 0.75rem;
		}
	}
</style>
