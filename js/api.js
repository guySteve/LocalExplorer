async function searchLocalEvents(item) { /* Fetch events from Ticketmaster */
      if (!currentPosition) return alert('Please provide a location first.');
      const apiKey = window.TICKETMASTER_API_KEY || 'XmzfrRHZilGDGfD63SmdamF288GZ3FxH'; // Use key or fallback
      if (!apiKey) return alert('Ticketmaster API key missing.');
      const classification = (item.value && item.value !== 'all') ? `&classificationName=${item.value}` : '';
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&latlong=${currentPosition.lat},${currentPosition.lng}&radius=50${classification}`;
      try {
        const resp = await fetch(url); const data = await resp.json();
        const events = (data._embedded && data._embedded.events) || [];
        displayEventResults(events, item.name); // Display events in results modal
      } catch (err) { console.error(err); alert('Unable to fetch events.'); }
    }

async function showSurpriseEvents() {
      if (!currentPosition) return alert('Please provide location first.');
      const apiKey = window.TICKETMASTER_API_KEY || 'XmzfrRHZilGDGfD63SmdamF288GZ3FxH';
      if (!apiKey) return alert('Ticketmaster API key missing.');
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&latlong=${currentPosition.lat},${currentPosition.lng}&radius=80&size=40`;
      try {
        const resp = await fetch(url); const data = await resp.json();
        const events = (data._embedded && data._embedded.events) || [];
        const picks = sampleFromArray(events, Math.min(6, events.length));
        if (!picks.length) return alert('No events found for Surprise Me.');
        displayEventResults(picks, 'Surprise Mix');
      } catch (err) {
        console.error(err);
        alert('Unable to fetch surprise events.');
      }
    }

// --- UPDATED: Removed Location from Weather Title ---
function updateWeatherTitle() { 
    /* Sets title - Now just static text */ 
    weatherElements.title.textContent = 'Local Weather'; 
}

function setWeatherPlaceholder(msg) { /* Shows placeholder text */
      weatherElements.icon.textContent = "\u26C5";
      weatherElements.temp.textContent = "--°";
      weatherElements.description.textContent = msg;
      weatherElements.feels.textContent = "Feels like --°";
      weatherElements.wind.textContent = "Wind -- mph";
      weatherElements.range.textContent = "High --° / Low --°";
      weatherElements.updated.textContent = "Updated --";
      updateWeatherTitle();
    }

function showWeatherLoading(msg) { weatherElements.description.textContent = msg; weatherElements.updated.textContent = 'Updating...'; }

function weatherCodeToSummary(code) { /* Translates weather code to icon/text */ const map = { 0: { icon: '☀️', text: 'Clear' }, 1: { icon: '🌤️', text: 'Mostly clear' }, 2: { icon: '⛅', text: 'Partly cloudy' }, 3: { icon: '☁️', text: 'Overcast' }, 45: { icon: '🌫️', text: 'Fog' }, 48: { icon: '🌫️', text: 'Icy fog' }, 51: { icon: '🌦️', text: 'Light drizzle' }, 53: { icon: '🌦️', text: 'Drizzle' }, 55: { icon: '🌧️', text: 'Heavy drizzle' }, 61: { icon: '🌦️', text: 'Light rain' }, 63: { icon: '🌧️', text: 'Rain' }, 65: { icon: '🌧️', text: 'Heavy rain' }, 71: { icon: '🌨️', text: 'Light snow' }, 73: { icon: '🌨️', text: 'Snow' }, 75: { icon: '❄️', text: 'Heavy snow' }, 80: { icon: '🌦️', text: 'Showers' }, 82: { icon: '⛈️', text: 'Heavy showers' }, 95: { icon: '⛈️', text: 'Thunderstorm' } }; return map[code] || { icon: '🌤️', text: 'Mixed' }; }

async function fetchWeatherData(pos) { /* Fetch from Open-Meteo */ const p = new URLSearchParams({ latitude: pos.lat.toFixed(4), longitude: pos.lng.toFixed(4), current_weather: 'true', hourly: 'apparent_temperature', daily: 'temperature_2m_max,temperature_2m_min', timezone: 'auto' }); const r = await fetch(`https://api.open-meteo.com/v1/forecast?${p}`); if (!r.ok) throw new Error('Weather fetch failed'); return r.json(); }

function renderWeather(data) { /* Update UI with weather data */ if (!data?.current_weather) return setWeatherPlaceholder('Weather unavailable.'); const c = data.current_weather, sum = weatherCodeToSummary(c.weathercode), tempF = Math.round(c.temperature * 9/5 + 32); let feelsF = tempF; if (data.hourly?.time?.indexOf(c.time) > -1 && data.hourly?.apparent_temperature) { // Check if apparent_temperature exists
    const index = data.hourly.time.indexOf(c.time);
    if (index >= 0 && index < data.hourly.apparent_temperature.length) { // Check index bounds
         feelsF = Math.round(data.hourly.apparent_temperature[index] * 9/5 + 32); 
    }
} const maxF = Math.round((data.daily?.temperature_2m_max?.[0] ?? c.temperature) * 9/5 + 32), minF = Math.round((data.daily?.temperature_2m_min?.[0] ?? c.temperature) * 9/5 + 32), windMph = Math.round((c.windspeed || 0) / 1.609); weatherElements.icon.textContent = sum.icon; weatherElements.temp.textContent = `${tempF}°`; weatherElements.description.textContent = sum.text; weatherElements.feels.textContent = `Feels like ${feelsF}°`; weatherElements.wind.textContent = `Wind ${windMph} mph`; weatherElements.range.textContent = `High ${maxF}° / Low ${minF}°`; weatherElements.updated.textContent = `Updated ${new Date().toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}`; updateWeatherTitle(); }

async function updateWeather(pos, opts = {}) { /* Update weather, uses cache */ if (!pos) return setWeatherPlaceholder('Provide location for forecast.'); const key = `${pos.lat.toFixed(3)}|${pos.lng.toFixed(3)}`, now = Date.now(); if (!opts.force && cachedWeather && lastWeatherCoords === key && (now - lastWeatherFetch) < WEATHER_CACHE_MS) return renderWeather(cachedWeather); showWeatherLoading('Updating forecast...'); try { const data = await fetchWeatherData(pos); cachedWeather = data; lastWeatherCoords = key; lastWeatherFetch = now; renderWeather(data); } catch (err) { console.error('Weather update failed', err); setWeatherPlaceholder('Unable to retrieve weather.'); } }

function initWeatherControls() { /* Attach listeners for weather */ const refBtn = $("refreshWeatherBtn"); if (refBtn) refBtn.onclick = () => {if (currentPosition) updateWeather(currentPosition, { force: true });}; updateWeatherTitle(); const tglBtn = $("toggleWeatherBtn"), wWidget = $("weatherWidget"); if (tglBtn && wWidget) { const isMin = localStorage.getItem('weatherMinimized') === 'true'; wWidget.classList.toggle('weather-minimized', isMin); tglBtn.onclick = () => { const nowMin = wWidget.classList.toggle('weather-minimized'); localStorage.setItem('weatherMinimized', nowMin ? 'true' : 'false'); }; } }

