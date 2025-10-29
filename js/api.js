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
  const emoji = eventType === 'sunset' ? '🌇' : '🌅';
  
  // Update UI
  sunCountdown.textContent = `${emoji} ${formattedTime} till ${nextEvent}`;
  sunMessage.textContent = getContextualSunMessage(eventType, minutesRemaining, weatherCode, isClear);
  sunInfoContainer.style.display = 'block';
}

async function fetchWeatherData(pos) { /* Fetch from Open-Meteo */ 
  const p = new URLSearchParams({ 
    latitude: pos.lat.toFixed(4), 
    longitude: pos.lng.toFixed(4), 
    current_weather: 'true', 
    hourly: 'apparent_temperature', 
    daily: 'temperature_2m_max,temperature_2m_min,sunrise,sunset,weathercode,precipitation_sum,windspeed_10m_max', 
    timezone: 'auto',
    forecast_days: 7
  }); 
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?${p}`); 
  if (!r.ok) throw new Error('Weather fetch failed'); 
  return r.json(); 
}

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
  
  // Display historical weather facts if available
  if (data.daily && currentPosition) {
    displayHistoricalWeatherFacts(data.daily, c.temperature, c.weathercode === 61 || c.weathercode === 63 || c.weathercode === 65);
  }
}

async function updateWeather(pos, opts = {}) { /* Update weather, uses cache */ if (!pos) return setWeatherPlaceholder('Provide location for forecast.'); const key = `${pos.lat.toFixed(3)}|${pos.lng.toFixed(3)}`, now = Date.now(); if (!opts.force && cachedWeather && lastWeatherCoords === key && (now - lastWeatherFetch) < WEATHER_CACHE_MS) { renderWeather(cachedWeather); updateBirdFact(pos); return; } showWeatherLoading('Updating forecast...'); try { const data = await fetchWeatherData(pos); cachedWeather = data; lastWeatherCoords = key; lastWeatherFetch = now; renderWeather(data); updateBirdFact(pos); } catch (err) { console.error('Weather update failed', err); setWeatherPlaceholder('Unable to retrieve weather.'); } }

function displayHistoricalWeatherFacts(dailyData, currentTemp, isRaining) {
  const factsContainer = document.getElementById('historicalWeatherFacts');
  if (!factsContainer) return;
  
  // Simple historical comparison using available data
  const temps = dailyData.temperature_2m_max || [];
  if (temps.length < 7) {
    factsContainer.style.display = 'none';
    return;
  }
  
  const currentTempF = Math.round(currentTemp * 9/5 + 32);
  const avgTemp = temps.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
  const avgTempF = Math.round(avgTemp * 9/5 + 32);
  
  const facts = [];
  
  // Temperature comparison
  if (currentTempF > avgTempF + 10) {
    facts.push(`🔥 Warmer than usual - ${currentTempF}°F vs ${avgTempF}°F average`);
  } else if (currentTempF < avgTempF - 10) {
    facts.push(`❄️ Cooler than usual - ${currentTempF}°F vs ${avgTempF}°F average`);
  }
  
  // Rain patterns
  if (isRaining) {
    facts.push(`💧 Rainy day ahead - stay dry!`);
  }
  
  if (facts.length > 0) {
    factsContainer.textContent = facts.join(' • ');
    factsContainer.style.display = 'block';
  } else {
    factsContainer.style.display = 'none';
  }
}

function showWeeklyForecast() {
  if (!cachedWeather || !cachedWeather.daily) {
    alert('No forecast data available. Please wait for weather to load.');
    return;
  }
  
  const modal = document.getElementById('forecastModal');
  const content = document.getElementById('forecastContent');
  
  if (!modal || !content) return;
  
  content.innerHTML = '';
  
  const daily = cachedWeather.daily;
  const days = Math.min(7, daily.time.length);
  
  for (let i = 0; i < days; i++) {
    const date = new Date(daily.time[i]);
    const dayName = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
    const maxTempF = Math.round(daily.temperature_2m_max[i] * 9/5 + 32);
    const minTempF = Math.round(daily.temperature_2m_min[i] * 9/5 + 32);
    const weatherCode = daily.weathercode?.[i] || 0;
    const precip = daily.precipitation_sum?.[i] || 0;
    const windSpeed = daily.windspeed_10m_max?.[i] || 0;
    const windMph = Math.round(windSpeed / 1.609);
    const summary = weatherCodeToSummary(weatherCode);
    
    const dayCard = document.createElement('div');
    dayCard.className = 'forecast-day-card';
    dayCard.innerHTML = `
      <div class="forecast-day-name">${dayName}</div>
      <div class="forecast-day-date">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
      <div class="forecast-day-icon">${summary.icon}</div>
      <div class="forecast-day-desc">${summary.text}</div>
      <div class="forecast-day-temp">${maxTempF}° / ${minTempF}°</div>
      ${precip > 0 ? `<div class="forecast-day-precip">💧 ${precip.toFixed(1)}mm</div>` : ''}
      ${windMph > 10 ? `<div class="forecast-day-wind">💨 ${windMph} mph</div>` : ''}
    `;
    
    content.appendChild(dayCard);
  }
  
  modal.classList.add('active');
  document.body.classList.add('modal-open');
}

function closeForecastModal() {
  const modal = document.getElementById('forecastModal');
  if (modal) {
    closeOverlayElement(modal);
  }
}

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

function initWeatherControls() { 
  /* Attach listeners for weather */ 
  const refBtn = $("refreshWeatherBtn"); 
  if (refBtn) refBtn.onclick = () => {if (currentPosition) updateWeather(currentPosition, { force: true });}; 
  
  const forecastBtn = $("forecastBtn");
  if (forecastBtn) forecastBtn.onclick = showWeeklyForecast;
  
  updateWeatherTitle(); 
  
  const tglBtn = $("toggleWeatherBtn"), wWidget = $("weatherWidget"); 
  if (tglBtn && wWidget) { 
    const isMin = localStorage.getItem('weatherMinimized') === 'true'; 
    wWidget.classList.toggle('weather-minimized', isMin); 
    tglBtn.onclick = () => { 
      const nowMin = wWidget.classList.toggle('weather-minimized'); 
      localStorage.setItem('weatherMinimized', nowMin ? 'true' : 'false'); 
    }; 
  } 
}

// --- eBird Integration ---
let lastBirdFactFetch = 0;
const BIRD_FACT_CACHE_MS = 30 * 60 * 1000; // 30 minutes
let cachedBirdFact = null;

async function fetchRecentBirdSightings(lat, lng) {
  const apiKey = window.EBIRD_API_KEY || 'h7b2pv30dr1t';
  if (!apiKey) {
    console.warn('eBird API key missing');
    return null;
  }

  try {
    const url = `https://api.ebird.org/v2/data/obs/geo/recent?lat=${lat}&lng=${lng}&dist=25&maxResults=5`;
    const response = await fetch(url, {
      headers: {
        'X-eBirdApiToken': apiKey
      }
    });
    
    if (!response.ok) {
      console.error('eBird API request failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      // Pick a random bird from the recent sightings
      const randomBird = data[Math.floor(Math.random() * data.length)];
      const birdName = randomBird.comName;
      const count = randomBird.howMany || 1;
      const date = new Date(randomBird.obsDt);
      const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      const timeStr = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
      
      // Calculate distance if location data is available
      let distanceStr = '';
      if (randomBird.lat && randomBird.lng && currentPosition) {
        const distance = calculateDistance(lat, lng, randomBird.lat, randomBird.lng);
        if (distance < 1) {
          distanceStr = ` - ${(distance * 1000).toFixed(0)}m away`;
        } else {
          distanceStr = ` - ${distance.toFixed(1)}km away`;
        }
      }
      
      return `🐦 ${birdName} (${count}) spotted ${timeStr}${distanceStr}`;
    }
    
    return null;
  } catch (err) {
    console.error('Failed to fetch bird sightings:', err);
    return null;
  }
}

