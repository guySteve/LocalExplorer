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
	.support-cta {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.25rem;
		border-radius: 16px;
		background: linear-gradient(135deg, rgba(255, 87, 34, 0.2), rgba(255, 193, 7, 0.15));
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
		text-align: left;
	}

	.support-cta h3 {
		margin: 0;
		font-size: 1.2rem;
	}

	.support-cta p {
		margin: 0;
		font-size: 0.95rem;
		opacity: 0.85;
	}

	#donateBtn {
		align-self: flex-start;
		padding: 0.65rem 1.5rem;
		border-radius: 999px;
		border: none;
		background: rgba(244, 67, 54, 0.9);
		color: white;
		font-weight: 700;
		cursor: pointer;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	#donateBtn:hover {
		transform: translateY(-1px) scale(1.02);
		box-shadow: 0 8px 18px rgba(244, 67, 54, 0.35);
	}
</style>
