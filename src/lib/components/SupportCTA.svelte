<script>
	import { createEventDispatcher } from 'svelte';
	
	const dispatch = createEventDispatcher();
</script>

<div class="support-cta">
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
	/* Component-specific styles scoped by default */
</style>
