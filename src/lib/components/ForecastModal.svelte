<script>
	import { createEventDispatcher } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	
	const dispatch = createEventDispatcher();
	
	// Props
	export let visible = false;
	export let forecastData = [];
	
	function handleBackdropClick(e) {
		if (e.target === e.currentTarget) {
			dispatch('close');
		}
	}
	
	function getWeatherIcon(condition) {
		const icons = {
			'clear': '☀️',
			'clouds': '☁️',
			'rain': '🌧️',
			'snow': '❄️',
			'thunderstorm': '⛈️',
			'drizzle': '🌦️',
			'mist': '🌫️',
			'fog': '🌫️'
		};
		const key = Object.keys(icons).find(k => condition.toLowerCase().includes(k));
		return icons[key] || '🌤️';
	}
	
	function formatDate(dateStr) {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}
</script>

<svelte:window on:keydown={(e) => visible && e.key === 'Escape' && dispatch('close')} />

{#if visible}
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="modal active" on:click={handleBackdropClick} transition:fade={{ duration: 200 }} role="dialog" aria-modal="true" tabindex="-1">
	<div class="modal-content" transition:fly={{ y: 50, duration: 300 }} role="document">
		<div class="modal-header">
			<h3>Weekly Forecast</h3>
			<button class="close-btn" on:click={() => dispatch('close')} type="button">×</button>
		</div>
		
		{#if forecastData.length === 0}
			<div class="empty-state">
				<p>No forecast data available</p>
			</div>
		{:else}
			<div class="forecast-grid">
				{#each forecastData as day, i}
					<div class="forecast-day" transition:fly={{ y: 20, duration: 300, delay: i * 50 }}>
						<div class="day-name">{formatDate(day.date)}</div>
						<div class="day-icon">{getWeatherIcon(day.condition)}</div>
						<div class="day-temp">
							<span class="temp-high">{Math.round(day.tempHigh)}°</span>
							<span class="temp-low">{Math.round(day.tempLow)}°</span>
						</div>
						<div class="day-condition">{day.condition}</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
{/if}

<style>
	.empty-state {
		text-align: center;
		padding: 3rem 2rem;
		color: var(--card);
	}
	
	.forecast-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 1rem;
		padding: 0.5rem 0;
	}
	
	.forecast-day {
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(200, 121, 65, 0.2);
		border-radius: var(--button-radius, 12px);
		padding: 1.2rem 0.8rem;
		text-align: center;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}
	
	.forecast-day:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
		border-color: var(--primary);
	}
	
	.day-name {
		color: var(--card);
		font-weight: 600;
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
	}
	
	.day-icon {
		font-size: 2.5rem;
		margin: 0.5rem 0;
		animation: float 3s ease-in-out infinite;
	}
	
	@keyframes float {
		0%, 100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-5px);
		}
	}
	
	.day-temp {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		margin: 0.8rem 0 0.5rem;
		font-weight: 600;
	}
	
	.temp-high {
		color: var(--primary);
		font-size: 1.1rem;
	}
	
	.temp-low {
		color: var(--card);
		opacity: 0.7;
		font-size: 0.95rem;
	}
	
	.day-condition {
		color: var(--card);
		opacity: 0.8;
		font-size: 0.85rem;
		margin-top: 0.4rem;
	}
</style>
