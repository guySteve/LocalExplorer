<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { currentPosition, cachedWeather, lastWeatherFetch, WEATHER_CACHE_MS } from '$lib/stores/appState';
	import { fetchWeatherData, weatherCodeToSummary, fetchRecentBirdSightings } from '$lib/utils/api-extended';
	
	const dispatch = createEventDispatcher();
	
	let weatherData = null;
	let loading = false;
	let lastUpdated = '';
	let expanded = false;
	let birdFact = '';
	
	onMount(() => {
		// Auto-fetch weather when position is available
		const unsubscribe = currentPosition.subscribe(pos => {
			if (pos && !weatherData) {
				loadWeather();
			}
		});
		
		return unsubscribe;
	});
	
	async function loadWeather() {
		const pos = $currentPosition;
		if (!pos) {
			return;
		}
		
		// Check cache
		const now = Date.now();
		if ($cachedWeather && (now - $lastWeatherFetch < WEATHER_CACHE_MS)) {
			weatherData = $cachedWeather;
			updateLastUpdated();
			return;
		}
		
		loading = true;
		try {
			const data = await fetchWeatherData(pos.lat, pos.lng);
			if (data) {
				weatherData = data;
				cachedWeather.set(data);
				lastWeatherFetch.set(Date.now());
				updateLastUpdated();
				
				// Also fetch bird facts
				loadBirdFact();
			}
		} catch (error) {
			console.error('Weather fetch failed:', error);
		} finally {
			loading = false;
		}
	}
	
	async function loadBirdFact() {
		const pos = $currentPosition;
		if (!pos) return;
		
		try {
			const fact = await fetchRecentBirdSightings(pos.lat, pos.lng);
			if (fact && fact !== 'configure-key') {
				birdFact = fact;
			} else if (fact === 'configure-key') {
				birdFact = '🐦 Bird sightings unavailable. Add EBIRD_API_KEY to enable.';
			}
		} catch (err) {
			console.error('Bird fact failed:', err);
		}
	}
	
	async function handleRefresh() {
		// Clear cache and force refresh
		lastWeatherFetch.set(0);
		await loadWeather();
	}
	
	async function handleOpenForecast() {
		if (weatherData && weatherData.daily) {
			dispatch('openForecast', weatherData.daily);
		} else {
			alert('Forecast not available');
		}
	}
	
	function updateLastUpdated() {
		const now = new Date();
		lastUpdated = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
	
	function toggleDetails() {
		expanded = !expanded;
	}
	
	// Computed values
	let weatherIcon = $derived(
		weatherData ? weatherCodeToSummary(weatherData.current_weather.weathercode).icon : '🌤️'
	);
	
	let weatherDescription = $derived(
		weatherData ? weatherCodeToSummary(weatherData.current_weather.weathercode).text : 'Loading...'
	);
	
	let tempF = $derived(
		weatherData ? Math.round(weatherData.current_weather.temperature * 9/5 + 32) : null
	);
	
	let feelsF = $derived(() => {
		if (!weatherData || !weatherData.hourly) return tempF;
		
		const hourlyData = weatherData.hourly;
		if (Array.isArray(hourlyData.time) && Array.isArray(hourlyData.apparent_temperature)) {
			const index = hourlyData.time.indexOf(weatherData.current_weather.time);
			if (index >= 0 && index < hourlyData.apparent_temperature.length) {
				return Math.round(hourlyData.apparent_temperature[index] * 9/5 + 32);
			}
		}
		return tempF;
	});
	
	let highF = $derived(
		weatherData && weatherData.daily ? 
		Math.round(weatherData.daily.temperature_2m_max[0] * 9/5 + 32) : null
	);
	
	let lowF = $derived(
		weatherData && weatherData.daily ? 
		Math.round(weatherData.daily.temperature_2m_min[0] * 9/5 + 32) : null
	);
	
	let windMph = $derived(
		weatherData ? Math.round(weatherData.current_weather.windspeed / 1.609) : null
	);
</script>

<div id="weatherWidget" aria-live="polite" class:expanded>
	<div id="weatherHeader">
		<div id="weatherLabels">
			<span id="weatherTitle">Local Weather</span>
			<span id="weatherUpdated">
				{#if loading}
					Loading...
				{:else if weatherData}
					Updated {lastUpdated}
				{:else}
					Waiting for location...
				{/if}
			</span>
		</div>
		<button 
			id="refreshWeatherBtn" 
			type="button" 
			aria-label="Refresh weather"
			onclick={handleRefresh}
			disabled={loading}
		>
			↻
		</button>
		<button 
			id="forecastBtn" 
			type="button" 
			aria-label="View weekly forecast" 
			title="Weekly forecast"
			onclick={handleOpenForecast}
		>
			📅
		</button>
		<button 
			id="toggleWeatherBtn" 
			type="button" 
			aria-label="Toggle weather details"
			class="weather-toggle-btn"
			onclick={toggleDetails}
		>
			{expanded ? '▼' : '▶'}
		</button>
	</div>
	
	<div id="weatherContent">
		<div id="weatherPrimary">
			<span id="weatherIcon">
				{weatherIcon}
			</span>
			<span id="weatherTemp">
				{tempF !== null ? `${tempF}°` : '--°'}
			</span>
		</div>
		
		{#if expanded && weatherData}
			<div id="weatherDetails">
				<div id="weatherDescription">{weatherDescription}</div>
				<div id="weatherMeta">
					<span id="weatherFeels">
						Feels like {feelsF !== null ? `${feelsF}°` : '--°'}
					</span>
					<span id="weatherWind">
						Wind {windMph !== null ? `${windMph} mph` : '--'}
					</span>
				</div>
				<div id="weatherRange">
					{#if highF !== null && lowF !== null}
						High {highF}° / Low {lowF}°
					{:else}
						Loading forecast...
					{/if}
				</div>
				
				{#if birdFact}
					<div id="birdFactContainer" style="
						margin-top: 0.75rem; 
						padding: 0.75rem; 
						background: linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(139, 195, 74, 0.15)); 
						border-radius: 8px; 
						font-size: 0.85rem; 
						color: var(--card); 
						border: 1px solid rgba(76, 175, 80, 0.3);
					">
						{birdFact}
					</div>
				{/if}
			</div>
		{:else if !weatherData}
			<div id="weatherDetails">
				<div id="weatherDescription">We will pull the forecast once we know where you are.</div>
			</div>
		{/if}
	</div>
</div>

<style>
	#weatherWidget {
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	#weatherWidget:hover {
		transform: scale(1.01);
	}
	
	#weatherWidget.expanded {
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
	}
	
	#weatherHeader {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	#weatherLabels {
		flex: 1;
		display: flex;
		flex-direction: column;
	}
	
	#refreshWeatherBtn,
	#forecastBtn,
	#toggleWeatherBtn {
		background: transparent;
		border: none;
		font-size: 1.2rem;
		cursor: pointer;
		padding: 0.3rem;
		transition: all 0.3s ease;
		border-radius: 50%;
	}
	
	#refreshWeatherBtn:hover,
	#forecastBtn:hover,
	#toggleWeatherBtn:hover {
		background: rgba(200, 121, 65, 0.2);
		transform: scale(1.2) rotate(15deg);
	}
	
	#refreshWeatherBtn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
	
	#weatherContent {
		margin-top: 0.5rem;
	}
	
	#weatherPrimary {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	
	#weatherIcon {
		font-size: 3rem;
		animation: float 3s ease-in-out infinite;
	}
	
	@keyframes float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-5px); }
	}
	
	#weatherTemp {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--card);
	}
	
	#weatherDetails {
		margin-top: 1rem;
		animation: slideDown 0.3s ease-out;
	}
	
	@keyframes slideDown {
		from {
			opacity: 0;
			max-height: 0;
		}
		to {
			opacity: 1;
			max-height: 200px;
		}
	}
	
	#weatherDescription {
		color: var(--card);
		font-size: 1rem;
		text-transform: capitalize;
		margin-bottom: 0.5rem;
	}
	
	#weatherMeta {
		display: flex;
		gap: 1rem;
		font-size: 0.9rem;
		color: var(--card);
		opacity: 0.9;
		margin: 0.5rem 0;
	}
	
	#weatherRange {
		font-size: 0.95rem;
		color: var(--card);
		font-weight: 600;
	}
</style>
