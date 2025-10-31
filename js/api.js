// ===== API Caching Utilities =====

/**
 * Helper function to evict oldest cache entry when size limit is reached
 */
function evictOldestCacheEntry(cache, maxSize) {
  if (cache.size > maxSize) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

/**
 * Helper function to generate standardized cache keys
 */
function generateLocationCacheKey(lat, lng, ...params) {
  // Round to 2 decimal places (~1.1km precision) for general location-based caching
  const latKey = lat.toFixed(2);
  const lngKey = lng.toFixed(2);
  return [latKey, lngKey, ...params].join(',');
}

/**
 * Helper function to check if cached data is still valid
 */
function isCacheValid(cached, maxAge) {
  return cached && (Date.now() - cached.timestamp < maxAge);
}

/**
 * Helper function to safely parse JSON responses
 * Checks content-type before parsing to avoid errors when HTML is returned
 * @param {Response} response - Fetch API response object
 * @returns {Promise<any>} Parsed JSON data or null if not JSON
 */
async function safeParseJSON(response) {
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    console.warn('Response is not JSON, content-type:', contentType);
    return null;
  }
  try {
    return await response.json();
  } catch (err) {
    console.error('Failed to parse JSON response:', err);
    return null;
  }
}

// ===== API Caches =====

// Cache for event searches
let eventSearchCache = new Map();
const EVENT_SEARCH_CACHE_MS = 30 * 60 * 1000; // 30 minutes cache

// ===== Unified Search Feature =====

/**
 * Perform a unified search across multiple API sources
 * @param {string} query - Search query from user
 * @returns {Promise<void>}
 */
async function performUnifiedSearch(query) {
  if (!query || query.trim().length === 0) {
    alert('Please enter a search term.');
    return;
  }
  
  if (!currentPosition) {
    alert('Please enable location services to search.');
    return;
  }
  
  const searchTerm = query.trim();
  console.log(`Performing unified search for: "${searchTerm}"`);
  
  // Show loading state
  const resultsModal = $("resultsModal");
  const resultsList = $("resultsList");
  const resultsTitle = $("resultsTitle");
  
  if (!resultsModal || !resultsList || !resultsTitle) {
    console.error('Results modal elements not found');
    return;
  }
  
  resultsTitle.textContent = `Searching for "${searchTerm}"...`;
  resultsList.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--card);">🔍 Searching all sources...</div>';
  resultsModal.classList.add('active');
  document.body.classList.add('modal-open');
  
  // Prepare parallel API calls
  const apiCalls = [];
  const results = {
    foursquare: [],
    nps: [],
    recreation: [],
    ticketmaster: []
  };
  
  // Foursquare Search
  apiCalls.push(
    fetch(`${window.NETLIFY_FUNCTIONS_BASE}/foursquare?query=${encodeURIComponent(searchTerm)}&ll=${currentPosition.lat},${currentPosition.lng}`)
      .then(res => res.json())
      .then(data => {
        if (data.results && Array.isArray(data.results)) {
          results.foursquare = data.results.map(place => normalizePlaceData(place, 'foursquare'));
        }
      })
      .catch(err => console.warn('Foursquare search failed:', err))
  );
  
  // National Park Service Search
  apiCalls.push(
    fetch(`${window.NETLIFY_FUNCTIONS_BASE}/nps?query=${encodeURIComponent(searchTerm)}&lat=${currentPosition.lat}&lng=${currentPosition.lng}`)
      .then(res => res.json())
      .then(data => {
        if (data.data && Array.isArray(data.data)) {
          results.nps = data.data.map(place => ({
            id: place.id,
            provider: 'nps',
            name: place.fullName || place.name,
            address: place.addresses?.[0]?.line1 || '',
            location: place.latitude && place.longitude ? {
              lat: parseFloat(place.latitude),
              lng: parseFloat(place.longitude)
            } : null,
            rating: null,
            categories: ['National Park Service'],
            _original: place
          }));
        }
      })
      .catch(err => console.warn('NPS search failed:', err))
  );
  
  // Recreation.gov Search
  apiCalls.push(
    fetch(`${window.NETLIFY_FUNCTIONS_BASE}/recreation?query=${encodeURIComponent(searchTerm)}&lat=${currentPosition.lat}&lng=${currentPosition.lng}`)
      .then(res => res.json())
      .then(data => {
        if (data.RECDATA && Array.isArray(data.RECDATA)) {
          results.recreation = data.RECDATA.map(place => ({
            id: place.RecAreaID || place.FacilityID,
            provider: 'recreation',
            name: place.RecAreaName || place.FacilityName,
            address: place.RecAreaDescription || '',
            location: place.RecAreaLatitude && place.RecAreaLongitude ? {
              lat: parseFloat(place.RecAreaLatitude),
              lng: parseFloat(place.RecAreaLongitude)
            } : null,
            rating: null,
            categories: ['Recreation Area'],
            _original: place
          }));
        }
      })
      .catch(err => console.warn('Recreation.gov search failed:', err))
  );
  
  // Ticketmaster Events Search
  apiCalls.push(
    fetch(`${window.NETLIFY_FUNCTIONS_BASE}/ticketmaster?keyword=${encodeURIComponent(searchTerm)}&latlong=${currentPosition.lat},${currentPosition.lng}&radius=25&unit=miles`)
      .then(res => res.json())
      .then(data => {
        if (data._embedded && data._embedded.events) {
          results.ticketmaster = data._embedded.events.map(event => ({
            id: event.id,
            provider: 'ticketmaster',
            name: event.name,
            address: event._embedded?.venues?.[0]?.address?.line1 || '',
            location: event._embedded?.venues?.[0]?.location ? {
              lat: parseFloat(event._embedded.venues[0].location.latitude),
              lng: parseFloat(event._embedded.venues[0].location.longitude)
            } : null,
            rating: null,
            categories: ['Event'],
            date: event.dates?.start?.localDate,
            _original: event
          }));
        }
      })
      .catch(err => console.warn('Ticketmaster search failed:', err))
  );
  
  // Wait for all API calls to complete
  await Promise.allSettled(apiCalls);
  
  // Merge all results
  const allResults = [
    ...results.foursquare,
    ...results.nps,
    ...results.recreation,
    ...results.ticketmaster
  ].filter(item => item && item.name && item.location);
  
  // Deduplicate results
  const deduplicatedResults = deduplicatePlaces(allResults);
  
  // Sort by distance if we have locations
  if (currentPosition) {
    deduplicatedResults.forEach(place => {
      if (place.location) {
        place.distance = calculateDistance(
          currentPosition.lat,
          currentPosition.lng,
          place.location.lat,
          place.location.lng
        );
      }
    });
    deduplicatedResults.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
  }
  
  // Update current results for the app
  currentResults = deduplicatedResults;
  lastResultsTitle = `Results for "${searchTerm}"`;
  
  // Display results
  resultsTitle.textContent = `${deduplicatedResults.length} results for "${searchTerm}"`;
  
  if (deduplicatedResults.length === 0) {
    resultsList.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--card);">No results found. Try a different search term.</div>';
  } else {
    displayUnifiedResults(deduplicatedResults);
  }
}

