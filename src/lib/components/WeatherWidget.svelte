<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import {
		currentPosition,
		cachedWeather,
		lastWeatherFetch,
		lastWeatherCoords,
		WEATHER_CACHE_MS
	} from '$lib/stores/appState';
	import { fetchWeatherData, fetchRecentBirdSightings, invalidateWeatherCache } from '$lib/utils/api-extended';

	const dispatch = createEventDispatcher();

	let weatherData = $state(null);
	let loading = $state(false);
	let lastUpdated = $state('');
	let expanded = $state(false);
	let birdFact = $state('');
	let errorMessage = $state('');
	let hasRequestedWeather = $state(false);

	onMount(() => {
		const unsubscribe = currentPosition.subscribe(() => {
			if (!hasRequestedWeather || loading) return;
			const pos = $currentPosition;
			const coords = $lastWeatherCoords;
			if (weatherData && pos && coords && !isSameLocation(pos, coords)) {
				loadWeather(true);
			}
		});
		return unsubscribe;
	});

	async function loadWeather(forceFresh = false) {
		if (loading) return;

		hasRequestedWeather = true;
		errorMessage = '';

		const pos = $currentPosition;
		if (!pos) {
			errorMessage = 'Location not ready yet.';
			return;
		}

		const cached = $cachedWeather;
		const lastFetch = $lastWeatherFetch || 0;
		const coords = $lastWeatherCoords;
		const now = Date.now();

		const canUseCache = !forceFresh && cached && (now - lastFetch < WEATHER_CACHE_MS) && coords && isSameLocation(pos, coords);
		if (canUseCache) {
			weatherData = cached;
			updateLastUpdated(weatherData?.metadata?.fetchedAt || lastFetch || now);
			if (!birdFact) {
				loadBirdFact();
			}
			return;
		}

		loading = true;
		try {
			const data = await fetchWeatherData(pos.lat, pos.lng, { days: 10, units: 'imperial' });
			weatherData = data;
			cachedWeather.set(data);
			const timestamp = Date.now();
			lastWeatherFetch.set(timestamp);
			lastWeatherCoords.set({ lat: pos.lat, lng: pos.lng });
			updateLastUpdated(data?.metadata?.fetchedAt || timestamp);
			errorMessage = '';
		} catch (error) {
			console.error('Weather fetch failed:', error);
			const fallback = $cachedWeather;
			const fallbackTimestamp = fallback?.metadata?.fetchedAt || $lastWeatherFetch || Date.now();
			const message = error?.message || 'Unable to load weather data.';

			if (/weather api key not configured/i.test(message)) {
				errorMessage = 'Add WEATHER_API_KEY to your environment to enable the forecast.';
			} else {
				errorMessage = message;
			}

			if (fallback) {
				weatherData = fallback;
				updateLastUpdated(fallbackTimestamp);
			} else {
				weatherData = null;
			}
		} finally {
			loading = false;
			if (weatherData) {
				loadBirdFact();
			}
		}
	}

	async function loadBirdFact(force = false) {
		if (!hasRequestedWeather) return;
		if (birdFact && !force) return;
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
		const pos = $currentPosition;
		if (!pos) {
			errorMessage = 'Location not ready yet.';
			return;
		}
		hasRequestedWeather = true;
		invalidateWeatherCache(pos.lat, pos.lng);
		cachedWeather.set(null);
		lastWeatherFetch.set(0);
		lastWeatherCoords.set(null);
		birdFact = '';
		await loadWeather(true);
		await loadBirdFact(true);
	}

	async function handleOpenForecast() {
		if (weatherData?.daily?.length) {
			const modalData = weatherData.daily.map((day) => ({
				date: day.date,
				condition: day.description,
				tempHigh: day.highF,
				tempLow: day.lowF
			}));
			dispatch('openForecast', modalData);
		} else {
			alert('Forecast not available');
		}
	}

	function updateLastUpdated(timestamp) {
		if (!timestamp) {
			lastUpdated = '';
			return;
		}
		const time = new Date(timestamp);
		if (Number.isNaN(time.getTime())) {
			lastUpdated = '';
			return;
		}
		lastUpdated = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function toggleDetails() {
		expanded = !expanded;
		if (expanded && !weatherData && !loading) {
			loadWeather();
		}
	}

	function handleLoadWeather() {
		if (loading) return;
		if (!expanded) {
			expanded = true;
		}
		loadWeather();
	}

	function isSameLocation(a, b) {
		if (!a || !b) return false;
		return Math.abs(a.lat - b.lat) < 0.05 && Math.abs(a.lng - b.lng) < 0.05;
	}

	function formatTemp(value) {
		return value != null ? `${Math.round(value)}°` : '--°';
	}

	function formatPercent(value) {
		return value != null ? `${Math.round(value)}%` : '--';
	}

	function formatHourlyTime(value) {
		if (!value) return '--';
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? '--' : date.toLocaleTimeString([], { hour: 'numeric' });
	}

	function formatDate(value) {
		if (!value) return '--';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '--';
		return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
	}

	function formatSunTime(value) {
		if (!value) return null;
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return null;
		return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
	}

	// Computed values
	let currentConditions = $derived(weatherData?.current || null);
	let weatherIcon = $derived(currentConditions?.icon || '🌤️');
	let weatherDescription = $derived(currentConditions?.description || ($currentPosition ? 'Ready to load forecast' : 'Waiting for location'));
	let tempF = $derived(currentConditions?.temperatureF ?? null);
	let feelsF = $derived(currentConditions?.feelsLikeF ?? tempF);
	let humidityPct = $derived(currentConditions?.humidity ?? null);
	let windMph = $derived(currentConditions?.windMph ?? null);
	let precipChance = $derived(currentConditions?.precipitationChance ?? null);
	let uvIndex = $derived(currentConditions?.uvIndex ?? null);
	let dewPointF = $derived(currentConditions?.dewPointF ?? null);
	let pressureInHg = $derived(currentConditions?.pressureInHg ?? null);
	let visibilityMiles = $derived(currentConditions?.visibilityMiles ?? null);
	let sunrise = $derived(weatherData?.daily?.[0]?.sunrise ?? null);
	let sunset = $derived(weatherData?.daily?.[0]?.sunset ?? null);
	let dailyForecast = $derived(weatherData?.daily || []);
	let hourlyPreview = $derived(weatherData?.hourly?.slice(0, 6) || []);
	let todayHighF = $derived(weatherData?.daily?.[0]?.highF ?? null);
	let todayLowF = $derived(weatherData?.daily?.[0]?.lowF ?? null);
	let canRetryLoad = $derived(() => Boolean(errorMessage) && Boolean($currentPosition) && !/weather_api_key/i.test(errorMessage));
</script>

<div id="weatherWidget" aria-live="polite" class:expanded>
	<div id="weatherHeader">
		<div id="weatherLabels">
			<span id="weatherTitle">Local Weather</span>
			<span id="weatherUpdated">
				{#if loading}
					Loading forecast...
				{:else if weatherData && lastUpdated}
					Updated {lastUpdated}
				{:else if !$currentPosition}
					Waiting for location...
				{:else}
					Tap ▶ to load your 10-day forecast
				{/if}
			</span>
		</div>
		<button
			id="refreshWeatherBtn"
			type="button"
			aria-label="Refresh weather"
			onclick={handleRefresh}
			disabled={loading || !$currentPosition}
		>
			↻
		</button>
		<button
			id="forecastBtn"
			type="button"
			aria-label="View weekly forecast"
			title="Weekly forecast"
			onclick={handleOpenForecast}
			disabled={!weatherData || loading}
		>
			📅
		</button>
		<button
			id="toggleWeatherBtn"
			type="button"
			aria-label="Toggle weather details"
			class="weather-toggle-btn"
			onclick={toggleDetails}
			disabled={!$currentPosition}
		>
			{expanded ? '▼' : '▶'}
		</button>
	</div>

		{#if errorMessage}
			<div class="weather-error">
				<span>{errorMessage}</span>
				{#if canRetryLoad}
					<button class="retry-btn" type="button" onclick={() => loadWeather(true)} disabled={loading}>
						Retry
					</button>
				{/if}
			</div>
		{/if}

	<div id="weatherContent">
		<div id="weatherPrimary">
			<span id="weatherIcon">{weatherIcon}</span>
			<div class="weather-primary-text">
				<span id="weatherTemp">{formatTemp(tempF)}</span>
				<div class="weather-description">{weatherDescription}</div>
				<div class="weather-range">
					{#if todayHighF !== null && todayLowF !== null}
						High {formatTemp(todayHighF)} / Low {formatTemp(todayLowF)}
					{/if}
				</div>
				{#if sunrise && sunset}
					<div class="sun-times">Sunrise {formatSunTime(sunrise)} · Sunset {formatSunTime(sunset)}</div>
				{/if}
			</div>
		</div>

		{#if !$currentPosition}
			<div class="weather-placeholder">Enable location to load your local forecast.</div>
		{:else if !weatherData}
			{#if loading}
				<div class="weather-placeholder loading">Fetching the latest forecast...</div>
			{:else}
				<div class="weather-placeholder">
					Ready when you are. Expand or tap Load to fetch the latest weather.
					<button class="load-weather-btn" type="button" onclick={handleLoadWeather}>Load Local Weather</button>
				</div>
			{/if}
		{/if}

		{#if weatherData}
			<div class="weather-stats-grid">
				<div class="stat-card">
					<span class="stat-label">Feels Like</span>
					<span class="stat-value">{formatTemp(feelsF)}</span>
				</div>
				<div class="stat-card">
					<span class="stat-label">Wind</span>
					<span class="stat-value">{windMph != null ? `${Math.round(windMph)} mph` : '--'}</span>
				</div>
				<div class="stat-card">
					<span class="stat-label">Humidity</span>
					<span class="stat-value">{formatPercent(humidityPct)}</span>
				</div>
				<div class="stat-card">
					<span class="stat-label">Rain Chance</span>
					<span class="stat-value">{formatPercent(precipChance)}</span>
				</div>
				<div class="stat-card">
					<span class="stat-label">UV Index</span>
					<span class="stat-value">{uvIndex != null ? Math.round(uvIndex) : '--'}</span>
				</div>
				<div class="stat-card">
					<span class="stat-label">Dew Point</span>
					<span class="stat-value">{formatTemp(dewPointF)}</span>
				</div>
				<div class="stat-card">
					<span class="stat-label">Pressure</span>
					<span class="stat-value">{pressureInHg != null ? `${pressureInHg.toFixed(2)} inHg` : '--'}</span>
				</div>
				<div class="stat-card">
					<span class="stat-label">Visibility</span>
					<span class="stat-value">{visibilityMiles != null ? `${Math.round(visibilityMiles)} mi` : '--'}</span>
				</div>
			</div>
		{/if}

		{#if expanded}
			{#if weatherData}
				<div class="hourly-section">
					<div class="section-title">Next {hourlyPreview.length} Hours</div>
					<div class="hourly-grid">
						{#each hourlyPreview as hour}
							<div class="hour-card">
								<span class="hour-time">{formatHourlyTime(hour.time)}</span>
								<span class="hour-icon">{hour.icon || '⛅'}</span>
								<span class="hour-temp">{formatTemp(hour.temperatureF)}</span>
								<span class="hour-rain">{formatPercent(hour.precipitationChance)}</span>
							</div>
						{/each}
					</div>
				</div>
				<div class="daily-section">
					<div class="section-title">10-Day Forecast</div>
					<div class="daily-grid">
						{#each dailyForecast as day}
							<div class="day-row">
								<span class="day-date">{formatDate(day.date)}</span>
								<span class="day-icon">{day.icon || '⛅'}</span>
								<span class="day-desc">{day.description}</span>
								<span class="day-temps">
									<span class="day-high">{formatTemp(day.highF)}</span>
									<span class="day-low">{formatTemp(day.lowF)}</span>
								</span>
								<span class="day-rain">{formatPercent(day.precipitationChance)}</span>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<div class="weather-placeholder">Expand to load the latest forecast.</div>
			{/if}
		{/if}

		{#if birdFact}
			<div id="birdFactContainer">
				{birdFact}
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

	#weatherTitle {
		font-weight: 700;
		color: var(--card);
	}

	#weatherUpdated {
		font-size: 0.85rem;
		color: var(--card);
		opacity: 0.8;
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

	#refreshWeatherBtn:hover:not(:disabled),
	#forecastBtn:hover:not(:disabled),
	#toggleWeatherBtn:hover:not(:disabled) {
		background: rgba(200, 121, 65, 0.2);
		transform: scale(1.15);
	}

	#refreshWeatherBtn:disabled,
	#forecastBtn:disabled,
	#toggleWeatherBtn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	#weatherContent {
		margin-top: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
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
		50% { transform: translateY(-4px); }
	}

	.weather-primary-text {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	#weatherTemp {
		font-size: 2.75rem;
		font-weight: 700;
		color: var(--card);
	}

	.weather-description {
		font-size: 1rem;
		text-transform: capitalize;
		color: var(--card);
	}

	.weather-range,
	.sun-times {
		font-size: 0.85rem;
		color: var(--card);
		opacity: 0.75;
	}

	.weather-placeholder {
		padding: 1rem;
		border: 1px dashed rgba(200, 121, 65, 0.4);
		border-radius: var(--button-radius, 12px);
		text-align: center;
		color: var(--card);
		font-size: 0.9rem;
		opacity: 0.9;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		align-items: center;
	}

	.load-weather-btn {
		padding: 0.6rem 1.2rem;
		border: none;
		border-radius: var(--button-radius, 12px);
		background: var(--primary);
		color: var(--text-light);
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.load-weather-btn:hover {
		background: var(--secondary);
	}

	.weather-stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 0.75rem;
	}

	.weather-placeholder.loading {
		opacity: 0.75;
		font-style: italic;
	}

	.stat-card {
		padding: 0.75rem;
		border-radius: var(--button-radius, 12px);
		background: rgba(200, 121, 65, 0.08);
		border: 1px solid rgba(200, 121, 65, 0.2);
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.stat-label {
		font-size: 0.8rem;
		text-transform: uppercase;
		color: var(--card);
		opacity: 0.6;
	}

	.stat-value {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--card);
	}

	.section-title {
		font-weight: 600;
		color: var(--card);
		font-size: 0.95rem;
	}

	.hourly-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
		gap: 0.5rem;
	}

	.hour-card {
		padding: 0.75rem;
		text-align: center;
		border-radius: var(--button-radius, 12px);
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(200, 121, 65, 0.2);
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		color: var(--card);
	}

	.hour-time {
		font-weight: 600;
		font-size: 0.85rem;
	}

	.hour-icon {
		font-size: 1.6rem;
	}

	.hour-temp {
		font-weight: 600;
	}

	.hour-rain {
		font-size: 0.75rem;
		opacity: 0.7;
	}

	.daily-grid {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.day-row {
		display: grid;
		grid-template-columns: minmax(120px, 1fr) 40px 1fr 120px 60px;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 0.85rem;
		border-radius: var(--button-radius, 12px);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(200, 121, 65, 0.2);
		color: var(--card);
	}

	.day-date {
		font-weight: 600;
	}

	.day-icon {
		font-size: 1.8rem;
		text-align: center;
	}

	.day-desc {
		font-size: 0.9rem;
		opacity: 0.85;
	}

	.day-temps {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		font-weight: 600;
	}

	.day-high {
		color: var(--primary);
	}

	.day-low {
		opacity: 0.7;
	}

	.day-rain {
		font-size: 0.85rem;
		opacity: 0.7;
		text-align: right;
	}

	#birdFactContainer {
		margin-top: -0.5rem;
		padding: 0.75rem;
		background: linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(139, 195, 74, 0.15));
		border-radius: 8px;
		font-size: 0.85rem;
		color: var(--card);
		border: 1px solid rgba(76, 175, 80, 0.3);
	}

	.weather-error {
		padding: 0.75rem;
		border-radius: var(--button-radius, 12px);
		background: rgba(244, 67, 54, 0.12);
		border: 1px solid rgba(244, 67, 54, 0.25);
		color: #b71c1c;
		font-size: 0.9rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		justify-content: space-between;
	}

	.retry-btn {
		padding: 0.4rem 0.85rem;
		border: none;
		border-radius: var(--button-radius, 12px);
		background: var(--primary);
		color: var(--text-light);
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.retry-btn:hover:not(:disabled) {
		background: var(--secondary);
	}

	.retry-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 768px) {
		#weatherPrimary {
			flex-direction: column;
			align-items: flex-start;
		}

		.weather-stats-grid {
			grid-template-columns: repeat(2, minmax(120px, 1fr));
		}

		.day-row {
			grid-template-columns: minmax(100px, 1fr) 32px 1fr 90px 50px;
		}
	}
</style>
