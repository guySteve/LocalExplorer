<script>
import { createEventDispatcher } from 'svelte';
import { fade, fly } from 'svelte/transition';
import { currentTheme } from '$lib/stores/appState';

export let visible = false;

const dispatch = createEventDispatcher();

function handleBackdropClick(e) {
if (e.target === e.currentTarget) {
dispatch('close');
}
}

// Theme selection
const themes = [
{ value: 'naval', label: 'Polished Sailor' },
{ value: 'sunset', label: 'Sunset Cruise' },
{ value: 'neon', label: 'Neon City Lights' },
{ value: 'arctic', label: 'Arctic Dawn' },
{ value: 'highseas', label: 'High Seas Neon' },
{ value: 'aurora', label: 'Aurora Mist' },
{ value: 'arcane', label: 'Arcane Nightfall' },
{ value: 'solstice', label: 'Solstice Glow' },
{ value: 'evergreen', label: 'Evergreen Trails' },
{ value: 'voyager', label: 'Celestial Voyager' },
{ value: 'monochrome', label: 'Monochrome Focus' },
{ value: 'playful', label: 'Playful Pop' },
{ value: 'retro90', label: 'Retro Arcade 90s' },
{ value: 'groove70', label: 'Sunburst 70s' },
{ value: 'mojave', label: 'Mojave Drift' },
{ value: 'atomic50', label: 'Atomic Age 50s' },
{ value: 'psychedelic60', label: 'Psychedelic 60s' },
{ value: 'arcade80', label: 'Arcade 80s' },
{ value: 'y2k00', label: 'Y2K 2000s' },
{ value: 'metro10', label: 'Metro 2010s' },
{ value: 'sushi', label: 'Sushi Bar' },
{ value: 'bbq', label: 'BBQ Pit' },
{ value: 'cafe', label: 'Coffee Café' }
];
</script>

<div id="settingsPanel" class="modal" class:active={visible} on:click={handleBackdropClick} transition:fade={{ duration: 200 }} role="dialog" aria-modal="true" tabindex="-1" on:keydown={(e) => e.key === 'Escape' && dispatch('close')}>
<div class="modal-content" transition:fly={{ y: 50, duration: 300 }} role="document">
<div class="modal-header">
<h3>Settings</h3>
<button class="close-btn" on:click={() => dispatch('close')} type="button">×</button>
</div>
<div class="setting-group">
<label for="themeSelect">Theme</label>
<select id="themeSelect" bind:value={$currentTheme}>
{#each themes as theme}
<option value={theme.value}>{theme.label}</option>
{/each}
</select>
<span class="setting-hint">Pick a style and we will remember it for next time.</span>
</div>
</div>
</div>

<style>
.setting-group {
display: flex;
flex-direction: column;
gap: 0.75rem;
margin-bottom: 1.5rem;
}

.setting-group label {
color: var(--card);
font-weight: 600;
font-size: 1rem;
}

.setting-group select {
background: var(--card);
color: var(--text-light);
border: 2px solid var(--accent);
border-radius: var(--button-radius, 12px);
padding: 0.75rem 1rem;
font-size: 1rem;
cursor: pointer;
transition: all 0.2s ease;
}

.setting-group select:hover {
border-color: var(--primary);
background: var(--secondary);
}

.setting-group select:focus {
outline: none;
border-color: var(--primary);
box-shadow: 0 0 0 3px rgba(200, 121, 65, 0.2);
}

.setting-hint {
color: var(--card);
opacity: 0.7;
font-size: 0.875rem;
font-style: italic;
}
</style>