/**
 * Display unified search results in the results modal
 * @param {Array} results - Array of normalized place objects
 */
function displayUnifiedResults(results) {
  const resultsList = $("resultsList");
  if (!resultsList) return;
  
  resultsList.innerHTML = '';
  
  results.forEach((place, index) => {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.style.cursor = 'pointer';
    
    const providerBadge = place.provider ? `<span style="background:var(--accent); color:var(--text-light); padding:0.2rem 0.4rem; border-radius:4px; font-size:0.7rem; font-weight:600; text-transform:uppercase;">${place.provider}</span>` : '';
    
    const distanceText = place.distance ? `${(place.distance / 1000).toFixed(1)} km away` : '';
    
    const categoryText = place.categories && place.categories.length > 0 
      ? place.categories.slice(0, 2).join(', ') 
      : '';
    
    const dateText = place.date ? `<div style="color:var(--primary); font-weight:600;">📅 ${new Date(place.date).toLocaleDateString()}</div>` : '';
    
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:0.5rem;">
        <h4 style="margin:0; color:var(--card); font-size:1.05rem;">${place.name}</h4>
        ${providerBadge}
      </div>
      ${dateText}
      ${place.address ? `<p style="margin:0.25rem 0; color:var(--card); opacity:0.8; font-size:0.9rem;">${place.address}</p>` : ''}
      ${categoryText ? `<p style="margin:0.25rem 0; color:var(--accent); font-size:0.85rem;">${categoryText}</p>` : ''}
      ${distanceText ? `<p style="margin:0.25rem 0; color:var(--primary); font-size:0.85rem; font-weight:600;">${distanceText}</p>` : ''}
    `;
    
    card.onclick = () => {
      // For events, open the event URL; for places, show place details
      if (place.provider === 'ticketmaster' && place._original && place._original.url) {
        window.open(place._original.url, '_blank');
      } else if (place.id) {
        showDetails(place.id, place.provider);
      }
    };
    
    resultsList.appendChild(card);
  });
}

async function searchLocalEvents(item) { /* Fetch events from Ticketmaster */
      if (!currentPosition) return alert('Please provide a location first.');
      const classification = (item.value && item.value !== 'all') ? item.value : '';
      
      // Create cache key
      const cacheKey = generateLocationCacheKey(currentPosition.lat, currentPosition.lng, classification);
      
      // Check cache first
      const cached = eventSearchCache.get(cacheKey);
      if (isCacheValid(cached, EVENT_SEARCH_CACHE_MS)) {
        console.log('Using cached event results');
        displayEventResults(cached.events, item.name);
        return;
      }
      
      // Reduced radius to 25 miles for local events
      const params = new URLSearchParams({
        latlong: `${currentPosition.lat},${currentPosition.lng}`,
        radius: '25',
        unit: 'miles'
      });
      if (classification) {
        params.append('classificationName', classification);
      }
      const url = `${window.NETLIFY_FUNCTIONS_BASE}/ticketmaster?${params}`;
      try {
        const resp = await fetch(url); 
        const data = await resp.json();
        const events = (data._embedded && data._embedded.events) || [];
        
        // Cache the results
        eventSearchCache.set(cacheKey, {
          events: events,
          timestamp: Date.now()
        });
        evictOldestCacheEntry(eventSearchCache, 20);
        
        displayEventResults(events, item.name); // Display events in results modal
      } catch (err) { console.error(err); alert('Unable to fetch events.'); }
    }

async function showSurpriseEvents() {
      if (!currentPosition) return alert('Please provide location first.');
      
      // Create cache key
      const cacheKey = generateLocationCacheKey(currentPosition.lat, currentPosition.lng, 'surprise');
      
      // Check cache first
      const cached = eventSearchCache.get(cacheKey);
      if (isCacheValid(cached, EVENT_SEARCH_CACHE_MS)) {
        console.log('Using cached surprise events');
        const picks = sampleFromArray(cached.events, Math.min(6, cached.events.length));
        if (!picks.length) return alert('No events found for Surprise Me.');
        displayEventResults(picks, 'Surprise Mix');
        return;
      }
      
      // Reduced radius to 40 miles for surprise events
      const params = new URLSearchParams({
        latlong: `${currentPosition.lat},${currentPosition.lng}`,
        radius: '40',
        unit: 'miles',
        size: '40'
      });
      const url = `${window.NETLIFY_FUNCTIONS_BASE}/ticketmaster?${params}`;
      try {
        const resp = await fetch(url); 
        const data = await resp.json();
        const events = (data._embedded && data._embedded.events) || [];
        
        // Cache the results
        eventSearchCache.set(cacheKey, {
          events: events,
          timestamp: Date.now()
        });
        evictOldestCacheEntry(eventSearchCache, 20);
        
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

function getWeatherSaying(weatherCode, tempF, windMph) {
  /* Generate personality-filled weather sayings */
  const isHot = tempF > 85;
  const isCold = tempF < 40;
  const isWindy = windMph > 15;
  
  // Hot weather sayings
  if (isHot) {
    const hotSayings = [
      "It's a scorcher out there! ☀️",
      "Time to find some shade! 🌴",
      "Ice cream weather! 🍦",
      "Stay cool and hydrated! 💧"
    ];
    return hotSayings[Math.floor(Math.random() * hotSayings.length)];
  }
  
  // Cold weather sayings
  if (isCold) {
    const coldSayings = [
      "Bundle up, it's chilly! 🧣",
      "Perfect hot cocoa weather! ☕",
      "Winter vibes! ❄️",
      "Don't forget your coat! 🧥"
    ];
    return coldSayings[Math.floor(Math.random() * coldSayings.length)];
  }
  
  // Weather-specific sayings
  if ([0, 1].includes(weatherCode)) {
    return isWindy ? "Clear skies but hold onto your hat! 🎩" : "What a beautiful day! ✨";
  }
  if ([2, 3].includes(weatherCode)) {
    return "A bit cloudy, but still great for exploring! ☁️";
  }
  if ([45, 48].includes(weatherCode)) {
    return "Mysterious foggy vibes today! 🌫️";
  }
  if ([51, 53, 55, 61, 63, 65, 80, 82].includes(weatherCode)) {
    return "Rain or shine, adventure awaits! ☔";
  }
  if ([71, 73, 75].includes(weatherCode)) {
    return "Winter wonderland time! ⛄";
  }
  if ([95].includes(weatherCode)) {
    return "Thunderous weather! Stay safe indoors! ⚡";
  }
  
  // Default pleasant sayings
  const defaultSayings = [
    "Perfect day for an adventure! 🗺️",
    "Get out there and explore! 🧭",
    "The world is waiting for you! 🌍",
    "Make the most of today! 🌟"
  ];
  return defaultSayings[Math.floor(Math.random() * defaultSayings.length)];
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
  
  // Add weather saying
  const weatherSaying = getWeatherSaying(c.weathercode, tempF, windMph);
  if (weatherElements.description) weatherElements.description.textContent = `${sum.text} — ${weatherSaying}`; 
  
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

async function updateWeather(pos, opts = {}) { 
  /* Update weather, uses cache */ 
  if (!pos) return setWeatherPlaceholder('Provide location for forecast.'); 
  
  const key = `${pos.lat.toFixed(3)}|${pos.lng.toFixed(3)}`;
  const now = Date.now(); 
  
  if (!opts.force && cachedWeather && lastWeatherCoords === key && (now - lastWeatherFetch) < WEATHER_CACHE_MS) { 
    console.log('✅ Weather: Using cached data (Open-Meteo - FREE, no API key needed)');
    renderWeather(cachedWeather); 
    updateBirdFact(pos); 
    return; 
  } 
  
  showWeatherLoading('Updating forecast...'); 
  
  try { 
    console.log('🌤️ Weather: Fetching from Open-Meteo (FREE, no API key needed)...');
    const data = await fetchWeatherData(pos); 
    cachedWeather = data; 
    lastWeatherCoords = key; 
    lastWeatherFetch = now; 
    console.log('✅ Weather: Successfully loaded!');
    renderWeather(data); 
    updateBirdFact(pos); 
  } catch (err) { 
    console.error('❌ Weather: Update failed', err); 
    setWeatherPlaceholder('Unable to retrieve weather.'); 
  } 
}

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


// --- What3Words Integration ---
// Cache for What3Words results
let what3wordsCache = new Map();
const WHAT3WORDS_CACHE_MS = 60 * 60 * 1000; // 1 hour cache

async function fetchWhat3Words(lat, lng) {
  try {
    // Create cache key (round to 4 decimals for ~11m precision - more precise for W3W)
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    
    // Check cache first
    const cached = what3wordsCache.get(cacheKey);
    if (isCacheValid(cached, WHAT3WORDS_CACHE_MS)) {
      return cached.value;
    }
    
    const url = `${window.NETLIFY_FUNCTIONS_BASE}/what3words?lat=${lat}&lng=${lng}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('What3Words API request failed:', response.status);
      return null;
    }
    
    const data = await safeParseJSON(response);
    if (!data) {
      return null;
    }
    
    if (data.words) {
      const result = `///${data.words}`;
      // Cache the result
      what3wordsCache.set(cacheKey, {
        value: result,
        timestamp: Date.now()
      });
      evictOldestCacheEntry(what3wordsCache, 100);
      
      return result;
    }
    
    return null;
  } catch (err) {
    console.error('Failed to fetch What3Words:', err);
    return null;
  }
}

