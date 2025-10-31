<script>
	import { createEventDispatcher } from 'svelte';
	import { currentTheme } from '$lib/stores/appState';
	
	const dispatch = createEventDispatcher();
	
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
	
	function handleClose() {
		dispatch('close');
	}
</script>

<div id="settingsPanel" class="modal" style="display: block;">
	<div class="modal-content">
		<div class="modal-header">
			<h3>Settings</h3>
			<button class="close-btn" on:click={handleClose}>×</button>
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
	/* Component-specific styles scoped by default */
</style>
