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
    if (weatherElements.title) weatherElements.title.textContent = 'Local Weather'; 
}

function setWeatherPlaceholder(msg) { /* Shows placeholder text */
      if (weatherElements.icon) weatherElements.icon.textContent = "\u26C5";
      if (weatherElements.temp) weatherElements.temp.textContent = "--°";
      if (weatherElements.description) weatherElements.description.textContent = msg;
      if (weatherElements.feels) weatherElements.feels.textContent = "Feels like --°";
      if (weatherElements.wind) weatherElements.wind.textContent = "Wind -- mph";
      if (weatherElements.range) weatherElements.range.textContent = "High --° / Low --°";
      if (weatherElements.updated) weatherElements.updated.textContent = "Updated --";
      updateWeatherTitle();
    }

function showWeatherLoading(msg) { 
      if (weatherElements.description) weatherElements.description.textContent = msg; 
      if (weatherElements.updated) weatherElements.updated.textContent = 'Updating...'; 
}

function weatherCodeToSummary(code) { /* Translates weather code to icon/text */ const map = { 0: { icon: '☀️', text: 'Clear' }, 1: { icon: '🌤️', text: 'Mostly clear' }, 2: { icon: '⛅', text: 'Partly cloudy' }, 3: { icon: '☁️', text: 'Overcast' }, 45: { icon: '🌫️', text: 'Fog' }, 48: { icon: '🌫️', text: 'Icy fog' }, 51: { icon: '🌦️', text: 'Light drizzle' }, 53: { icon: '🌦️', text: 'Drizzle' }, 55: { icon: '🌧️', text: 'Heavy drizzle' }, 61: { icon: '🌦️', text: 'Light rain' }, 63: { icon: '🌧️', text: 'Rain' }, 65: { icon: '🌧️', text: 'Heavy rain' }, 71: { icon: '🌨️', text: 'Light snow' }, 73: { icon: '🌨️', text: 'Snow' }, 75: { icon: '❄️', text: 'Heavy snow' }, 80: { icon: '🌦️', text: 'Showers' }, 82: { icon: '⛈️', text: 'Heavy showers' }, 95: { icon: '⛈️', text: 'Thunderstorm' } }; return map[code] || { icon: '🌤️', text: 'Mixed' }; }

function formatTimeRemaining(hours, minutes) {
  /* Format time remaining in a readable way */
  if (hours > 24) {
    return `${Math.round(hours / 24)} days`;
  } else if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  } else if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  } else {
    return 'moments';
  }
}

function getContextualSunMessage(type, timeRemaining, weatherCode, isClear) {
  /* Generate creative contextual messages based on time of day and weather */
  const hours = Math.floor(timeRemaining / 60);
  const isNight = type === 'sunrise';
  
  // Clear night/day specific messages
  if (isClear) {
    if (type === 'sunset') {
      if (hours === 0) return '🌅 The golden hour is upon us!';
      if (hours < 1) return '🌇 Sunset vibes incoming...';
      if (hours < 2) return '☀️ Catch those last rays!';
      if (hours < 3) return '🌤️ Day is winding down...';
      if (hours < 6) return '☀️ Plenty of daylight left!';
      return '☀️ Enjoy the sunshine!';
    } else {
      if (hours === 0) return '🌄 Dawn is breaking!';
      if (hours < 1) return '🌌 Night is ending soon...';
      if (hours < 2) return '⭐ Good night for now...';
      if (hours < 3) return '🌙 Sweet dreams under clear skies!';
      if (hours < 6) return '✨ Stargazing weather!';
      return '🌠 Clear night ahead!';
    }
  }
  
  // Weather-specific messages
  const isRainy = [51, 53, 55, 61, 63, 65, 80, 82].includes(weatherCode);
  const isSnowy = [71, 73, 75].includes(weatherCode);
  const isStormy = [95].includes(weatherCode);
  const isCloudy = [2, 3].includes(weatherCode);
  const isFoggy = [45, 48].includes(weatherCode);
  
  if (type === 'sunset') {
    if (isStormy) {
      if (hours < 2) return '⛈️ Storm sunset drama incoming!';
      return '⚡ Stormy skies till sunset...';
    }
    if (isRainy) {
      if (hours < 2) return '🌧️ Rainy sunset vibes...';
      return '💧 Wet evening ahead...';
    }
    if (isSnowy) {
      if (hours < 2) return '❄️ Snowy dusk approaching...';
      return '🌨️ Winter wonderland till sunset...';
    }
    if (isCloudy) {
      if (hours < 2) return '☁️ Cloudy sunset coming...';
      return '⛅ Overcast evening ahead...';
    }
    if (isFoggy) {
      if (hours < 2) return '🌫️ Misty sunset vibes...';
      return '🌁 Foggy evening ahead...';
    }
    return '🌆 Sunset approaching...';
  } else {
    if (isStormy) {
      if (hours < 2) return '⛈️ Stormy night ending...';
      return '⚡ Thunder through the night...';
    }
    if (isRainy) {
      if (hours < 2) return '🌧️ Rainy night, sunrise soon...';
      return '💧 Wet night ahead...';
    }
    if (isSnowy) {
      if (hours < 2) return '❄️ Snowy dawn approaching...';
      return '🌨️ Snow through the night...';
    }
    if (isCloudy) {
      if (hours < 2) return '☁️ Cloudy dawn coming...';
      return '⛅ Overcast night...';
    }
    if (isFoggy) {
      if (hours < 2) return '🌫️ Misty morning ahead...';
      return '🌁 Foggy night...';
    }
    return '🌃 Good night!';
  }
}

