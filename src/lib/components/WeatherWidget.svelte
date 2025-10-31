<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { currentPosition, cachedWeather, lastWeatherFetch, WEATHER_CACHE_MS } from '$lib/stores/appState';
	import { fetchWeather, fetchForecast } from '$lib/utils/api';
	
	const dispatch = createEventDispatcher();
	
	let weatherData = null;
	let loading = false;
	let lastUpdated = '';
	let expanded = false;
	
	const weatherIcons = {
		'Clear': '☀️',
		'Clouds': '☁️',
		'Rain': '🌧️',
		'Drizzle': '🌦️',
		'Thunderstorm': '⛈️',
		'Snow': '❄️',
		'Mist': '🌫️',
		'Fog': '🌫️',
		'Haze': '🌫️'
	};
	
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
			const data = await fetchWeather(pos.lat, pos.lng);
			if (data) {
				weatherData = data;
				cachedWeather.set(data);
				lastWeatherFetch.set(Date.now());
				updateLastUpdated();
			}
		} catch (error) {
			console.error('Weather fetch failed:', error);
		} finally {
			loading = false;
		}
	}
	
	async function handleRefresh() {
		// Clear cache and force refresh
		lastWeatherFetch.set(0);
		await loadWeather();
	}
	
	async function handleOpenForecast() {
		const pos = $currentPosition;
		if (!pos) {
			alert('Location not available');
			return;
		}
		
		try {
			const data = await fetchForecast(pos.lat, pos.lng);
			if (data && data.list) {
				const forecast = data.list.map(day => ({
					date: new Date(day.dt * 1000).toISOString(),
					condition: day.weather[0].main,
					tempHigh: day.temp.max,
					tempLow: day.temp.min
				}));
				dispatch('openForecast', forecast);
			}
		} catch (error) {
			console.error('Forecast fetch failed:', error);
			alert('Forecast not available');
		}
	}
	
	function updateLastUpdated() {
		const now = new Date();
		lastUpdated = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
	
	function getWeatherIcon(condition) {
		return weatherIcons[condition] || '🌤️';
	}
	
	function toggleDetails() {
		expanded = !expanded;
	}
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
			on:click={handleRefresh}
			disabled={loading}
		>
			↻
		</button>
		<button 
			id="forecastBtn" 
			type="button" 
			aria-label="View weekly forecast" 
			title="Weekly forecast"
			on:click={handleOpenForecast}
		>
			📅
		</button>
		<button 
			id="toggleWeatherBtn" 
			type="button" 
			aria-label="Toggle weather details"
			class="weather-toggle-btn"
			on:click={toggleDetails}
		>
			{expanded ? '▼' : '▶'}
		</button>
	</div>
	
	<div id="weatherContent">
		<div id="weatherPrimary">
			<span id="weatherIcon">
				{weatherData ? getWeatherIcon(weatherData.weather[0].main) : '--'}
			</span>
			<span id="weatherTemp">
				{weatherData ? Math.round(weatherData.main.temp) + '°' : '--°'}
			</span>
		</div>
		
		{#if expanded && weatherData}
			<div id="weatherDetails">
				<div id="weatherDescription">{weatherData.weather[0].description}</div>
				<div id="weatherMeta">
					<span id="weatherFeels">
						Feels like {Math.round(weatherData.main.feels_like)}°
					</span>
					<span id="weatherWind">
						Wind {Math.round(weatherData.wind.speed)} mph
					</span>
				</div>
				<div id="weatherRange">
					High {Math.round(weatherData.main.temp_max)}° / Low {Math.round(weatherData.main.temp_min)}°
				</div>
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
