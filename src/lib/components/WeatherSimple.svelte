<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { currentPosition, currentTheme, showBirdSightings, currentWeatherCondition } from '$lib/stores/appState';
	import { fetchRecentBirdSightings } from '$lib/utils/api-extended';
	import { getWeatherPhrase } from '$lib/utils/weatherPhrases';
	import { ChevronDown, ChevronUp, Calendar } from 'lucide-svelte';

	const dispatch = createEventDispatcher();

	let weather = null;
	let loading = false;
	let error = null;
	let lastFetch = 0;
	let historicalData = [];
	let showBirds = true; // Controlled via store
	let birdFact = '';
	let lastHistoricalFetch = 0; // Cache timestamp for historical data
	let lastKnownPosition = null;
	let isExpanded = false; // Start collapsed by default

	const CACHE_TIME = 10 * 60 * 1000; // 10 minutes
	const TEMP_DIFF_THRESHOLD = 5; // Degrees for significant temperature change
	
	function handleBirdBoxClick() {
		// Dispatch event to open the Regional Bird Guide submenu
		dispatch('openBirdMenu');
	}

	onMount(() => {
		const unsubscribePosition = currentPosition.subscribe((pos) => {
			lastKnownPosition = pos;
			if (pos && !loading && Date.now() - lastFetch > CACHE_TIME) {
				fetchWeather(pos.lat, pos.lng);
			}
		});

		const unsubscribeBirds = showBirdSightings.subscribe((value) => {
			showBirds = value;
			if (!value) {
				birdFact = '';
			} else if (lastKnownPosition) {
				lastFetch = 0;
				fetchWeather(lastKnownPosition.lat, lastKnownPosition.lng);
			}
		});

		return () => {
			unsubscribePosition();
			unsubscribeBirds();
		};
	});

	async function fetchWeather(lat, lng) {
		if (loading) return;
		
		loading = true;
		error = null;

		try {
			// Fetch weather and bird data in parallel
			const weatherPromise = fetchOpenMeteoData(lat, lng);
			const birdPromise = showBirds ? fetchRecentBirdSightings(lat, lng) : Promise.resolve(null);

			const [weatherData, birdResponse] = await Promise.all([weatherPromise, birdPromise]);

			if (weatherData) {
				weather = weatherData;
				lastFetch = Date.now();
			}
			
			if (birdResponse && birdResponse !== 'configure-key') {
				birdFact = birdResponse;
			} else if (birdResponse === 'configure-key') {
				birdFact = '🐦 Bird sightings unavailable. Add EBIRD_API_KEY to enable.';
			} else if (!showBirds) {
				birdFact = '';
			}
			
			// Fetch historical data only if not cached
			if (Date.now() - lastHistoricalFetch > CACHE_TIME) {
				await fetchHistoricalWeather(lat, lng);
			}
		} catch (err) {
			console.error('Weather fetch error:', err);
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function fetchOpenMeteoData(lat, lng) {
		// Use Open-Meteo (free, no API key needed)
		const params = new URLSearchParams({
			latitude: lat.toFixed(4),
			longitude: lng.toFixed(4),
			current_weather: 'true',
			hourly: 'temperature_2m,relativehumidity_2m,apparent_temperature,precipitation_probability,weathercode',
			daily: 'weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max',
			temperature_unit: 'fahrenheit',
			timezone: 'auto',
			forecast_days: '7'
		});

		const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
		
		if (!response.ok) {
			throw new Error('Weather service unavailable');
		}

		const data = await response.json();
		return parseOpenMeteoData(data);
	}

	async function fetchHistoricalWeather(lat, lng) {
		try {
			// Get current date and same date last year for comparison
			const currentDate = new Date();
			const lastYearDate = new Date();
			lastYearDate.setFullYear(currentDate.getFullYear() - 1);

			// Fetch historical weather data from Open-Meteo using the archive endpoint
			const params = new URLSearchParams({
				latitude: lat.toFixed(4),
				longitude: lng.toFixed(4),
				daily: 'temperature_2m_max,temperature_2m_min,weathercode',
				temperature_unit: 'fahrenheit',
				timezone: 'auto',
				start_date: lastYearDate.toISOString().split('T')[0],
				end_date: lastYearDate.toISOString().split('T')[0]
			});

			// Use the archive endpoint for historical data instead of forecast
			const response = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`);
			
			if (!response.ok) {
				throw new Error('Historical weather service unavailable');
			}

			const data = await response.json();
			historicalData = parseHistoricalData(data, lastYearDate);
			lastHistoricalFetch = Date.now();
		} catch (err) {
			console.error('Historical weather fetch error:', err);
		}
	}

	function parseOpenMeteoData(data) {
		const current = data.current_weather || {};
		const hourly = data.hourly || {};
		const daily = data.daily || {};

		const weatherCode = current.weathercode;
		const condition = getWeatherCondition(weatherCode);
		const icon = getWeatherIcon(weatherCode);

		// Store the normalized weather condition for context-aware sorting
		const normalizedCondition = normalizeWeatherCondition(weatherCode);
		currentWeatherCondition.set(normalizedCondition);

		const currentHour = new Date().getHours();
		const currentIndex = hourly.time ? hourly.time.findIndex(t => new Date(t).getHours() === currentHour) : 0;

		return {
			temperature: Math.round(current.temperature),
			condition: condition,
			icon: icon,
			humidity: hourly.relativehumidity_2m?.[currentIndex] || null,
			feelsLike: hourly.apparent_temperature?.[currentIndex] ? Math.round(hourly.apparent_temperature[currentIndex]) : null,
			precipChance: hourly.precipitation_probability?.[currentIndex] || null,
			windSpeed: Math.round(current.windspeed * 0.621371), // Convert km/h to mph
			sunrise: daily.sunrise?.[0] || null,
			sunset: daily.sunset?.[0] || null,
			daily: daily.time ? daily.time.slice(0, 10).map((date, i) => ({
				date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
				dayOfWeek: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
				high: Math.round(daily.temperature_2m_max[i]),
				low: Math.round(daily.temperature_2m_min[i]),
				icon: getWeatherIcon(daily.weathercode[i]),
				precipChance: daily.precipitation_probability_max?.[i] || 0
			})) : []
		};
	}

	function normalizeWeatherCondition(code) {
		// Normalize to simple categories for sorting logic
		// More specific conditions first to avoid overlaps
		if (code >= 71 && code <= 77) return 'snow'; // Snow codes
		if (code >= 85 && code <= 86) return 'snow'; // Snow showers
		if (code >= 61 && code <= 65) return 'rain'; // Rain codes
		if (code >= 80 && code <= 82) return 'rain'; // Rain showers
		if (code >= 51 && code <= 55) return 'rain'; // Drizzle
		if (code >= 95) return 'storm'; // Thunderstorm
		if (code === 0 || code === 1) return 'sunny'; // Clear/mainly clear
		return 'clear'; // Default
	}

	function parseHistoricalData(data, lastYearDate) {
		const daily = data.daily || {};
		if (!daily.time || daily.time.length === 0) return [];

		// Return data for the same date last year
		return [{
			date: lastYearDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
			high: Math.round(daily.temperature_2m_max[0]),
			low: Math.round(daily.temperature_2m_min[0]),
			icon: getWeatherIcon(daily.weathercode[0])
		}];
	}

	function getWeatherCondition(code) {
		const conditions = {
			0: 'Clear',
			1: 'Mainly Clear',
			2: 'Partly Cloudy',
			3: 'Overcast',
			45: 'Foggy',
			48: 'Foggy',
			51: 'Light Drizzle',
			53: 'Drizzle',
			55: 'Heavy Drizzle',
			61: 'Light Rain',
			63: 'Rain',
			65: 'Heavy Rain',
			71: 'Light Snow',
			73: 'Snow',
			75: 'Heavy Snow',
			77: 'Snow Grains',
			80: 'Light Showers',
			81: 'Showers',
			82: 'Heavy Showers',
			85: 'Light Snow Showers',
			86: 'Snow Showers',
			95: 'Thunderstorm',
			96: 'Thunderstorm with Hail',
			99: 'Thunderstorm with Hail'
		};
		return conditions[code] || 'Unknown';
	}

	function getWeatherIcon(code) {
		if (code === 0 || code === 1) return '☀️';
		if (code === 2) return '⛅';
		if (code === 3) return '☁️';
		if (code === 45 || code === 48) return '🌫️';
		if (code >= 51 && code <= 55) return '🌦️';
		if (code >= 61 && code <= 65) return '🌧️';
		if (code >= 71 && code <= 77) return '❄️';
		if (code >= 80 && code <= 82) return '🌧️';
		if (code >= 85 && code <= 86) return '🌨️';
		if (code >= 95) return '⛈️';
		return '🌤️';
	}

	async function handleRefresh() {
		if ($currentPosition) {
			lastFetch = 0;
			await fetchWeather($currentPosition.lat, $currentPosition.lng);
		}
	}

	function handleViewForecast() {
		if (weather?.daily) {
			dispatch('openForecast', weather.daily.map(d => ({
				date: d.date,
				condition: d.icon,
				tempHigh: d.high,
				tempLow: d.low
			})));
		}
	}

	$: funSaying = weather ? getWeatherPhrase(weather.temperature, weather.condition, false, $currentTheme) : "";
	
	function getTimeUntilSunEvent(sunTime) {
		if (!sunTime) return null;
		
		const now = new Date();
		const sunDate = new Date(sunTime);
		const diffMs = sunDate - now;
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
		
		// If event already passed today, it might be tomorrow
		if (diffHours < 0 && diffHours > -24) return null; // Event passed today
		
		// Show countdown for events within the next 24 hours
		if (diffHours >= 0 && diffHours < 24) {
			if (diffHours === 0) {
				return `${diffMinutes}m`;
			} else {
				return `${diffHours}h ${diffMinutes}m`;
			}
		}
		
		return null; // Event is too far in the future or past
	}
	
	$: sunriseTime = weather?.sunrise ? getTimeUntilSunEvent(weather.sunrise) : null;
	$: sunsetTime = weather?.sunset ? getTimeUntilSunEvent(weather.sunset) : null;
</script>

<div class="weather-widget">
	<button class="weather-header" on:click={() => isExpanded = !isExpanded} type="button">
		<div class="header-left">
			{#if weather}
				<span class="weather-icon-compact">{weather.icon}</span>
				<span class="weather-temp-compact">{weather.temperature}°F</span>
			{:else}
				<span class="weather-title-compact">Weather</span>
			{/if}
		</div>
		<div class="header-right">
			{#if weather && (sunriseTime || sunsetTime)}
				<span class="sun-compact">
					{#if sunriseTime}🌅 {sunriseTime}{/if}
					{#if sunsetTime}🌇 {sunsetTime}{/if}
				</span>
			{/if}
			<button 
				class="weather-btn" 
				on:click|stopPropagation={handleViewForecast} 
				title="{weather?.daily?.length || 10}-day forecast"
				disabled={loading || !weather}
			>
				<Calendar size={16} color="currentColor" />
				<span>{weather?.daily?.length || 10} days</span>
			</button>
			<button class="toggle-btn" aria-label={isExpanded ? 'Collapse weather' : 'Expand weather'}>
				{#if isExpanded}
					<ChevronUp size={20} color="currentColor" />
				{:else}
					<ChevronDown size={20} color="currentColor" />
				{/if}
			</button>
		</div>
	</button>

	
	{#if isExpanded}
	{#if error}
		<div class="weather-error">
			<span>⚠️ {error}</span>
			<button class="retry-btn" on:click={handleRefresh}>Retry</button>
		</div>
	{:else if loading && !weather}
		<div class="weather-loading">Loading weather...</div>
	{:else if weather}
		<div class="weather-main">
			<div class="weather-icon">{weather.icon}</div>
			<div class="weather-details">
				<div class="weather-temp">{weather.temperature}°F</div>
				<div class="weather-condition">{weather.condition}</div>
				{#if weather.feelsLike}
					<div class="weather-feels">Feels like {weather.feelsLike}°F</div>
				{/if}
			</div>
		</div>

		<div class="weather-stats">
			{#if weather.humidity !== null}
				<div class="stat-item">
					<span class="stat-label">Humidity</span>
					<span class="stat-value">{weather.humidity}%</span>
				</div>
			{/if}
			{#if weather.precipChance !== null}
				<div class="stat-item">
					<span class="stat-label">Rain Chance</span>
					<span class="stat-value">{weather.precipChance}%</span>
				</div>
			{/if}
			{#if weather.windSpeed}
				<div class="stat-item">
					<span class="stat-label">Wind</span>
					<span class="stat-value">{weather.windSpeed} mph</span>
				</div>
			{/if}
		</div>

		<div class="weather-fun-saying">{funSaying}</div>

		{#if showBirds && birdFact}
			<button class="bird-fact" on:click={handleBirdBoxClick} type="button" aria-label="Open bird watching menu">
				{birdFact}
			</button>
		{/if}

		<!-- Always show historical weather as small visual at bottom -->
		{#if historicalData.length > 0 && weather && weather.daily && weather.daily.length > 0}
			<div class="weather-history-compare">
				{#each historicalData as day}
					{@const todayHigh = weather.daily[0].high}
					{@const lastYearHigh = day.high}
					{@const tempDiff = todayHigh - lastYearHigh}
					{@const isHotter = tempDiff > 0}
					{@const isSignificant = Math.abs(tempDiff) > TEMP_DIFF_THRESHOLD}
					{#if isSignificant}
						<div class="history-comparison">
							<span class="history-icon">{isHotter ? '🔥' : '❄️'}</span>
							<span class="history-text">
								{isHotter ? 'Warmer' : 'Cooler'} than usual - {todayHigh}°F vs {lastYearHigh}°F average
							</span>
						</div>
					{:else}
						<div class="history-comparison">
							<span class="history-icon">🌡️</span>
							<span class="history-text">
								About average - {todayHigh}°F (similar to last year's {lastYearHigh}°F)
							</span>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	{:else}
		<div class="weather-placeholder">
			Enable location to see weather
		</div>
	{/if}
	{/if}
</div>

<style>
	.weather-widget {
		background: var(--card);
		color: var(--text-light);
		padding: 0.9rem 1rem;
		border-radius: var(--button-radius, 12px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		position: relative;
	}

	.weather-widget:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.weather-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		background: transparent;
		border: none;
		color: var(--text-light);
		cursor: pointer;
		padding: 0;
		margin-bottom: 0;
		text-align: left;
		font-family: inherit;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.weather-icon-compact {
		font-size: 2rem;
	}

	.weather-temp-compact {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.weather-title-compact {
		font-size: 1.1rem;
		font-weight: 700;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.sun-compact {
		font-size: 0.8rem;
		opacity: 0.9;
		display: flex;
		gap: 0.5rem;
	}

	.weather-btn {
		background: transparent;
		border: none;
		border-radius: 8px;
		padding: 0.4rem 0.6rem;
		cursor: pointer;
		font-size: 0.85rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		transition: all 0.2s ease;
		color: var(--text-light);
		white-space: nowrap;
	}

	.weather-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		transform: translateY(-1px);
	}

	.weather-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.toggle-btn {
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-light);
		transition: all 0.2s ease;
	}

	.toggle-btn:hover {
		transform: scale(1.05);
	}

	.weather-main {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.weather-icon {
		font-size: 3.5rem;
		background: none;
		text-shadow: none;
		filter: none;
	}

	.weather-details {
		flex: 1;
	}

	.weather-temp {
		font-size: 2rem;
		font-weight: 700;
		line-height: 1;
		margin-bottom: 0.25rem;
	}

	.weather-condition {
		font-size: 1.1rem;
		opacity: 0.9;
		text-transform: capitalize;
	}

	.weather-feels {
		font-size: 0.9rem;
		opacity: 0.7;
		margin-top: 0.25rem;
	}

	.weather-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.stat-item {
		background: rgba(255, 255, 255, 0.1);
		padding: 0.5rem;
		border-radius: 8px;
		text-align: center;
	}

	.stat-label {
		display: block;
		font-size: 0.7rem;
		opacity: 0.7;
		margin-bottom: 0.2rem;
		text-transform: uppercase;
	}

	.stat-value {
		display: block;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.weather-fun-saying {
		text-align: center;
		font-style: italic;
		padding: 0.65rem;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		margin-bottom: 0.65rem;
		font-size: 0.9rem;
	}

	.bird-fact {
		padding: 0.75rem;
		background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(139, 195, 74, 0.2));
		border-radius: 8px;
		border: 1px solid rgba(76, 175, 80, 0.3);
		font-size: 0.9rem;
		margin-bottom: 0.75rem;
		cursor: pointer;
		transition: all 0.3s ease;
		width: 100%;
		text-align: left;
		color: var(--text-light);
		font-family: inherit;
	}
	
	.bird-fact:hover {
		background: linear-gradient(135deg, rgba(76, 175, 80, 0.3), rgba(139, 195, 74, 0.3));
		border-color: rgba(76, 175, 80, 0.5);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
	}
	
	.bird-fact:active {
		transform: translateY(0);
	}

	.weather-history-compare {
		padding: 0.75rem;
		margin-top: 0.75rem;
		border-top: 1px solid rgba(255, 255, 255, 0.15);
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
	}

	.history-comparison {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		line-height: 1.4;
	}

	.history-icon {
		font-size: 1.2rem;
	}

	.history-text {
		color: var(--text-light);
		opacity: 0.9;
	}

	.weather-error {
		padding: 1rem;
		background: rgba(244, 67, 54, 0.15);
		border: 1px solid rgba(244, 67, 54, 0.3);
		border-radius: 8px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
	}

	.retry-btn {
		padding: 0.5rem 1rem;
		background: var(--primary);
		color: var(--text-light);
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 600;
		transition: background 0.2s ease;
	}

	.retry-btn:hover {
		background: var(--secondary);
	}

	.weather-loading,
	.weather-placeholder {
		text-align: center;
		padding: 2rem 1rem;
		opacity: 0.7;
		font-style: italic;
	}

	@media (max-width: 768px) {
		.weather-widget {
			padding: 0.75rem 0.85rem;
		}

		.weather-icon {
			font-size: 2.5rem;
		}

		.weather-temp {
			font-size: 1.75rem;
		}

		.weather-icon-compact {
			font-size: 1.75rem;
		}

		.weather-temp-compact {
			font-size: 1.25rem;
		}

		.sun-compact {
			font-size: 0.75rem;
		}

		.weather-btn {
			font-size: 0.8rem;
			padding: 0.35rem 0.5rem;
		}
	}
</style>