// Calculate distance between two coordinates in kilometers (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function updateBirdFact(pos, force = false) {
  const now = Date.now();
  const birdFactEnabled = localStorage.getItem('birdFactsEnabled') !== 'false';
  
  if (!birdFactEnabled) {
    return;
  }
  
  if (!force && cachedBirdFact && (now - lastBirdFactFetch) < BIRD_FACT_CACHE_MS) {
    displayBirdFact(cachedBirdFact);
    return;
  }
  
  if (!pos) return;
  
  try {
    const fact = await fetchRecentBirdSightings(pos.lat, pos.lng);
    if (fact) {
      cachedBirdFact = fact;
      lastBirdFactFetch = now;
      displayBirdFact(fact);
    }
  } catch (err) {
    console.error('Failed to update bird fact:', err);
  }
}

function displayBirdFact(fact) {
  if (!fact) return;
  
  let factContainer = document.getElementById('birdFactContainer');
  if (!factContainer) {
    // Create container if it doesn't exist
    const weatherWidget = document.getElementById('weatherWidget');
    if (!weatherWidget) return;
    
    factContainer = document.createElement('div');
    factContainer.id = 'birdFactContainer';
    factContainer.style.cssText = 'margin-top: 0.5rem; padding: 0.5rem; background: rgba(255,255,255,0.1); border-radius: 8px; font-size: 0.85rem; color: var(--text-dark); cursor: pointer;';
    
    // Add click handler to open bird reporting
    factContainer.onclick = () => openBirdReportModal();
    factContainer.title = 'Click to report a bird sighting';
    
    weatherWidget.appendChild(factContainer);
  }
  
  factContainer.textContent = fact;
}