function renderSunInfo(data, weatherCode) {
  /* Render sunrise/sunset countdown with contextual messages */
  const sunInfoContainer = document.getElementById('weatherSunInfo');
  const sunCountdown = document.getElementById('sunCountdown');
  const sunMessage = document.getElementById('sunMessage');
  
  if (!sunInfoContainer || !sunCountdown || !sunMessage) return;
  
  // Check if we have sunrise/sunset data
  if (!data.daily?.sunrise?.[0] || !data.daily?.sunset?.[0]) {
    sunInfoContainer.style.display = 'none';
    return;
  }
  
  const now = new Date();
  const sunrise = new Date(data.daily.sunrise[0]);
  const sunset = new Date(data.daily.sunset[0]);
  
  // Determine if we're before or after sunrise/sunset
  const isDay = now >= sunrise && now < sunset;
  const isClear = [0, 1].includes(weatherCode); // Clear or mostly clear
  
  let nextEvent, nextEventTime, eventType;
  
  if (isDay) {
    // During day, show countdown to sunset
    nextEvent = 'sunset';
    nextEventTime = sunset;
    eventType = 'sunset';
  } else {
    // During night, show countdown to sunrise
    // Check if sunrise is today or tomorrow
    if (now < sunrise) {
      nextEvent = 'sunrise';
      nextEventTime = sunrise;
    } else {
      // Sunrise already passed, use tomorrow's sunrise
      const tomorrowSunrise = new Date(data.daily.sunrise[1] || sunrise);
      if (data.daily.sunrise[1]) {
        nextEvent = 'sunrise';
        nextEventTime = tomorrowSunrise;
      } else {
        // Fallback: add 24 hours
        nextEvent = 'sunrise';
        nextEventTime = new Date(sunrise.getTime() + 24 * 60 * 60 * 1000);
      }
    }
    eventType = 'sunrise';
  }
  
  // Calculate time remaining
  const timeRemaining = Math.max(0, nextEventTime - now);
  const minutesRemaining = Math.floor(timeRemaining / (1000 * 60));
  const hoursRemaining = Math.floor(minutesRemaining / 60);
  const minsRemaining = minutesRemaining % 60;
  
  // Format the countdown
  const formattedTime = formatTimeRemaining(hoursRemaining, minsRemaining);
  const emoji = eventType === 'sunset' ? '🌅' : '🌄';
  
  // Update UI
  sunCountdown.textContent = `${emoji} ${formattedTime} till ${nextEvent}`;
  sunMessage.textContent = getContextualSunMessage(eventType, minutesRemaining, weatherCode, isClear);
  sunInfoContainer.style.display = 'block';
}

async function fetchWeatherData(pos) { /* Fetch from Open-Meteo */ const p = new URLSearchParams({ latitude: pos.lat.toFixed(4), longitude: pos.lng.toFixed(4), current_weather: 'true', hourly: 'apparent_temperature', daily: 'temperature_2m_max,temperature_2m_min,sunrise,sunset', timezone: 'auto' }); const r = await fetch(`https://api.open-meteo.com/v1/forecast?${p}`); if (!r.ok) throw new Error('Weather fetch failed'); return r.json(); }