// --- FourSquare Integration ---
// Cache for Foursquare search results
let foursquareSearchCache = new Map();
let foursquareDetailsCache = new Map();
const FOURSQUARE_SEARCH_CACHE_MS = 15 * 60 * 1000; // 15 minutes
const FOURSQUARE_DETAILS_CACHE_MS = 60 * 60 * 1000; // 1 hour

async function searchFourSquareNearby(lat, lng, query = '', limit = 20) {
  try {
    // Create cache key (using 3 decimal precision for ~110m)
    const cacheKey = generateLocationCacheKey(lat, lng, query, limit.toString());
    
    // Check cache first
    const cached = foursquareSearchCache.get(cacheKey);
    if (isCacheValid(cached, FOURSQUARE_SEARCH_CACHE_MS)) {
      console.log('Using cached Foursquare search results');
      return cached.value;
    }
    
    const params = new URLSearchParams({
      endpoint: 'places/search',
      ll: `${lat},${lng}`,
      limit: limit.toString(),
      radius: '8046' // 5 miles radius in meters
    });
    
    if (query) {
      params.append('query', query);
    }
    
    const url = `${window.NETLIFY_FUNCTIONS_BASE}/foursquare?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('FourSquare API request failed:', response.status);
      return [];
    }
    
    const data = await safeParseJSON(response);
    if (!data) {
      return [];
    }
    
    const results = [];
    if (data.results && Array.isArray(data.results)) {
      data.results.forEach(place => {
        results.push({
          fsq_id: place.fsq_id,
          name: place.name,
          category: place.categories?.[0]?.name || 'Place',
          address: place.location?.formatted_address || '',
          distance: place.distance,
          lat: place.geocodes?.main?.latitude,
          lng: place.geocodes?.main?.longitude
        });
      });
    }
    
    // Cache the results
    foursquareSearchCache.set(cacheKey, {
      value: results,
      timestamp: Date.now()
    });
    evictOldestCacheEntry(foursquareSearchCache, 50);
    
    return results;
  } catch (err) {
    console.error('Failed to fetch FourSquare data:', err);
    return [];
  }
}

async function getFourSquareDetails(fsqId) {
  if (!fsqId) return null;

  try {
    // Check cache first
    const cached = foursquareDetailsCache.get(fsqId);
    if (isCacheValid(cached, FOURSQUARE_DETAILS_CACHE_MS)) {
      console.log('Using cached Foursquare details');
      return cached.value;
    }
    
    const params = new URLSearchParams({
      endpoint: `places/${fsqId}`
    });
    
    const url = `${window.NETLIFY_FUNCTIONS_BASE}/foursquare?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('FourSquare details request failed:', response.status);
      return null;
    }
    
    const data = await safeParseJSON(response);
    if (!data) {
      return null;
    }
    const details = {
      name: data.name,
      description: data.description,
      rating: data.rating,
      price: data.price,
      hours: data.hours,
      website: data.website,
      tel: data.tel,
      photos: data.photos
    };
    
    // Cache the details
    foursquareDetailsCache.set(fsqId, {
      value: details,
      timestamp: Date.now()
    });
    evictOldestCacheEntry(foursquareDetailsCache, 100);
    
    return details;
  } catch (err) {
    console.error('Failed to fetch FourSquare details:', err);
    return null;
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
  try {
    // Use 10km (~6 miles) for local bird sightings
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      dist: '10',
      maxResults: '5'
    });
    
    const url = `${window.NETLIFY_FUNCTIONS_BASE}/ebird?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('eBird API request failed:', response.status);
      
      // Check if it's an API key configuration error
      if (response.status === 500) {
        const errorData = await safeParseJSON(response);
        if (errorData && errorData.error && errorData.error.includes('API key not configured')) {
          console.warn('eBird API key not configured. Bird sightings feature disabled.');
          return 'configure-key';
        }
      }
      return null;
    }
    
    const data = await safeParseJSON(response);
    if (!data) {
      return null;
    }
    
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
        if (distance < 0.1) {
          distanceStr = ` - ${(distance * 5280).toFixed(0)}ft away`;
        } else {
          distanceStr = ` - ${distance.toFixed(1)} mi away`;
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

// Calculate distance between two coordinates in miles (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Radius of Earth in miles
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
    if (fact === 'configure-key') {
      // Show a helpful message when API key is not configured
      displayBirdFact('🐦 Bird sightings unavailable. To enable: Add EBIRD_API_KEY to your environment variables. Get a free key at ebird.org/api/keygen');
    } else if (fact) {
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
  
  const isConfigMessage = fact.includes('unavailable') || fact.includes('EBIRD_API_KEY');
  
  let factContainer = document.getElementById('birdFactContainer');
  if (!factContainer) {
    // Create container if it doesn't exist
    const weatherWidget = document.getElementById('weatherWidget');
    if (!weatherWidget) return;
    
    factContainer = document.createElement('div');
    factContainer.id = 'birdFactContainer';
    factContainer.style.cssText = 'margin-top: 0.5rem; padding: 0.75rem; background: linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(139, 195, 74, 0.15)); border-radius: 8px; font-size: 0.85rem; color: var(--text-dark); border: 1px solid rgba(76, 175, 80, 0.3); transition: all 0.2s ease;';
    
    weatherWidget.appendChild(factContainer);
  }
  
  // Update styling based on message type
  if (isConfigMessage) {
    factContainer.style.cursor = 'default';
    factContainer.style.background = 'linear-gradient(135deg, rgba(255, 152, 0, 0.15), rgba(255, 193, 7, 0.15))';
    factContainer.style.borderColor = 'rgba(255, 152, 0, 0.3)';
    factContainer.onclick = null;
    factContainer.onmouseenter = null;
    factContainer.onmouseleave = null;
    factContainer.title = '';
    factContainer.textContent = fact;
  } else {
    factContainer.style.cursor = 'pointer';
    factContainer.style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(139, 195, 74, 0.15))';
    factContainer.style.borderColor = 'rgba(76, 175, 80, 0.3)';
    
    // Add hover effect styling
    factContainer.onmouseenter = () => {
      factContainer.style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 0.25), rgba(139, 195, 74, 0.25))';
      factContainer.style.transform = 'scale(1.02)';
    };
    factContainer.onmouseleave = () => {
      factContainer.style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 0.15), rgba(139, 195, 74, 0.15))';
      factContainer.style.transform = 'scale(1)';
    };
    
    // Add click handler to open bird watching interface
    factContainer.onclick = () => openBirdWatchingModal();
    factContainer.title = 'Click to open bird watching app';
    factContainer.textContent = fact + ' — Tap to explore 🔍';
  }
}

// Bird Watching Interface
function openBirdWatchingModal() {
  if (!currentPosition) {
    alert('Location is required to view bird sightings.');
    return;
  }
  
  // Create modal if it doesn't exist
  let modal = document.getElementById('birdWatchingModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'birdWatchingModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>🐦 Bird Watching</h3>
          <button class="close-btn" id="closeBirdWatching">×</button>
        </div>
        <div style="padding: 1rem;">
          <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
            <button id="viewRecentBirdsBtn" style="flex: 1; padding: 0.75rem; background: var(--primary); color: var(--text-light); border: none; border-radius: var(--radius); cursor: pointer;">
              Recent Sightings
            </button>
            <button id="reportBirdBtn" style="flex: 1; padding: 0.75rem; background: var(--secondary); color: var(--text-light); border: none; border-radius: var(--radius); cursor: pointer;">
              Report Sighting
            </button>
            <button id="myBirdListBtn" style="flex: 1; padding: 0.75rem; background: var(--accent); color: var(--text-light); border: none; border-radius: var(--radius); cursor: pointer;">
              My Sightings
            </button>
          </div>
          <div id="birdWatchingContent" style="max-height: 400px; overflow-y: auto;"></div>
          <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(255,255,255,0.1); border-radius: 8px; font-size: 0.8rem; text-align: center;">
            <p style="margin: 0; color: var(--card);">🌐 Powered by eBird - The world's largest biodiversity network</p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('closeBirdWatching').onclick = () => {
      closeOverlayElement(modal);
    };
    
    document.getElementById('viewRecentBirdsBtn').onclick = () => loadRecentBirds();
    document.getElementById('reportBirdBtn').onclick = () => openBirdReportModal();
    document.getElementById('myBirdListBtn').onclick = () => loadMyBirdSightings();
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeOverlayElement(modal);
    });
    attachModalSwipe(modal, () => closeOverlayElement(modal));
  }
  
  // Load recent birds by default
  loadRecentBirds();
  
  modal.classList.add('active');
  document.body.classList.add('modal-open');
}

async function loadRecentBirds() {
  const content = document.getElementById('birdWatchingContent');
  if (!content || !currentPosition) return;
  
  content.innerHTML = '<p style="text-align: center; color: var(--card);">Loading recent sightings...</p>';
  
  try {
    const params = new URLSearchParams({
      lat: currentPosition.lat.toString(),
      lng: currentPosition.lng.toString(),
      dist: '10',
      maxResults: '50'
    });
    
    const url = `${window.NETLIFY_FUNCTIONS_BASE}/ebird?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      content.innerHTML = '<p style="text-align: center; color: var(--card);">Unable to load bird sightings.</p>';
      return;
    }
    
    const data = await safeParseJSON(response);
    if (!data) {
      content.innerHTML = '<p style="text-align: center; color: var(--card);">Unable to load bird sightings.</p>';
      return;
    }
    
    if (!data || data.length === 0) {
      content.innerHTML = '<p style="text-align: center; color: var(--card);">No recent bird sightings in this area.</p>';
      return;
    }
    
    content.innerHTML = '';
    
    // Group by species
    const speciesMap = new Map();
    data.forEach(bird => {
      if (!speciesMap.has(bird.comName)) {
        speciesMap.set(bird.comName, []);
      }
      speciesMap.get(bird.comName).push(bird);
    });
    
    // Display each species
    speciesMap.forEach((sightings, speciesName) => {
      const card = document.createElement('div');
      card.style.cssText = 'padding: 1rem; margin-bottom: 0.75rem; background: rgba(255,255,255,0.08); border-radius: 8px; border-left: 4px solid var(--accent);';
      
      const totalCount = sightings.reduce((sum, s) => sum + (s.howMany || 1), 0);
      const mostRecent = sightings[0];
      const date = new Date(mostRecent.obsDt);
      const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      const timeStr = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
      
      let distanceStr = '';
      if (mostRecent.lat && mostRecent.lng) {
        const distance = calculateDistance(currentPosition.lat, currentPosition.lng, mostRecent.lat, mostRecent.lng);
        distanceStr = distance < 0.1 ? `${(distance * 5280).toFixed(0)}ft away` : `${distance.toFixed(1)} mi away`;
      }
      
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
          <h4 style="margin: 0; color: var(--text-dark); font-size: 1rem;">🐦 ${speciesName}</h4>
          <span style="background: var(--primary); color: var(--text-light); padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">${totalCount}</span>
        </div>
        <div style="font-size: 0.85rem; color: var(--card); line-height: 1.5;">
          ${mostRecent.sciName ? `<div style="font-style: italic; opacity: 0.8;">${mostRecent.sciName}</div>` : ''}
          <div>📍 ${mostRecent.locName || 'Unknown location'}</div>
          <div>🕐 Spotted ${timeStr}${distanceStr ? ` • ${distanceStr}` : ''}</div>
          ${sightings.length > 1 ? `<div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.1);">+ ${sightings.length - 1} more sighting${sightings.length > 2 ? 's' : ''} nearby</div>` : ''}
        </div>
      `;
      
      content.appendChild(card);
    });
    
  } catch (err) {
    console.error('Failed to load bird sightings:', err);
    content.innerHTML = '<p style="text-align: center; color: var(--card);">Error loading bird sightings.</p>';
  }
}

function loadMyBirdSightings() {
  const content = document.getElementById('birdWatchingContent');
  if (!content) return;
  
  const sightings = getBirdSightings();
  
  if (!sightings || sightings.length === 0) {
    content.innerHTML = '<p style="text-align: center; color: var(--card);">You haven\'t reported any sightings yet.</p>';
    return;
  }
  
  content.innerHTML = '';
  
  // Display in reverse chronological order
  [...sightings].reverse().forEach(sighting => {
    const card = document.createElement('div');
    card.style.cssText = 'padding: 1rem; margin-bottom: 0.75rem; background: rgba(76, 175, 80, 0.15); border-radius: 8px; border-left: 4px solid rgba(76, 175, 80, 0.8);';
    
    const date = new Date(sighting.timestamp);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
        <h4 style="margin: 0; color: var(--text-dark); font-size: 1rem;">🐦 ${sighting.bird}</h4>
        <span style="background: var(--secondary); color: var(--text-light); padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">${sighting.count}</span>
      </div>
      <div style="font-size: 0.85rem; color: var(--card); line-height: 1.5;">
        <div>📍 ${sighting.location}</div>
        <div>🕐 ${dateStr} at ${timeStr}</div>
      </div>
    `;
    
    content.appendChild(card);
  });
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

