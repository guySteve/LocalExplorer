<script>
	import { onMount } from 'svelte';
	import { currentPosition, currentAddress, currentTheme } from '$lib/stores/appState';
	import { savedPlaces, plan } from '$lib/stores/storage';
	
	let locationDisplay = 'Determining your location…';
	let showSettings = false;
	let showForecast = false;
	let showMyCollection = false;
	let showCompass = false;
	
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
	
	onMount(() => {
		// Initialize app
		console.log('LocalExplorer SvelteKit initialized');
		
		// Request geolocation
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					currentPosition.set({
						lat: position.coords.latitude,
						lng: position.coords.longitude
					});
					locationDisplay = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
				},
				(error) => {
					console.error('Geolocation error:', error);
					locationDisplay = 'Location access denied';
				}
			);
		} else {
			locationDisplay = 'Geolocation not supported';
		}
	});
	
	function toggleSettings() {
		showSettings = !showSettings;
	}
	
	function toggleMyCollection() {
		showMyCollection = !showMyCollection;
	}
	
	function toggleCompass() {
		showCompass = !showCompass;
	}
</script>

<header id="appHeader">
	<h1 id="appTitle">Local Explorer</h1>
	<button id="settingsBtn" type="button" aria-label="Open settings" on:click={toggleSettings}>⚙️</button>
</header>

<main class="appShell">
	<div id="locationDisplay">{locationDisplay}</div>
	
	<div id="manualInputContainer">
		<input type="text" id="manualInput" placeholder="Enter a location" />
	</div>
	
	<div id="primaryActions">
		<button id="myCollectionBtn" on:click={toggleMyCollection}>📋 My Collection</button>
		<button id="compassBtn" on:click={toggleCompass}>🧭 Compass</button>
	</div>
	
	<div id="unifiedSearchContainer" style="width:100%; margin:0; padding:0;">
		<input type="search" id="unifiedSearchInput" placeholder="🔍 Search all sources (places, events, parks...)" aria-label="Search all sources" />
		<button id="unifiedSearchBtn" type="button" aria-label="Search">Search</button>
	</div>
	
	<div id="weatherWidget" aria-live="polite">
		<div id="weatherHeader">
			<div id="weatherLabels">
				<span id="weatherTitle">Local Weather</span>
				<span id="weatherUpdated">Waiting for location...</span>
			</div>
			<button id="refreshWeatherBtn" type="button" aria-label="Refresh weather">↻</button>
			<button id="forecastBtn" type="button" aria-label="View weekly forecast" title="Weekly forecast" on:click={() => showForecast = !showForecast}>📅</button>
		</div>
		<div id="weatherContent">
			<div id="weatherPrimary">
				<span id="weatherIcon">--</span>
				<span id="weatherTemp">--°</span>
			</div>
			<div id="weatherDetails">
				<div id="weatherDescription">We will pull the forecast once we know where you are.</div>
			</div>
		</div>
	</div>
	
	<div class="filters" id="filterGrid">
		<!-- Filter buttons will be populated here -->
		<p style="text-align: center; color: var(--card); padding: 2rem;">
			🚧 SvelteKit migration in progress - Full UI coming soon!
		</p>
	</div>
	
	<div class="support-cta">
		<h3>Support the App</h3>
		<p>Enjoying these adventures? Help keep Local Explorer sailing.</p>
		<button id="donateBtn" type="button">❤️ Donate</button>
	</div>
</main>

<!-- Settings Panel -->
{#if showSettings}
<div id="settingsPanel" class="modal" style="display: block;">
	<div class="modal-content">
		<div class="modal-header">
			<h3>Settings</h3>
			<button class="close-btn" on:click={toggleSettings}>×</button>
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
{/if}

<!-- My Collection Modal -->
{#if showMyCollection}
<div id="myCollectionModal" class="modal" style="display: block;">
	<div class="modal-content">
		<div class="modal-header">
			<h3>My Collection</h3>
			<button class="close-btn" on:click={toggleMyCollection}>×</button>
		</div>
		<div id="listView" class="collection-view">
			<div class="results-list">
				{#if $savedPlaces.length > 0}
					{#each $savedPlaces as place}
						<div class="result-item">
							<h4>{place.name}</h4>
							<p>{place.formatted_address}</p>
						</div>
					{/each}
				{:else}
					<div class="empty-state">Your saved places will appear here.</div>
				{/if}
			</div>
		</div>
	</div>
</div>
{/if}

<style>
	/* Component-specific styles if needed */
</style>
