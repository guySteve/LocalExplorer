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
		top: 0.4rem;
		right: 0.4rem;
		background: rgba(244, 67, 54, 0.85);
		border: none;
		cursor: pointer;
		padding: 0.3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		transition: all 0.2s ease;
		z-index: 10;
		opacity: 1;
		border-radius: 50%;
		width: 26px;
		height: 26px;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
	}
	
	.minimize-support-btn:hover {
		transform: scale(1.1);
		background: rgba(244, 67, 54, 1);
		box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
	}
</style>