// --- Brewery Search Integration ---
async function searchBreweries(lat, lng, query = '') {
  try {
    let url;
    if (query) {
      // Search by query but filter by distance after
      url = `https://api.openbrewerydb.org/v1/breweries/search?query=${encodeURIComponent(query)}&per_page=50`;
    } else {
      // Search by distance - using nearby breweries
      url = `https://api.openbrewerydb.org/v1/breweries?by_dist=${lat},${lng}&per_page=50`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Brewery API request failed:', response.status);
      return [];
    }
    
    const data = await safeParseJSON(response);
    if (!data) {
      return [];
    }
    
    const breweries = data.map(brewery => ({
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
    
    // Filter to local breweries only (within 15 miles)
    return breweries.filter(b => b.distance && b.distance <= 15).sort((a, b) => a.distance - b.distance);
  } catch (err) {
    console.error('Failed to fetch breweries:', err);
    return [];
  }
}

// --- Recreation.gov Integration ---
// Cache for recreation area searches
let recreationCache = new Map();
const RECREATION_CACHE_MS = 60 * 60 * 1000; // 1 hour cache

async function searchRecreationAreas(lat, lng, radius = 50) {
  try {
    // Create cache key
    const cacheKey = generateLocationCacheKey(lat, lng, radius.toString());
    
    // Check cache first
    const cached = recreationCache.get(cacheKey);
    if (isCacheValid(cached, RECREATION_CACHE_MS)) {
      console.log('Using cached recreation areas');
      return cached.value;
    }
    
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      radius: radius.toString(),
      limit: '20'
    });

    const url = `${window.NETLIFY_FUNCTIONS_BASE}/recreation?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Recreation.gov API request failed:', response.status);
      return [];
    }
    
    const data = await safeParseJSON(response);
    if (!data) {
      return [];
    }
    
    let results = [];
    if (data.RECDATA && Array.isArray(data.RECDATA)) {
      results = data.RECDATA.map(facility => ({
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
    
    // Cache the results
    recreationCache.set(cacheKey, {
      value: results,
      timestamp: Date.now()
    });
    evictOldestCacheEntry(recreationCache, 20);
    
    return results;
  } catch (err) {
    console.error('Failed to fetch recreation areas:', err);
    return [];
  }
}

// --- National Park Service Integration ---
// Cache for NPS searches
let npsCache = new Map();
let npsEventsCache = new Map();
const NPS_CACHE_MS = 60 * 60 * 1000; // 1 hour cache

async function searchNationalParks(lat, lng, radius = 100) {
  try {
    // Create cache key
    const cacheKey = generateLocationCacheKey(lat, lng, radius.toString());
    
    // Check cache first
    const cached = npsCache.get(cacheKey);
    if (isCacheValid(cached, NPS_CACHE_MS)) {
      console.log('Using cached national parks');
      return cached.value;
    }
    
    const params = new URLSearchParams({
      endpoint: 'parks',
      limit: '10'
    });

    const url = `${window.NETLIFY_FUNCTIONS_BASE}/nps?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('NPS API request failed:', response.status);
      return [];
    }
    
    const data = await safeParseJSON(response);
    if (!data) {
      return [];
    }
    
    let results = [];
    if (data.data && Array.isArray(data.data)) {
      // Filter by distance if coordinates are available
      results = data.data
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
        .filter(park => park.distance < radius) // radius already in miles
        .sort((a, b) => a.distance - b.distance);
    }
    
    // Cache the results
    npsCache.set(cacheKey, {
      value: results,
      timestamp: Date.now()
    });
    evictOldestCacheEntry(npsCache, 20);
    
    return results;
  } catch (err) {
    console.error('Failed to fetch national parks:', err);
    return [];
  }
}

