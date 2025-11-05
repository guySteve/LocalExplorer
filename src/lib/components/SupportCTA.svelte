<script>
	import { createEventDispatcher } from 'svelte';
	import { X } from 'lucide-svelte';
	import { widgetState } from '$lib/stores/widgetState';
	
	const dispatch = createEventDispatcher();
</script>

<div class="support-cta">
	<button 
		class="minimize-support-btn" 
		on:click={() => widgetState.hide('supportCTA')} 
		title="Hide support section"
		aria-label="Hide support section"
	>
		<X size={12} color="currentColor" />
	</button>
	<h3>Support the App</h3>
	<p>Enjoying these adventures? Help keep Local Explorer sailing.</p>
	<button 
		id="donateBtn" 
		type="button"
		on:click={() => dispatch('openDonate')}
	>
		❤️ Donate
	</button>
</div>

<style>
	.support-cta {
		position: relative;
	}
	
	.minimize-support-btn {
		position: absolute;
		bottom: 0.25rem;
		right: 0.25rem;
		background: rgba(0, 0, 0, 0.6);
		border: none;
		cursor: pointer;
		padding: 0.3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-light);
		transition: all 0.2s ease;
		z-index: 10;
		opacity: 0.5;
		border-radius: 4px;
	}
	
	.minimize-support-btn:hover {
		transform: scale(1.05);
		color: rgba(244, 67, 54, 0.9);
		opacity: 0.9;
	}
</style>
