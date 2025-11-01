<script>
    import { onMount } from 'svelte';

    let weather = null;
    let error = null;

    onMount(async () => {
        if (!('geolocation' in navigator)) {
            error = 'Geolocation is not supported by your browser.';
            return;
        }

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });

            const { latitude, longitude } = position.coords;
            const apiKey = import.meta.env.VITE_OPENWEATHERMAP_API_KEY;
            if (!apiKey) {
                throw new Error("OpenWeatherMap API key not found.");
            }
            
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Failed to fetch weather data');
            }
            weather = await response.json();
        } catch (err) {
            if (err instanceof Error) {
                error = err.message;
            } else {
                error = 'An unknown error occurred';
            }
            console.error(err);
        }
    });

    function getFunSaying(temp, condition) {
        if (condition.includes('Rain')) return "Don't forget your umbrella!";
        if (condition.includes('Clear')) return "Perfect day for a walk!";
        if (condition.includes('Clouds')) return "A bit gloomy, but still a good day.";
        if (temp > 30) return "It's hot! Stay hydrated.";
        if (temp < 10) return "Brrr! It's chilly, grab a coat.";
        return "Enjoy your day!";
    }

    $: funSaying = weather ? getFunSaying(weather.main.temp, weather.weather[0].main) : "";
</script>

<style>
    .weather-widget {
        background-color: var(--background-color, #f0f0f0);
        color: var(--text-color, #333);
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        text-align: center;
    }
    .weather-main {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
    }
    .weather-icon img {
        width: 50px;
        height: 50px;
    }
    .weather-details {
        text-align: left;
    }
    .weather-location {
        font-weight: bold;
        font-size: 1.2rem;
    }
    .weather-temp {
        font-size: 1.5rem;
    }
    .weather-condition {
        text-transform: capitalize;
    }
    .weather-fun-saying {
        margin-top: 1rem;
        font-style: italic;
    }
</style>

{#if error}
    <div class="weather-widget">Error: {error}</div>
{:else if !weather}
    <div class="weather-widget">Loading weather...</div>
{:else}
    <div class="weather-widget">
        <div class="weather-main">
            <div class="weather-icon">
                <img src={`http://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`} alt={weather.weather[0].description} />
            </div>
            <div class="weather-details">
                <div class="weather-location">{weather.name}</div>
                <div class="weather-temp">{Math.round(weather.main.temp)}°C</div>
                <div class="weather-condition">{weather.weather[0].main}</div>
            </div>
        </div>
        <div class="weather-fun-saying">"{funSaying}"</div>
    </div>
{/if}