// Bird Reporting Feature
function openBirdReportModal() {
  if (!currentPosition) {
    alert('Location is required to report a bird sighting.');
    return;
  }
  
  const birdName = prompt('What bird did you see? (Enter the common name)');
  if (!birdName || birdName.trim() === '') return;
  
  const countStr = prompt('How many did you see?', '1');
  const count = parseInt(countStr) || 1;
  
  if (confirm(`Report sighting of ${count} ${birdName}?\n\nNote: This will be saved locally. To contribute to eBird network, visit ebird.org`)) {
    saveBirdSighting({
      bird: birdName.trim(),
      count: count,
      lat: currentPosition.lat,
      lng: currentPosition.lng,
      timestamp: new Date().toISOString(),
      location: latestLocationLabel || `${currentPosition.lat.toFixed(4)}, ${currentPosition.lng.toFixed(4)}`
    });
    
    alert(`✅ Thank you! Your sighting of ${count} ${birdName} has been recorded.\n\nTo officially contribute to the eBird network, please also submit your observation at ebird.org`);
  }
}

function saveBirdSighting(sighting) {
  try {
    const sightings = JSON.parse(localStorage.getItem('birdSightings') || '[]');
    sightings.push(sighting);
    
    // Keep only last 100 sightings
    if (sightings.length > 100) {
      sightings.shift();
    }
    
    localStorage.setItem('birdSightings', JSON.stringify(sightings));
  } catch (err) {
    console.error('Failed to save bird sighting:', err);
  }
}

function getBirdSightings() {
  try {
    return JSON.parse(localStorage.getItem('birdSightings') || '[]');
  } catch (err) {
    console.error('Failed to retrieve bird sightings:', err);
    return [];
  }
}

  }
  
  factContainer.textContent = fact;
}