async function getNPSParkEvents(parkCode) {
  if (!parkCode) return [];

  try {
    // Check cache first
    const cached = npsEventsCache.get(parkCode);
    if (isCacheValid(cached, NPS_CACHE_MS)) {
      console.log('Using cached NPS events');
      return cached.value;
    }
    
    const params = new URLSearchParams({
      endpoint: 'events',
      parkCode: parkCode
    });

    const url = `${window.NETLIFY_FUNCTIONS_BASE}/nps?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('NPS Events API request failed:', response.status);
      return [];
    }
    
    const data = await safeParseJSON(response);
    if (!data) {
      return [];
    }
    
    let results = [];
    if (data.data && Array.isArray(data.data)) {
      results = data.data.map(event => ({
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
    
    // Cache the results
    npsEventsCache.set(parkCode, {
      value: results,
      timestamp: Date.now()
    });
    evictOldestCacheEntry(npsEventsCache, 50);
    
    return results;
  } catch (err) {
    console.error('Failed to fetch NPS events:', err);
    return [];
  }
}

// --- Marine Weather Detection ---
function isNearOcean(lat, lng) {
  // Simple coastline detection - check if within 30 miles of known coastal coordinates
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
    
    const data = await safeParseJSON(response);
    if (!data) {
      return null;
    }
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
    const HISTORICAL_YEARS_TO_FETCH = 1; // Fetch only last year's data for performance
    startDate.setFullYear(startDate.getFullYear() - HISTORICAL_YEARS_TO_FETCH);
    
    // Ensure we don't request data from the future
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - 1); // Request up to yesterday to avoid incomplete data
    
    const params = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
      timezone: 'auto'
    });
    
    const response = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`);
    
    if (!response.ok) {
      console.error('Historical weather API request failed:', response.status, response.statusText);
      // Try to get error details from the response body
      try {
        const errorData = await response.json();
        console.error('Historical weather API error details:', errorData);
      } catch (e) {
        // Error response may not be valid JSON (e.g., HTML error pages)
        // Safe to ignore parse errors here as we already logged the status
      }
      return null;
    }
    
    const data = await safeParseJSON(response);
    if (!data) {
      return null;
    }
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