function renderWeather(data) { /* Update UI with weather data */ 
  if (!data?.current_weather) return setWeatherPlaceholder('Weather unavailable.'); 
  
  const c = data.current_weather, 
        sum = weatherCodeToSummary(c.weathercode), 
        tempF = Math.round(c.temperature * 9/5 + 32); 
  
  let feelsF = tempF; 
  if (Array.isArray(data.hourly?.time) && Array.isArray(data.hourly?.apparent_temperature)) {
    const index = data.hourly.time.indexOf(c.time);
    if (index >= 0 && index < data.hourly.apparent_temperature.length) {
      feelsF = Math.round(data.hourly.apparent_temperature[index] * 9/5 + 32); 
    }
  } 
  
  const maxF = Math.round((data.daily?.temperature_2m_max?.[0] ?? c.temperature) * 9/5 + 32), 
        minF = Math.round((data.daily?.temperature_2m_min?.[0] ?? c.temperature) * 9/5 + 32), 
        windMph = Math.round((c.windspeed || 0) / 1.609); 
  
  if (weatherElements.icon) weatherElements.icon.textContent = sum.icon; 
  if (weatherElements.temp) weatherElements.temp.textContent = `${tempF}°`; 
  if (weatherElements.description) weatherElements.description.textContent = sum.text; 
  if (weatherElements.feels) weatherElements.feels.textContent = `Feels like ${feelsF}°`; 
  if (weatherElements.wind) weatherElements.wind.textContent = `Wind ${windMph} mph`; 
  if (weatherElements.range) weatherElements.range.textContent = `High ${maxF}° / Low ${minF}°`; 
  if (weatherElements.updated) weatherElements.updated.textContent = `Updated ${new Date().toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}`; 
  
  // Render sunrise/sunset info
  renderSunInfo(data, c.weathercode);
  
  updateWeatherTitle(); 
}

async function updateWeather(pos, opts = {}) { /* Update weather, uses cache */ if (!pos) return setWeatherPlaceholder('Provide location for forecast.'); const key = `${pos.lat.toFixed(3)}|${pos.lng.toFixed(3)}`, now = Date.now(); if (!opts.force && cachedWeather && lastWeatherCoords === key && (now - lastWeatherFetch) < WEATHER_CACHE_MS) return renderWeather(cachedWeather); showWeatherLoading('Updating forecast...'); try { const data = await fetchWeatherData(pos); cachedWeather = data; lastWeatherCoords = key; lastWeatherFetch = now; renderWeather(data); } catch (err) { console.error('Weather update failed', err); setWeatherPlaceholder('Unable to retrieve weather.'); } }

// --- Local Alerts (HolidayAPI Integration) ---
let lastAlertsCheck = 0;
const ALERTS_CACHE_MS = 60 * 60 * 1000; // 1 hour

// --- What3Words Integration ---
async function fetchWhat3Words(lat, lng) {
  const apiKey = window.WHAT3WORDS_API_KEY || 'TKIBT03V';
  if (!apiKey) {
    console.warn('What3Words API key missing');
    return null;
  }

  try {
    const url = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${lat},${lng}&key=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('What3Words API request failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data.words) {
      return `///${data.words}`;
    }
    
    return null;
  } catch (err) {
    console.error('Failed to fetch What3Words:', err);
    return null;
  }
}

// --- FourSquare Integration ---
async function searchFourSquareNearby(lat, lng, query = '', limit = 20) {
  const apiKey = window.FOURSQUARE_API_KEY || 'XQJYSPSBDRKOYXOXD1T0UWQX0OBO5HPLHSGDVMYDGQ3KOJ43';
  if (!apiKey) {
    console.warn('FourSquare API key missing');
    return [];
  }

  try {
    const params = new URLSearchParams({
      ll: `${lat},${lng}`,
      limit: limit.toString(),
      radius: '5000' // 5km radius
    });
    
    if (query) {
      params.append('query', query);
    }
    
    const url = `https://api.foursquare.com/v3/places/search?${params}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('FourSquare API request failed:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    if (data.results && Array.isArray(data.results)) {
      return data.results.map(place => ({
        fsq_id: place.fsq_id,
        name: place.name,
        category: place.categories?.[0]?.name || 'Place',
        address: place.location?.formatted_address || '',
        distance: place.distance,
        lat: place.geocodes?.main?.latitude,
        lng: place.geocodes?.main?.longitude
      }));
    }
    
    return [];
  } catch (err) {
    console.error('Failed to fetch FourSquare data:', err);
    return [];
  }
}

async function getFourSquareDetails(fsqId) {
  const apiKey = window.FOURSQUARE_API_KEY || 'XQJYSPSBDRKOYXOXD1T0UWQX0OBO5HPLHSGDVMYDGQ3KOJ43';
  if (!apiKey || !fsqId) return null;

  try {
    const url = `https://api.foursquare.com/v3/places/${fsqId}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('FourSquare details request failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    return {
      name: data.name,
      description: data.description,
      rating: data.rating,
      price: data.price,
      hours: data.hours,
      website: data.website,
      tel: data.tel,
      photos: data.photos
    };
  } catch (err) {
    console.error('Failed to fetch FourSquare details:', err);
    return null;
  }
}

