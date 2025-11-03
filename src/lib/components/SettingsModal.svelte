<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { currentTheme, selectedVoiceUri, showBirdSightings, sassyWeatherMode, voiceNavigationEnabled } from '$lib/stores/appState';
	import { browser } from '$app/environment';
	
	const dispatch = createEventDispatcher();
	
	// Props
	export let visible = false;
	
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

	let availableVoices = [];
	let selectedVoice = '';
	let voicesChangedHandler = null;

	onMount(() => {
		if (browser) {
			loadVoices();
		}

		const unsubscribeVoice = selectedVoiceUri.subscribe(uri => {
			selectedVoice = uri;
		});

		return () => {
			if (browser && window.speechSynthesis && voicesChangedHandler) {
				window.speechSynthesis.removeEventListener('voiceschanged', voicesChangedHandler);
			}
			unsubscribeVoice();
		};
	});

	function loadVoices() {
		if (!browser || !window.speechSynthesis) return;

		const getVoices = () => {
			availableVoices = window.speechSynthesis.getVoices();
		};

		getVoices();
		
		if (window.speechSynthesis.onvoiceschanged !== undefined) {
			voicesChangedHandler = getVoices;
			window.speechSynthesis.addEventListener('voiceschanged', voicesChangedHandler);
		}
	}

	function handleBirdToggle() {
		const next = !$showBirdSightings;
		showBirdSightings.set(next);
		dispatch('settingsChanged', { showBirds: next });
	}

	function handleSassyToggle() {
		const next = !$sassyWeatherMode;
		sassyWeatherMode.set(next);
		dispatch('settingsChanged', { sassyWeather: next });
	}

	function handleVoiceToggle() {
		const next = !$voiceNavigationEnabled;
		voiceNavigationEnabled.set(next);
		dispatch('settingsChanged', { voiceEnabled: next });
	}

	function handleVoiceChange() {
		selectedVoiceUri.set(selectedVoice);
	}
	
function handleClose() {
	dispatch('close');
}
</script>

{#if visible}
<div id="settingsPanel" class="modal active" on:click={handleBackdropClick} role="dialog" aria-modal="true" tabindex="-1" on:keydown={(e) => e.key === 'Escape' && handleClose()}>
	<div class="modal-content" role="document">
		<div class="modal-header">
			<h3>Settings</h3>
			<button class="close-btn" on:click={handleClose} type="button">×</button>
		</div>		<div class="setting-group">
			<label for="themeSelect">Theme</label>
			<select id="themeSelect" bind:value={$currentTheme}>
				{#each themes as theme}
					<option value={theme.value}>{theme.label}</option>
				{/each}
			</select>
			<span class="setting-hint">Pick a style and we will remember it for next time.</span>
		</div>

		<div class="setting-group">
			<div class="setting-toggle">
				<label for="birdToggle">
					<span class="setting-label">Show Bird Sightings</span>
					<span class="setting-description">Display recent bird sightings in weather widget</span>
				</label>
				<button 
					id="birdToggle"
					class="toggle-btn {$showBirdSightings ? 'active' : ''}" 
					on:click={handleBirdToggle}
					aria-label="Toggle bird sightings"
					type="button"
				>
					<span class="toggle-slider"></span>
				</button>
			</div>
		</div>

		<div class="setting-group">
			<div class="setting-toggle">
				<label for="sassyToggle">
					<span class="setting-label">Sassy Weather Mode 😎</span>
					<span class="setting-description">Get entertaining and sassy weather commentary</span>
				</label>
				<button 
					id="sassyToggle"
					class="toggle-btn {$sassyWeatherMode ? 'active' : ''}" 
					on:click={handleSassyToggle}
					aria-label="Toggle sassy weather mode"
					type="button"
				>
					<span class="toggle-slider"></span>
				</button>
			</div>
		</div>

		<div class="setting-group">
			<div class="setting-toggle">
				<label for="voiceToggle">
					<span class="setting-label">Voice Navigation</span>
					<span class="setting-description">Enable voice guidance for compass navigation</span>
				</label>
				<button 
					id="voiceToggle"
					class="toggle-btn {$voiceNavigationEnabled ? 'active' : ''}" 
					on:click={handleVoiceToggle}
					aria-label="Toggle voice navigation"
					type="button"
				>
					<span class="toggle-slider"></span>
				</button>
			</div>
		</div>

		{#if $voiceNavigationEnabled && availableVoices.length > 0}
			<div class="setting-group">
				<label for="voiceSelect">Voice Selection</label>
				<select id="voiceSelect" bind:value={selectedVoice} on:change={handleVoiceChange}>
					<option value="">Default Voice</option>
					{#each availableVoices as voice}
						<option value={voice.voiceURI}>
							{voice.name} ({voice.lang})
						</option>
					{/each}
				</select>
				<span class="setting-hint">Choose a voice for turn-by-turn navigation.</span>
			</div>
		{/if}
	</div>
</div>
{/if}

<style>
	/* Component-specific styles scoped by default */
	.setting-group {
		margin-bottom: 1.5rem;
	}

	.setting-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	.setting-hint {
		display: block;
		font-size: 0.85rem;
		margin-top: 0.5rem;
		opacity: 0.7;
	}

	.setting-toggle {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
	}

	.setting-toggle label {
		display: flex;
		flex-direction: column;
		margin-bottom: 0;
	}

	.setting-label {
		font-weight: 600;
		font-size: 1rem;
		margin-bottom: 0.25rem;
	}

	.setting-description {
		font-size: 0.85rem;
		opacity: 0.7;
		font-weight: normal;
	}

	.toggle-btn {
		position: relative;
		width: 48px;
		height: 24px;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		padding: 0;
		flex-shrink: 0;
	}

	.toggle-btn:hover {
		background: rgba(0, 0, 0, 0.4);
		box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
	}

	.toggle-btn.active {
		background: var(--primary);
		border-color: var(--primary);
	}

	.toggle-btn.active:hover {
		filter: brightness(1.1);
	}

	.toggle-slider {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 18px;
		height: 18px;
		background: white;
		border-radius: 50%;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
		pointer-events: none;
	}

	.toggle-btn.active .toggle-slider {
		transform: translateX(24px);
	}

	select {
		width: 100%;
		padding: 0.75rem;
		border-radius: 8px;
		border: 2px solid rgba(255, 255, 255, 0.2);
		background: rgba(255, 255, 255, 0.05);
		color: inherit;
		font-size: 1rem;
		cursor: pointer;
	}

	select:focus {
		outline: none;
		border-color: var(--primary);
	}
</style>
