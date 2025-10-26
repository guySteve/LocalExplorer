async function searchLocalEvents(item) { /* Fetch events from Ticketmaster */
      if (!currentPosition) return alert('Please provide a location first.');
      const apiKey = window.TICKETMASTER_API_KEY || 'XmzfrRHZilGDGfD63SmdamF288GZ3FxH'; 
      if (!apiKey) return alert('Ticketmaster API key missing.');
      const classification = (item.value && item.value !== 'all') ? `&classificationName=${item.value}` : '';
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&latlong=${currentPosition.lat},${currentPosition.lng}&radius=50${classification}&sort=date,asc`; // Sort by date
      try {
        const resp = await fetch(url); 
        if (!resp.ok) throw new Error(`Ticketmaster API error: ${resp.status}`);
        const data = await resp.json();
        const events = data?._embedded?.events || [];
        displayEventResults(events, item.name); 
      } catch (err) { console.error("Ticketmaster fetch error:", err); alert(`Unable to fetch events: ${err.message}`); }
    }

async function showSurpriseEvents() { /* ... unchanged ... */ }

// --- UPDATED: Weather title is now static ---
function updateWeatherTitle() { 
    if (weatherElements.title) {
        weatherElements.title.textContent = 'Local Weather'; 
    }
}

// --- Weather display functions (unchanged logic, added checks) ---
function setWeatherPlaceholder(msg) { 
    if (!weatherElements.icon) return; // Check elements exist
    Object.assign(weatherElements, { 
        icon: document.getElementById('weatherIcon'), 
        temp: document.getElementById('weatherTemp'), 
        description: document.getElementById('weatherDescription'), 
        feels: document.getElementById('weatherFeels'), 
        wind: document.getElementById('weatherWind'), 
        range: document.getElementById('weatherRange'),
        updated: document.getElementById('weatherUpdated') 
    });
    weatherElements.icon.textContent = '⛅'; 
    weatherElements.temp.textContent = '--°'; 
    weatherElements.description.textContent = msg; 
    weatherElements.feels.textContent = 'Feels like --°'; 
    weatherElements.wind.textContent = 'Wind -- mph'; 
    weatherElements.range.textContent = 'High --° / Low --°'; 
    weatherElements.updated.textContent = 'Updated --'; 
    updateWeatherTitle(); 
}

function showWeatherLoading(msg) { 
     if (weatherElements.description) weatherElements.description.textContent = msg; 
     if (weatherElements.updated) weatherElements.updated.textContent = 'Updating...'; 
}

function weatherCodeToSummary(code) { /* ... unchanged ... */ }

async function fetchWeatherData(pos) { /* ... unchanged ... */ }

function renderWeather(data) { 
    // Re-check elements exist in case they haven't loaded yet
     Object.assign(weatherElements, { 
        icon: document.getElementById('weatherIcon'), 
        temp: document.getElementById('weatherTemp'), 
        description: document.getElementById('weatherDescription'), 
        feels: document.getElementById('weatherFeels'), 
        wind: document.getElementById('weatherWind'), 
        range: document.getElementById('weatherRange'),
        updated: document.getElementById('weatherUpdated') 
    });
    if (!weatherElements.icon) { console.error("Weather UI elements not found for rendering."); return; }

    if (!data?.current_weather) return setWeatherPlaceholder('Weather data unavailable.'); 
    
    const c = data.current_weather, sum = weatherCodeToSummary(c.weathercode), tempF = Math.round(c.temperature * 9/5 + 32); 
    let feelsF = tempF; 
    // Safely access hourly data
    if (data.hourly?.time && data.hourly?.apparent_temperature) { 
        const index = data.hourly.time.indexOf(c.time);
        if (index > -1 && index < data.hourly.apparent_temperature.length && data.hourly.apparent_temperature[index] !== null) { 
             feelsF = Math.round(data.hourly.apparent_temperature[index] * 9/5 + 32); 
        }
    } 
    // Safely access daily data
    const maxTemp = data.daily?.temperature_2m_max?.[0] ?? c.temperature;
    const minTemp = data.daily?.temperature_2m_min?.[0] ?? c.temperature;
    const maxF = Math.round(maxTemp * 9/5 + 32);
    const minF = Math.round(minTemp * 9/5 + 32);
    const windMph = Math.round((c.windspeed || 0) / 1.609); 
    
    weatherElements.icon.textContent = sum.icon; 
    weatherElements.temp.textContent = `${tempF}°`; 
    weatherElements.description.textContent = sum.text; 
    weatherElements.feels.textContent = `Feels like ${feelsF}°`; 
    weatherElements.wind.textContent = `Wind ${windMph} mph`; 
    weatherElements.range.textContent = `High ${maxF}° / Low ${minF}°`; 
    weatherElements.updated.textContent = `Updated ${new Date().toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}`; 
    updateWeatherTitle(); 
}

async function updateWeather(pos, opts = {}) { /* ... unchanged ... */ }

function initWeatherControls() { 
      const refBtn = $("refreshWeatherBtn"); 
      if (refBtn) refBtn.onclick = () => {if (currentPosition) updateWeather(currentPosition, { force: true }); else alert("Please set location first.");}; 
      updateWeatherTitle(); 
      const tglBtn = $("toggleWeatherBtn"), wWidget = $("weatherWidget"); 
      if (tglBtn && wWidget) { 
          const isMin = localStorage.getItem('weatherMinimized') === 'true'; 
          wWidget.classList.toggle('weather-minimized', isMin); 
          tglBtn.setAttribute('aria-expanded', !isMin); // Set initial ARIA state
          tglBtn.onclick = () => { 
              const nowMin = wWidget.classList.toggle('weather-minimized'); 
              localStorage.setItem('weatherMinimized', nowMin ? 'true' : 'false'); 
              tglBtn.setAttribute('aria-expanded', !nowMin); // Update ARIA state
          }; 
      } 
}