async function fetchLocalAlerts(countryCode = 'US') {
  const apiKey = window.HOLIDAY_API_KEY || '6e53a0df-74ca-4513-9971-0d3bf189ca12';
  if (!apiKey) {
    console.warn('HolidayAPI key missing');
    return [];
  }

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Fetch holidays for current month
    const url = `https://holidayapi.com/v1/holidays?key=${apiKey}&country=${countryCode}&year=${year}&month=${month}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('HolidayAPI request failed:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    if (data.status !== 200 || !data.holidays) {
      console.warn('Invalid HolidayAPI response');
      return [];
    }

    // Filter for upcoming holidays (next 7 days) that could disrupt travel
    const today = now.getTime();
    const weekFromNow = today + (7 * 24 * 60 * 60 * 1000);
    
    const upcomingAlerts = data.holidays.filter(holiday => {
      const holidayDate = new Date(holiday.date).getTime();
      return holidayDate >= today && holidayDate <= weekFromNow && holiday.public === true;
    }).map(holiday => ({
      title: holiday.name,
      date: holiday.date,
      description: `Public holiday - ${holiday.name}. Expect increased traffic and closures.`,
      type: 'holiday'
    }));

    return upcomingAlerts;
  } catch (err) {
    console.error('Failed to fetch local alerts:', err);
    return [];
  }
}

function renderAlerts(alerts) {
  const widget = $("localAlertsWidget");
  const content = $("alertsContent");
  
  if (!widget || !content) return;
  
  if (!alerts || alerts.length === 0) {
    widget.style.display = 'none';
    return;
  }
  
  widget.style.display = 'block';
  content.innerHTML = '';
  
  alerts.forEach(alert => {
    const item = document.createElement('div');
    item.className = 'alert-item';
    
    const title = document.createElement('div');
    title.className = 'alert-item-title';
    title.textContent = alert.title;
    item.appendChild(title);
    
    const desc = document.createElement('div');
    desc.className = 'alert-item-desc';
    desc.textContent = alert.description;
    item.appendChild(desc);
    
    if (alert.date) {
      const dateEl = document.createElement('div');
      dateEl.className = 'alert-item-date';
      dateEl.textContent = new Date(alert.date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
      item.appendChild(dateEl);
    }
    
    content.appendChild(item);
  });
}

async function updateLocalAlerts(countryCode = 'US', force = false) {
  const now = Date.now();
  
  if (!force && (now - lastAlertsCheck) < ALERTS_CACHE_MS) {
    return; // Use cache
  }
  
  try {
    const alerts = await fetchLocalAlerts(countryCode);
    renderAlerts(alerts);
    lastAlertsCheck = now;
  } catch (err) {
    console.error('Failed to update local alerts:', err);
  }
}

function initAlertsControls() {
  const refreshBtn = $("refreshAlertsBtn");
  if (refreshBtn) {
    refreshBtn.onclick = () => updateLocalAlerts('US', true);
  }
}

function initWeatherControls() { /* Attach listeners for weather */ const refBtn = $("refreshWeatherBtn"); if (refBtn) refBtn.onclick = () => {if (currentPosition) updateWeather(currentPosition, { force: true });}; updateWeatherTitle(); const tglBtn = $("toggleWeatherBtn"), wWidget = $("weatherWidget"); if (tglBtn && wWidget) { const isMin = localStorage.getItem('weatherMinimized') === 'true'; wWidget.classList.toggle('weather-minimized', isMin); tglBtn.onclick = () => { const nowMin = wWidget.classList.toggle('weather-minimized'); localStorage.setItem('weatherMinimized', nowMin ? 'true' : 'false'); }; } }

