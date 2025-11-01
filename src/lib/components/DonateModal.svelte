<script>
	import { createEventDispatcher } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	
	const dispatch = createEventDispatcher();
	
	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			dispatch('close');
		}
	}
	
	function openVenmo() {
		window.open('venmo://paycharge?txn=pay&recipients=Stephen-Mohamed-1', '_blank');
	}
	
	function copyVenmoHandle() {
		navigator.clipboard.writeText('@Stephen-Mohamed-1');
		alert('Venmo handle copied to clipboard!');
	}
</script>

<div class="modal active" on:click={handleBackdropClick} transition:fade={{ duration: 200 }} role="dialog" aria-modal="true">
	<div class="modal-content" transition:fly={{ y: 50, duration: 300 }} on:click|stopPropagation>
		<div class="modal-header">
			<h3>Support Local Explorer</h3>
			<button class="close-btn" on:click={() => dispatch('close')} type="button">×</button>
		</div>
		
		<div class="donate-content">
			<p class="donate-text">
				If you enjoy using Local Explorer, consider supporting development. 
				Donations help keep this sailor's app afloat!
			</p>
			
			<p class="venmo-handle">
				Venmo: <strong>@Stephen-Mohamed-1</strong>
			</p>
			
			<div class="donate-actions">
				<button class="donate-btn primary" on:click={openVenmo} type="button">
					Open Venmo
				</button>
				<button class="donate-btn secondary" on:click={copyVenmoHandle} type="button">
					Copy Handle
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.donate-content {
		padding: 0.5rem 0;
	}
	
	.donate-text {
		color: var(--card);
		font-size: 0.95rem;
		margin-bottom: 1.2rem;
		line-height: 1.6;
	}
	
	.venmo-handle {
		color: var(--card);
		font-size: 1rem;
		margin-bottom: 1.5rem;
		text-align: center;
		padding: 1rem;
		background: rgba(200, 121, 65, 0.1);
		border-radius: var(--button-radius, 12px);
	}
	
	.venmo-handle strong {
		color: var(--primary);
		font-size: 1.1rem;
	}
	
	.donate-actions {
		display: flex;
		gap: 0.75rem;
	}
	
	.donate-btn {
		flex: 1;
		border: none;
		border-radius: var(--button-radius, 12px);
		padding: 0.9rem;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}
	
	.donate-btn.primary {
		background-color: var(--primary);
		color: var(--text-light);
	}
	
	.donate-btn.secondary {
		background-color: var(--secondary);
		color: var(--text-light);
	}
	
	.donate-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
	}
	
	.donate-btn:active {
		transform: translateY(0);
	}
</style>
