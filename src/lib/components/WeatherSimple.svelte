<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { currentPosition } from '$lib/stores/appState';
	import { browser } from '$app/environment';

	const dispatch = createEventDispatcher();

	let weather = null;
	let loading = false;
	let error = null;
	let lastFetch = 0;
	let showHistory = false;
	let historicalData = [];
	let showBirds = true; // Default enabled, controlled by settings
	let birdFact = '';

	const CACHE_TIME = 10 * 60 * 1000; // 10 minutes

	// Load bird settings from localStorage
	if (browser) {
		const savedBirdSetting = localStorage.getItem('showBirdSightings');
		if (savedBirdSetting !== null) {
			showBirds = savedBirdSetting === 'true';
		}
	}

	onMount(() => {
		const unsubscribe = currentPosition.subscribe((pos) => {
			if (pos && !loading && Date.now() - lastFetch > CACHE_TIME) {
				fetchWeather(pos.lat, pos.lng);
			}
		});
		return unsubscribe;
	});

	async function fetchWeather(lat, lng) {
		if (loading) return;
		
		loading = true;
		error = null;

		try {
			// Use Open-Meteo (free, no API key needed)
			const params = new URLSearchParams({
				latitude: lat.toFixed(4),
				longitude: lng.toFixed(4),
				current_weather: 'true',
				hourly: 'temperature_2m,relativehumidity_2m,apparent_temperature,precipitation_probability,weathercode',
				daily: 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
				temperature_unit: 'fahrenheit',
				timezone: 'auto',
				forecast_days: '7'
			});

			const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
			
			if (!response.ok) {
				throw new Error('Weather service unavailable');
			}

			const data = await response.json();
			weather = parseOpenMeteoData(data);
			lastFetch = Date.now();

			// Fetch bird sightings if enabled
			if (showBirds) {
				fetchBirdSightings(lat, lng);
			}
		} catch (err) {
			console.error('Weather fetch error:', err);
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function fetchBirdSightings(lat, lng) {
		try {
			const response = await fetch(`/.netlify/functions/ebird?lat=${lat}&lng=${lng}&maxResults=5`);
			if (response.ok) {
				const birds = await response.json();
				if (birds && birds.length > 0) {
					const recent = birds[0];
					birdFact = `🐦 Recently spotted: ${recent.comName} (${recent.howMany || 1} seen)`;
				}
			}
		} catch (err) {
			console.error('Bird fetch error:', err);
			// Silently fail for bird sightings
		}
	}

	async function toggleHistory() {
		showHistory = !showHistory;
		if (showHistory && historicalData.length === 0 && $currentPosition) {
			await fetchHistoricalWeather($currentPosition.lat, $currentPosition.lng);
		}
	}

	async function fetchHistoricalWeather(lat, lng) {
		try {
			const endDate = new Date();
			endDate.setDate(endDate.getDate() - 1);
			const startDate = new Date(endDate);
			startDate.setFullYear(startDate.getFullYear() - 1);

			const params = new URLSearchParams({
				latitude: lat.toFixed(4),
				longitude: lng.toFixed(4),
				start_date: startDate.toISOString().split('T')[0],
				end_date: endDate.toISOString().split('T')[0],
				daily: 'temperature_2m_max,temperature_2m_min,weathercode',
				temperature_unit: 'fahrenheit',
				timezone: 'auto'
			});

			const response = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`);
			
			if (!response.ok) {
				throw new Error('Historical data unavailable');
			}

			const data = await response.json();
			historicalData = parseHistoricalData(data);
		} catch (err) {
			console.error('Historical weather error:', err);
		}
	}

	function parseOpenMeteoData(data) {
		const current = data.current_weather || {};
		const hourly = data.hourly || {};
		const daily = data.daily || {};

		const weatherCode = current.weathercode;
		const condition = getWeatherCondition(weatherCode);
		const icon = getWeatherIcon(weatherCode);

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
			daily: daily.time ? daily.time.slice(0, 7).map((date, i) => ({
				date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
				high: Math.round(daily.temperature_2m_max[i]),
				low: Math.round(daily.temperature_2m_min[i]),
				icon: getWeatherIcon(daily.weathercode[i]),
				precipChance: daily.precipitation_probability_max?.[i] || 0
			})) : []
		};
	}

	function parseHistoricalData(data) {
		const daily = data.daily || {};
		if (!daily.time) return [];

		// Get last 30 days
		const length = Math.min(30, daily.time.length);
		const start = Math.max(0, daily.time.length - length);
		
		return daily.time.slice(start).map((date, i) => ({
			date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
			high: Math.round(daily.temperature_2m_max[start + i]),
			low: Math.round(daily.temperature_2m_min[start + i]),
			icon: getWeatherIcon(daily.weathercode[start + i])
		}));
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

	function getFunSaying(temp, condition) {
		if (condition.includes('Rain') || condition.includes('Drizzle') || condition.includes('Showers')) {
			return "Don't forget your umbrella!";
		}
		if (condition.includes('Clear') || condition.includes('Sunny')) {
			return "Perfect day for a walk!";
		}
		if (condition.includes('Cloud') || condition.includes('Overcast')) {
			return "A bit gloomy, but still a good day.";
		}
		if (condition.includes('Snow')) {
			return "Bundle up, it's snowy!";
		}
		if (condition.includes('Thunder') || condition.includes('Storm')) {
			return "Stay safe, stormy weather ahead!";
		}
		if (temp > 85) return "It's hot! Stay hydrated.";
		if (temp < 40) return "Brrr! It's chilly, grab a coat.";
		return "Enjoy your day!";
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

	$: funSaying = weather ? getFunSaying(weather.temperature, weather.condition) : "";
</script>

<div class="weather-widget">
	<div class="weather-header">
		<span class="weather-title">Local Weather</span>
		<div class="weather-actions">
			<button 
				class="weather-btn" 
				on:click={toggleHistory} 
				title="View history"
				disabled={loading || !weather}
			>
				📊
			</button>
			<button 
				class="weather-btn" 
				on:click={handleViewForecast} 
				title="7-day forecast"
				disabled={loading || !weather}
			>
				📅
			</button>
			<button 
				class="weather-btn" 
				on:click={handleRefresh} 
				title="Refresh"
				disabled={loading}
			>
				↻
			</button>
		</div>
	</div>

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

		<div class="weather-fun-saying">"{funSaying}"</div>

		{#if showBirds && birdFact}
			<div class="bird-fact">{birdFact}</div>
		{/if}

		{#if showHistory && historicalData.length > 0}
			<div class="weather-history">
				<h4>Last 30 Days</h4>
				<div class="history-grid">
					{#each historicalData as day}
						<div class="history-day">
							<span class="history-date">{day.date}</span>
							<span class="history-icon">{day.icon}</span>
							<span class="history-temps">{day.high}°/{day.low}°</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{:else}
		<div class="weather-placeholder">
			Enable location to see weather
		</div>
	{/if}
</div>

<style>
	.weather-widget {
		background: var(--card);
		color: var(--text-light);
		padding: 1.25rem;
		border-radius: var(--button-radius, 12px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.weather-widget:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.weather-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.weather-title {
		font-weight: 700;
		font-size: 1.1rem;
	}

	.weather-actions {
		display: flex;
		gap: 0.5rem;
	}

	.weather-btn {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 50%;
		width: 32px;
		height: 32px;
		cursor: pointer;
		font-size: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		color: var(--text-light);
	}

	.weather-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		transform: scale(1.1);
	}

	.weather-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.weather-main {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.weather-icon {
		font-size: 4rem;
		animation: float 3s ease-in-out infinite;
	}

	@keyframes float {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-8px); }
	}

	.weather-details {
		flex: 1;
	}

	.weather-temp {
		font-size: 2.5rem;
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
		padding: 0.65rem;
		border-radius: 8px;
		text-align: center;
	}

	.stat-label {
		display: block;
		font-size: 0.75rem;
		opacity: 0.7;
		margin-bottom: 0.25rem;
		text-transform: uppercase;
	}

	.stat-value {
		display: block;
		font-size: 1rem;
		font-weight: 600;
	}

	.weather-fun-saying {
		text-align: center;
		font-style: italic;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		margin-bottom: 0.75rem;
		font-size: 0.95rem;
	}

	.bird-fact {
		padding: 0.75rem;
		background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(139, 195, 74, 0.2));
		border-radius: 8px;
		border: 1px solid rgba(76, 175, 80, 0.3);
		font-size: 0.9rem;
		margin-bottom: 0.75rem;
	}

	.weather-history {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.2);
	}

	.weather-history h4 {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.history-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
		gap: 0.5rem;
		max-height: 300px;
		overflow-y: auto;
	}

	.history-day {
		background: rgba(255, 255, 255, 0.08);
		padding: 0.5rem;
		border-radius: 6px;
		text-align: center;
		font-size: 0.8rem;
	}

	.history-date {
		display: block;
		font-size: 0.7rem;
		opacity: 0.7;
		margin-bottom: 0.25rem;
	}

	.history-icon {
		display: block;
		font-size: 1.5rem;
		margin: 0.25rem 0;
	}

	.history-temps {
		display: block;
		font-size: 0.75rem;
		font-weight: 600;
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
		.weather-icon {
			font-size: 3rem;
		}

		.weather-temp {
			font-size: 2rem;
		}

		.history-grid {
			grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
		}
	}
</style>