// --- Brewery Search Integration ---
async function searchBreweries(lat, lng, query = '') {
  try {
    let url;
    if (query) {
      url = `https://api.openbrewerydb.org/v1/breweries/search?query=${encodeURIComponent(query)}&per_page=20`;
    } else {
      url = `https://api.openbrewerydb.org/v1/breweries?by_dist=${lat},${lng}&per_page=20`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Brewery API request failed:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    return data.map(brewery => ({
      id: brewery.id,
      name: brewery.name,
      brewery_type: brewery.brewery_type,
      address: `${brewery.street || ''} ${brewery.city || ''}, ${brewery.state || ''}`.trim(),
      phone: brewery.phone,
      website: brewery.website_url,
      lat: parseFloat(brewery.latitude),
      lng: parseFloat(brewery.longitude),
      distance: brewery.latitude && brewery.longitude ? 
        calculateDistance(lat, lng, parseFloat(brewery.latitude), parseFloat(brewery.longitude)) : null
    })).filter(b => b.lat && b.lng); // Only return breweries with coordinates
  } catch (err) {
    console.error('Failed to fetch breweries:', err);
    return [];
  }
}

// --- Recreation.gov Integration ---
async function searchRecreationAreas(lat, lng, radius = 50) {
  const apiKey = window.RECREATION_GOV_API_KEY || 'd40a1208-c6a3-405c-8e53-bd1815fb39c7';
  if (!apiKey) {
    console.warn('Recreation.gov API key missing');
    return [];
  }

  try {
    const url = `https://ridb.recreation.gov/api/v1/facilities?latitude=${lat}&longitude=${lng}&radius=${radius}&limit=20`;
    const response = await fetch(url, {
      headers: {
        'apikey': apiKey
      }
    });
    
    if (!response.ok) {
      console.error('Recreation.gov API request failed:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    if (data.RECDATA && Array.isArray(data.RECDATA)) {
      return data.RECDATA.map(facility => ({
        id: facility.FacilityID,
        name: facility.FacilityName,
        description: facility.FacilityDescription,
        address: facility.FacilityAddress1 || '',
        city: facility.FacilityCity || '',
        state: facility.FacilityState || '',
        lat: parseFloat(facility.FacilityLatitude),
        lng: parseFloat(facility.FacilityLongitude),
        phone: facility.FacilityPhone,
        email: facility.FacilityEmail,
        reservationUrl: facility.FacilityReservationURL,
        activities: facility.ACTIVITY || []
      }));
    }
    
    return [];
  } catch (err) {
    console.error('Failed to fetch recreation areas:', err);
    return [];
  }
}

// --- National Park Service Integration ---
async function searchNationalParks(lat, lng, radius = 100) {
  const apiKey = window.NPS_API_KEY || 'IVyLNL0apimJEjLpx0c78KFtCco2Ka8zlLGY5eMO';
  if (!apiKey) {
    console.warn('National Park Service API key missing');
    return [];
  }

  try {
    const url = `https://developer.nps.gov/api/v1/parks?limit=10&api_key=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('NPS API request failed:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    if (data.data && Array.isArray(data.data)) {
      // Filter by distance if coordinates are available
      return data.data
        .filter(park => park.latitude && park.longitude)
        .map(park => {
          const parkLat = parseFloat(park.latitude);
          const parkLng = parseFloat(park.longitude);
          const distance = calculateDistance(lat, lng, parkLat, parkLng);
          
          return {
            id: park.id,
            parkCode: park.parkCode,
            name: park.fullName,
            description: park.description,
            designation: park.designation,
            lat: parkLat,
            lng: parkLng,
            distance: distance,
            url: park.url,
            activities: park.activities || [],
            topics: park.topics || [],
            states: park.states,
            directionsInfo: park.directionsInfo,
            directionsUrl: park.directionsUrl,
            weatherInfo: park.weatherInfo,
            images: park.images || []
          };
        })
        .filter(park => park.distance < radius * 1000) // Convert km to meters
        .sort((a, b) => a.distance - b.distance);
    }
    
    return [];
  } catch (err) {
    console.error('Failed to fetch national parks:', err);
    return [];
  }
}

async function getNPSParkEvents(parkCode) {
  const apiKey = window.NPS_API_KEY || 'IVyLNL0apimJEjLpx0c78KFtCco2Ka8zlLGY5eMO';
  if (!apiKey || !parkCode) return [];

  try {
    const url = `https://developer.nps.gov/api/v1/events?parkCode=${parkCode}&api_key=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('NPS Events API request failed:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    if (data.data && Array.isArray(data.data)) {
      return data.data.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        dateStart: event.datestart,
        dateEnd: event.dateend,
        times: event.times || [],
        category: event.category,
        tags: event.tags || []
      }));
    }
    
    return [];
  } catch (err) {
    console.error('Failed to fetch NPS events:', err);
    return [];
  }
}

