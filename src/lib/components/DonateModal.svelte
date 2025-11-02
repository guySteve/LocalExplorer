<script>
import { createEventDispatcher } from 'svelte';
import { fade, fly } from 'svelte/transition';

export let visible = false;

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

<div class="modal" class:active={visible} on:click={handleBackdropClick} transition:fade={{ duration: 200 }} role="dialog" aria-modal="true" tabindex="-1" on:keydown={(e) => e.key === 'Escape' && dispatch('close')}>
<div class="modal-content" transition:fly={{ y: 50, duration: 300 }} role="document">
<div class="modal-header">
<h3>Support Local Explorer</h3>
<button class="close-btn" on:click={() => dispatch('close')} type="button">×</button>
</div>

<div class="donate-content">
<p class="donate-text">
If you enjoy using Local Explorer, consider supporting development. 
Donations help keep this sailor's app afloat!
</p>

<div class="donate-options">
<button class="donate-btn primary" on:click={openVenmo} type="button">
💳 Open Venmo
</button>
<button class="donate-btn secondary" on:click={copyVenmoHandle} type="button">
📋 Copy Handle
</button>
</div>

<p class="venmo-handle">@Stephen-Mohamed-1</p>
</div>
</div>
</div>

<style>
.donate-content {
display: flex;
flex-direction: column;
gap: 1rem;
}

.donate-text {
color: var(--card);
font-size: 1rem;
line-height: 1.5;
margin: 0;
}

.donate-options {
display: flex;
flex-direction: column;
gap: 0.75rem;
}

.donate-btn {
width: 100%;
padding: 1rem;
border: none;
border-radius: var(--button-radius, 12px);
font-size: 1rem;
font-weight: 600;
cursor: pointer;
transition: all 0.2s ease;
display: flex;
align-items: center;
justify-content: center;
gap: 0.5rem;
}

.donate-btn.primary {
background: linear-gradient(135deg, var(--primary), var(--accent));
color: var(--text-light);
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.donate-btn.primary:hover {
transform: translateY(-2px);
box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
}

.donate-btn.secondary {
background: var(--card);
color: var(--text-light);
border: 2px solid var(--accent);
}

.donate-btn.secondary:hover {
transform: translateY(-2px);
background: var(--secondary);
}

.donate-btn:active {
transform: translateY(0);
}

.venmo-handle {
text-align: center;
font-size: 1.1rem;
font-weight: 600;
color: var(--primary);
margin: 0.5rem 0 0 0;
}
</style>
