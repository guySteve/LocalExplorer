<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { currentTheme, selectedVoiceUri, showBirdSightings, voiceNavigationEnabled, fontSize } from '$lib/stores/appState';
	import { browser } from '$app/environment';
	import { WifiOff } from 'lucide-svelte';
	import OfflineManager from '$lib/components/OfflineManager.svelte';
	import SupportCTA from '$lib/components/SupportCTA.svelte';
	
	const dispatch = createEventDispatcher();
	
	// Props
	export let visible = false;
	
	// Offline manager visibility
	let showOfflineManager = false;
	
	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			dispatch('close');
		}
	}
	
	// Theme selection
	const themes = [
		{ value: 'default-light', label: 'Default Light' },
		{ value: 'default-dark', label: 'Default Dark' },
		{ value: 'high-contrast', label: 'High-Contrast (Sunlight)' },
		{ value: 'night-vision', label: 'Night Vision' },
		{ value: 'naval', label: 'Naval' },
		{ value: 'army-temperate', label: 'Army (Temperate)' },
		{ value: 'army-arid', label: 'Army (Arid)' },
		{ value: 'air-force', label: 'Air Force' },
		{ value: 'arcade', label: 'Arcade' },
		{ value: 'monochrome', label: 'Monochrome' },
		{ value: 'retro90', label: 'Retro90' }
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

<svelte:window on:keydown={(e) => visible && e.key === 'Escape' && handleClose()} />

{#if visible}
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div id="settingsPanel" class="modal active" on:click={handleBackdropClick} role="dialog" aria-modal="true" tabindex="-1">
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

		<div class="setting-group">
			<label for="fontSizeSelect">Font Size</label>
			<select id="fontSizeSelect" bind:value={$fontSize}>
				<option value="small">Small</option>
				<option value="medium">Medium</option>
				<option value="large">Large</option>
			</select>
			<span class="setting-hint">Adjust text size for better readability.</span>
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
		
		<div class="setting-group support-section">
			<h3>Support LocalExplorer</h3>
			<p class="support-description">Focus groups wanted the donation tools in one obvious place.</p>
			<SupportCTA on:openDonate={() => dispatch('openDonate')} />
		</div>
		
		<!-- Offline Manager Section -->
		<div class="setting-group offline-manager-section">
			<h3>Offline Mode</h3>
			<p class="setting-hint">Manage offline maps and data</p>
			<button 
				class="offline-manager-btn"
				on:click={() => showOfflineManager = true}
				type="button"
			>
				<WifiOff size={20} />
				<span>Offline Manager</span>
			</button>
		</div>
	</div>
</div>
{/if}

<!-- Offline Manager Modal -->
<OfflineManager 
	visible={showOfflineManager}
	on:close={() => showOfflineManager = false}
/>

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
		width: 50px;
		height: 28px;
		background: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 14px;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		padding: 0;
		flex-shrink: 0;
	}

	.toggle-btn:hover {
		background: rgba(0, 0, 0, 0.3);
		box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
	}

	.toggle-btn.active {
		background: var(--primary);
		border-color: var(--primary);
		box-shadow: 0 0 12px rgba(var(--primary-rgb, 200, 121, 65), 0.4);
	}

	.toggle-btn.active:hover {
		filter: brightness(1.1);
		box-shadow: 0 0 16px rgba(var(--primary-rgb, 200, 121, 65), 0.5);
	}

	.toggle-slider {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 20px;
		height: 20px;
		background: white;
		border-radius: 50%;
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		pointer-events: none;
	}

	.toggle-btn.active .toggle-slider {
		transform: translateX(22px);
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

	/* Offline Manager Section */
	.offline-manager-section {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.15);
	}
	
	.offline-manager-btn {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 1rem;
		background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
		border: none;
		border-radius: 8px;
		color: var(--text-light);
		cursor: pointer;
		font-size: 1rem;
		font-weight: 700;
		transition: all 0.3s ease;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}
	
	.support-section {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.15);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.support-section h3 {
		margin: 0;
		font-size: 1.1rem;
	}

	.support-description {
		font-size: 0.9rem;
		opacity: 0.75;
		margin: 0;
	}

	.offline-manager-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
	}
</style>
