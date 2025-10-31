<script>
	// Component for displaying weather widget
</script>

<div id="weatherWidget" aria-live="polite">
	<div id="weatherHeader">
		<div id="weatherLabels">
			<span id="weatherTitle">Local Weather</span>
			<span id="weatherUpdated">Waiting for location...</span>
		</div>
		<button id="refreshWeatherBtn" type="button" aria-label="Refresh weather">↻</button>
		<button id="forecastBtn" type="button" aria-label="View weekly forecast" title="Weekly forecast">📅</button>
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

<style>
	/* Component-specific styles scoped by default */
</style>
