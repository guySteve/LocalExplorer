<script>
	import { createEventDispatcher } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	
	export let title = 'Categories';
	export let items = [];
	export let onSelectItem = () => {};
	
	const dispatch = createEventDispatcher();
	
	function handleSelect(item) {
		onSelectItem(item);
		dispatch('close');
	}
	
	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			dispatch('close');
		}
	}
</script>

<div class="modal active" on:click={handleBackdropClick} transition:fade={{ duration: 200 }} role="dialog" aria-modal="true" tabindex="-1" on:keydown={(e) => e.key === 'Escape' && dispatch('close')}>
	<div class="modal-content" transition:fly={{ y: 50, duration: 300 }} role="document">
		<div class="modal-header">
			<h3>{title}</h3>
			<button class="close-btn" on:click={() => dispatch('close')} type="button">×</button>
		</div>
		<div class="subMenuList">
			{#each items as item}
				<button 
					class="sub-menu-item"
					on:click={() => handleSelect(item)}
					type="button"
				>
					{item.name}
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.subMenuList {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 0.6rem;
		padding: 0.5rem 0;
	}
	
	.sub-menu-item {
		background: linear-gradient(135deg, var(--card) 0%, var(--secondary) 100%);
		color: var(--text-light);
		border: none;
		border-radius: var(--button-radius, 12px);
		padding: 0.9rem 0.7rem;
		font-size: 0.95rem;
		font-weight: 600;
		font-family: var(--font-secondary);
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		position: relative;
		overflow: hidden;
	}
	
	.sub-menu-item::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
		transition: left 0.5s;
	}
	
	.sub-menu-item:hover {
		transform: translateY(-3px) scale(1.02);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
	}
	
	.sub-menu-item:hover::before {
		left: 100%;
	}
	
	.sub-menu-item:active {
		transform: translateY(-1px) scale(0.98);
	}
</style>