// --- Marine Weather Detection ---
function isNearOcean(lat, lng) {
  // Simple coastline detection - check if within 50km of known coastal coordinates
  // This is a simplified approach. In production, you'd use a more sophisticated method
  // or a dedicated API
  
  // For now, we'll use a basic heuristic:
  // Check if the location is in a coastal state/region
  // This could be enhanced with actual distance-to-coast calculations
  
  return false; // Placeholder - would need proper implementation
}

async function fetchMarineWeather(lat, lng) {
  try {
    const params = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      current: 'wave_height,wave_direction,wave_period',
      hourly: 'wave_height,wave_direction,wave_period',
      timezone: 'auto'
    });
    
    const response = await fetch(`https://marine-api.open-meteo.com/v1/marine?${params}`);
    
    if (!response.ok) {
      console.error('Marine weather API request failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Failed to fetch marine weather:', err);
    return null;
  }
}

// --- Historical Weather Data ---
async function fetchHistoricalWeather(lat, lng) {
  try {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setFullYear(startDate.getFullYear() - 10); // Get 10 years of history
    
    const params = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      start_date: startDate.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0],
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
      timezone: 'auto'
    });
    
    const response = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`);
    
    if (!response.ok) {
      console.error('Historical weather API request failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Failed to fetch historical weather:', err);
    return null;
  }
}

function analyzeHistoricalWeather(historicalData, currentTemp, currentPrecip) {
  if (!historicalData || !historicalData.daily) return null;
  
  const today = new Date();
  const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  // Filter data for same date in previous years
  const sameDateData = [];
  historicalData.daily.time.forEach((dateStr, index) => {
    if (dateStr.includes(monthDay)) {
      sameDateData.push({
        year: dateStr.split('-')[0],
        maxTemp: historicalData.daily.temperature_2m_max[index],
        minTemp: historicalData.daily.temperature_2m_min[index],
        precip: historicalData.daily.precipitation_sum[index]
      });
    }
  });
  
  if (sameDateData.length === 0) return null;
  
  const facts = [];
  
  // Temperature analysis
  const maxTemps = sameDateData.map(d => d.maxTemp).filter(t => t !== null);
  if (maxTemps.length > 0) {
    const historicalMax = Math.max(...maxTemps);
    const historicalMin = Math.min(...maxTemps);
    const currentTempF = Math.round(currentTemp * 9/5 + 32);
    const historicalMaxF = Math.round(historicalMax * 9/5 + 32);
    const historicalMinF = Math.round(historicalMin * 9/5 + 32);
    
    if (currentTempF >= historicalMaxF - 2) {
      facts.push(`🔥 ${currentTempF}°F today - tied for the hottest ${monthDay} on record!`);
    } else if (currentTempF <= historicalMinF + 2) {
      facts.push(`❄️ ${currentTempF}°F today - one of the coldest ${monthDay} days!`);
    }
  }
  
  // Precipitation analysis
  const precipData = sameDateData.filter(d => d.precip && d.precip > 0);
  if (currentPrecip && currentPrecip > 0) {
    if (precipData.length > 0) {
      const lastRainYear = precipData[precipData.length - 1].year;
      const yearsAgo = today.getFullYear() - parseInt(lastRainYear);
      if (yearsAgo > 1) {
        facts.push(`💧 Rain today - last time it rained on ${monthDay} was ${yearsAgo} years ago!`);
      }
    }
  } else if (precipData.length > 0) {
    const recentRain = precipData[precipData.length - 1];
    const yearsAgo = today.getFullYear() - parseInt(recentRain.year);
    if (yearsAgo >= 1) {
      facts.push(`☀️ Dry today - it rained on ${monthDay} ${yearsAgo} year${yearsAgo > 1 ? 's' : ''} ago`);
    }
  }
  
  return facts.length > 0 ? facts : null;
}

