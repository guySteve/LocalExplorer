// Extended API utilities for LocalExplorer - Weather, eBird, Breweries, What3Words, etc.
import { NETLIFY_FUNCTIONS_BASE, calculateDistance, calculateDistanceMiles, MILES_TO_METERS } from './api.js';

// ===== CACHING =====
const weatherCache = new Map();
const birdFactCache = new Map();
const breweriesCache = new Map();

const WEATHER_CACHE_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_FORECAST_DAYS = 10;
const BIRD_FACT_CACHE_MS = 30 * 60 * 1000; // 30 minutes
const BREWERIES_CACHE_MS = 60 * 60 * 1000; // 1 hour

function isCacheValid(cached, maxAge) {
  return cached && (Date.now() - cached.timestamp < maxAge);
}

function generateLocationCacheKey(lat, lng, ...params) {
  const latKey = lat.toFixed(2);
  const lngKey = lng.toFixed(2);
  return [latKey, lngKey, ...params].join(',');
}

// ===== WEATHER (Google Weather with Open-Meteo fallback) =====

export async function fetchWeatherData(lat, lng, options = {}) {
  const { days = DEFAULT_FORECAST_DAYS, units = 'imperial', language = 'en-US' } = options;
  const boundedDays = Math.min(Math.max(days, 1), 16);

  const cacheKey = getWeatherCacheKey(lat, lng, boundedDays, units);
  const cached = weatherCache.get(cacheKey);

  if (isCacheValid(cached, WEATHER_CACHE_MS)) {
    console.log('✅ Weather: Using cached data');
    return cached.value;
  }

  let weatherPayload;
  try {
    weatherPayload = await fetchGoogleWeather(lat, lng, boundedDays, units, language);
  } catch (primaryError) {
    console.warn('Weather: primary provider failed, attempting fallback.', primaryError);
    if (shouldFallbackToOpenMeteo(primaryError)) {
      try {
        weatherPayload = await fetchOpenMeteoFallback(lat, lng, boundedDays, units);
      } catch (fallbackError) {
        console.error('Weather fallback failed:', fallbackError);
        throw primaryError;
      }
    } else {
      throw primaryError;
    }
  }

  weatherCache.set(cacheKey, {
    value: weatherPayload,
    timestamp: Date.now()
  });

  return weatherPayload;
}

export function invalidateWeatherCache(lat, lng) {
  const prefix = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  [...weatherCache.keys()].forEach((key) => {
    if (key.startsWith(prefix)) {
      weatherCache.delete(key);
    }
  });
}

function getWeatherCacheKey(lat, lng, days, units) {
  return `${lat.toFixed(3)},${lng.toFixed(3)},${days},${units}`;
}

async function safeParseJson(response) {
  try {
    return await response.clone().json();
  } catch (err) {
    return null;
  }
}

async function fetchGoogleWeather(lat, lng, days, units, language) {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    days: days.toString(),
    units,
    language
  });

  const functionsBase = NETLIFY_FUNCTIONS_BASE || '/.netlify/functions';
  const response = await fetch(`${functionsBase}/weather?${params}`);

  if (!response.ok) {
    const info = await safeParseJson(response);
    const error = Object.assign(
      new Error(info?.error || 'Weather fetch failed'),
      {
        status: response.status,
        info,
        source: 'google-weather',
        code: info?.details?.status
      }
    );
    throw error;
  }

  return response.json();
}

function shouldFallbackToOpenMeteo(error) {
  if (!error) return true;
  if (/weather api key not configured/i.test(error.message || '')) return true;
  if (error.status && error.status >= 500) return true;
  if (error.code && typeof error.code === 'string' && /permission|forbidden|quota/i.test(error.code)) return true;
  if (/Failed to fetch|NetworkError|fetch failed/i.test(error.message || '')) return true;
  return true;
}

async function fetchOpenMeteoFallback(lat, lng, days, units) {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    current_weather: 'true',
    hourly: 'temperature_2m,apparent_temperature,precipitation_probability,relativehumidity_2m,weathercode,windspeed_10m,winddirection_10m',
    daily: 'weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,windspeed_10m_max',
    timezone: 'auto',
    forecast_days: Math.min(days, 16).toString()
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);

  if (!response.ok) {
    const info = await safeParseJson(response);
    const error = Object.assign(new Error(info?.reason || 'Weather fallback failed'), {
      source: 'open-meteo'
    });
    throw error;
  }

  const raw = await response.json();
  return normalizeOpenMeteoWeather(raw, { lat, lng, days, units });
}

function normalizeOpenMeteoWeather(raw, { lat, lng, days, units }) {
  const fetchedAt = new Date().toISOString();
  const current = raw?.current_weather || null;
  const hourly = raw?.hourly || {};
  const daily = raw?.daily || {};

  const hourlyTimes = Array.isArray(hourly.time) ? hourly.time : [];
  const dailyTimes = Array.isArray(daily.time) ? daily.time : [];

  const currentTimeIndex = current?.time ? hourlyTimes.indexOf(current.time) : -1;
  const currentSummary = weatherCodeToSummary(current?.weathercode);
  const currentTempC = current?.temperature ?? null;
  const currentFeelsLikeC = currentTimeIndex >= 0 && Array.isArray(hourly.apparent_temperature)
    ? hourly.apparent_temperature[currentTimeIndex]
    : currentTempC;
  const currentHumidity = currentTimeIndex >= 0 && Array.isArray(hourly.relativehumidity_2m)
    ? hourly.relativehumidity_2m[currentTimeIndex]
    : null;
  const currentPrecip = currentTimeIndex >= 0 && Array.isArray(hourly.precipitation_probability)
    ? hourly.precipitation_probability[currentTimeIndex]
    : null;
  const currentWindKph = current?.windspeed ?? null;
  const currentWindDir = current?.winddirection ?? null;

  const normalizedCurrent = current
    ? {
        description: currentSummary.text,
        icon: currentSummary.icon,
        temperatureF: celsiusToFahrenheit(currentTempC),
        temperatureC: currentTempC,
        feelsLikeF: celsiusToFahrenheit(currentFeelsLikeC),
        feelsLikeC: currentFeelsLikeC,
        dewPointF: null,
        dewPointC: null,
        humidity: normalizePercent(currentHumidity),
        windMph: kphToMph(currentWindKph),
        windKph: currentWindKph,
        windDirection: currentWindDir,
        windGustMph: null,
        windGustKph: null,
        pressureMb: null,
        pressureInHg: null,
        precipitationChance: normalizePercent(currentPrecip),
        uvIndex: null,
        visibilityMiles: null,
        observationTime: current.time || null
      }
    : null;

  const hourlyCount = Math.min(hourlyTimes.length, days * 24);
  const normalizedHourly = [];
  for (let i = 0; i < hourlyCount; i += 1) {
    const summary = weatherCodeToSummary(hourly.weathercode?.[i]);
    const tempC = hourly.temperature_2m?.[i] ?? null;
    const feelsC = hourly.apparent_temperature?.[i] ?? tempC;
    const windKph = hourly.windspeed_10m?.[i] ?? null;
    normalizedHourly.push({
      time: hourlyTimes[i],
      description: summary.text,
      icon: summary.icon,
      temperatureF: celsiusToFahrenheit(tempC),
      temperatureC: tempC,
      feelsLikeF: celsiusToFahrenheit(feelsC),
      feelsLikeC: feelsC,
      precipitationChance: normalizePercent(hourly.precipitation_probability?.[i]),
      humidity: normalizePercent(hourly.relativehumidity_2m?.[i]),
      windMph: kphToMph(windKph),
      windDirection: hourly.winddirection_10m?.[i] ?? null
    });
  }

  const dailyCount = Math.min(dailyTimes.length, days);
  const normalizedDaily = [];
  for (let i = 0; i < dailyCount; i += 1) {
    const summary = weatherCodeToSummary(daily.weathercode?.[i]);
    const highC = daily.temperature_2m_max?.[i] ?? null;
    const lowC = daily.temperature_2m_min?.[i] ?? null;
    const windKph = daily.windspeed_10m_max?.[i] ?? null;
    normalizedDaily.push({
      date: dailyTimes[i],
      description: summary.text,
      icon: summary.icon,
      highF: celsiusToFahrenheit(highC),
      highC,
      lowF: celsiusToFahrenheit(lowC),
      lowC,
      precipitationChance: normalizePercent(daily.precipitation_probability_max?.[i]),
      humidity: null,
      windMph: kphToMph(windKph),
      sunrise: daily.sunrise?.[i] ?? null,
      sunset: daily.sunset?.[i] ?? null
    });
  }

  return {
    metadata: {
      source: 'open-meteo',
      fetchedAt,
      units,
      language: 'en-US',
      location: { lat, lng }
    },
    current: normalizedCurrent,
    hourly: normalizedHourly,
    daily: normalizedDaily
  };
}

function celsiusToFahrenheit(value) {
  if (value == null) return null;
  return (value * 9) / 5 + 32;
}

function kphToMph(value) {
  if (value == null) return null;
  return value / 1.60934;
}

function normalizePercent(value) {
  if (value == null) return null;
  if (value > 1) {
    return Math.round(Math.min(value, 100));
  }
  return Math.round(value * 100);
}

export function weatherCodeToSummary(code) {
  const map = {
    0: { icon: '☀️', text: 'Clear' },
    1: { icon: '🌤️', text: 'Mostly clear' },
    2: { icon: '⛅', text: 'Partly cloudy' },
    3: { icon: '☁️', text: 'Overcast' },
    45: { icon: '🌫️', text: 'Fog' },
    48: { icon: '🌫️', text: 'Icy fog' },
    51: { icon: '🌦️', text: 'Light drizzle' },
    53: { icon: '🌦️', text: 'Drizzle' },
    55: { icon: '🌧️', text: 'Heavy drizzle' },
    61: { icon: '🌦️', text: 'Light rain' },
    63: { icon: '🌧️', text: 'Rain' },
    65: { icon: '🌧️', text: 'Heavy rain' },
    71: { icon: '🌨️', text: 'Light snow' },
    73: { icon: '🌨️', text: 'Snow' },
    75: { icon: '❄️', text: 'Heavy snow' },
    80: { icon: '🌦️', text: 'Showers' },
    82: { icon: '⛈️', text: 'Heavy showers' },
    95: { icon: '⛈️', text: 'Thunderstorm' }
  };
  return map[code] || { icon: '🌤️', text: 'Mixed' };
}

// ===== eBIRD INTEGRATION =====

export async function fetchRecentBirdSightings(lat, lng) {
  try {
    const cacheKey = generateLocationCacheKey(lat, lng, 'birds');
    const cached = birdFactCache.get(cacheKey);
    
    if (isCacheValid(cached, BIRD_FACT_CACHE_MS)) {
      return cached.value;
    }
    
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      dist: '10',
      maxResults: '5'
    });
    
    const url = `${NETLIFY_FUNCTIONS_BASE}/ebird?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 500) {
        console.warn('eBird API key not configured');
        return 'configure-key';
      }
      return null;
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const randomBird = data[Math.floor(Math.random() * data.length)];
      const birdName = randomBird.comName;
      const count = randomBird.howMany || 1;
      const date = new Date(randomBird.obsDt);
      const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      const timeStr = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
      
      let distanceStr = '';
      if (randomBird.lat && randomBird.lng) {
        const distance = calculateDistanceMiles(lat, lng, randomBird.lat, randomBird.lng);
        distanceStr = distance < 0.1 ? 
          ` - ${(distance * 5280).toFixed(0)}ft away` : 
          ` - ${distance.toFixed(1)} mi away`;
      }
      
      const result = `🐦 ${birdName} (${count}) spotted ${timeStr}${distanceStr}`;
      
      // Cache result
      birdFactCache.set(cacheKey, {
        value: result,
        timestamp: Date.now()
      });
      
      return result;
    }
    
    return null;
  } catch (err) {
    console.error('Failed to fetch bird sightings:', err);
    return null;
  }
}

// Search bird sightings for list view
export async function searchBirdSightings(lat, lng, type = 'recent') {
  try {
    // Determine endpoint based on type
    let endpoint = 'recent';
    let dist = '25';
    
    if (type === 'notable') {
      endpoint = 'notable';
    } else if (type === 'hotspots') {
      endpoint = 'hotspots';
      dist = '50'; // Wider radius for hotspots
    }
    
    const params = new URLSearchParams({
      endpoint: endpoint,
      lat: lat.toString(),
      lng: lng.toString(),
      dist: dist,
      maxResults: '50' // More results for list view
    });
    
    const url = `${NETLIFY_FUNCTIONS_BASE}/ebird?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 500) {
        console.warn('eBird API key not configured');
        return [];
      }
      return [];
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Filter based on search type
    let filteredData = data;
    if (type === 'rare') {
      // NOTE: This is a simplified rarity filter based on observation frequency within
      // the current API response dataset, not actual species rarity. For more accurate
      // rarity detection, eBird's frequency data or documented rarity classifications
      // would be needed. This approach works as a basic filter to highlight less
      // commonly seen birds in the recent sightings.
      const birdCounts = {};
      data.forEach(bird => {
        birdCounts[bird.comName] = (birdCounts[bird.comName] || 0) + 1;
      });
      filteredData = data.filter(bird => birdCounts[bird.comName] <= 2);
    }
    
    // Transform to standard format
    return filteredData.map(bird => {
      const date = new Date(bird.obsDt);
      const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      const timeStr = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
		
      const parsedLat = typeof bird.lat === 'number' ? bird.lat : parseFloat(bird.lat);
      const parsedLng = typeof bird.lng === 'number' ? bird.lng : parseFloat(bird.lng);
      const hasCoords = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);
      if (!hasCoords) return null;
		
      let distance = null;
      if (hasCoords) {
        distance = calculateDistanceMiles(lat, lng, parsedLat, parsedLng) * MILES_TO_METERS;
      }
		
      return {
        id: `${bird.speciesCode}-${bird.obsDt}-${bird.locId}`,
        name: `${bird.comName}${bird.howMany > 1 ? ` (${bird.howMany})` : ''}`,
        address: bird.locName || 'Unknown location',
        categories: [bird.sciName],
        timeStr: `Spotted ${timeStr}`,
        provider: 'eBird',
        lat: parsedLat,
        lng: parsedLng,
        location: { lat: parsedLat, lng: parsedLng },
        distance,
        obsReviewed: bird.obsReviewed,
        locationPrivate: bird.locationPrivate,
        _original: bird
      };
    }).filter(Boolean);
  } catch (err) {
    console.error('Failed to search bird sightings:', err);
    return [];
  }
}

// Get nearby bird hotspots
export async function fetchBirdHotspots(lat, lng, distance = 50) {
  try {
    const params = new URLSearchParams({
      endpoint: 'hotspots',
      lat: lat.toString(),
      lng: lng.toString(),
      dist: distance.toString()
    });
    
    const url = `${NETLIFY_FUNCTIONS_BASE}/ebird?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn('Failed to fetch bird hotspots');
      return [];
    }
    
    const data = await response.json();
    
    // Transform to standard format
    return data.map(hotspot => {
      const parsedLat = typeof hotspot.lat === 'number' ? hotspot.lat : parseFloat(hotspot.lat);
      const parsedLng = typeof hotspot.lng === 'number' ? hotspot.lng : parseFloat(hotspot.lng);
      
      if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
      
      const distance = calculateDistanceMiles(lat, lng, parsedLat, parsedLng) * MILES_TO_METERS;
      
      return {
        id: hotspot.locId,
        name: hotspot.locName,
        address: `${hotspot.countryCode} - ${hotspot.numSpeciesAllTime || 0} species recorded`,
        categories: ['Bird Hotspot'],
        provider: 'eBird',
        lat: parsedLat,
        lng: parsedLng,
        location: { lat: parsedLat, lng: parsedLng },
        distance,
        speciesCount: hotspot.numSpeciesAllTime || 0,
        latestObsDate: hotspot.latestObsDt,
        _original: hotspot
      };
    }).filter(Boolean);
  } catch (err) {
    console.error('Failed to fetch bird hotspots:', err);
    return [];
  }
}

// Get species list for a region
export async function fetchRegionSpecies(regionCode) {
  try {
    const params = new URLSearchParams({
      endpoint: 'species-list',
      regionCode: regionCode
    });
    
    const url = `${NETLIFY_FUNCTIONS_BASE}/ebird?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn('Failed to fetch regional species');
      return [];
    }
    
    const data = await response.json();
    return data || [];
  } catch (err) {
    console.error('Failed to fetch regional species:', err);
    return [];
  }
}

// Get hotspot details and species
export async function fetchHotspotDetails(hotspotCode) {
  try {
    const [info, species] = await Promise.all([
      fetch(`${NETLIFY_FUNCTIONS_BASE}/ebird?endpoint=hotspot-info&hotspotCode=${hotspotCode}`),
      fetch(`${NETLIFY_FUNCTIONS_BASE}/ebird?endpoint=hotspot-species&hotspotCode=${hotspotCode}`)
    ]);
    
    const hotspotInfo = info.ok ? await info.json() : null;
    const speciesList = species.ok ? await species.json() : [];
    
    return {
      info: hotspotInfo,
      species: speciesList
    };
  } catch (err) {
    console.error('Failed to fetch hotspot details:', err);
    return { info: null, species: [] };
  }
}

// Find nearest observations of a specific species
export async function findNearestSpecies(lat, lng, speciesCode, maxResults = 10) {
  try {
    const params = new URLSearchParams({
      endpoint: 'nearest-species',
      lat: lat.toString(),
      lng: lng.toString(),
      speciesCode: speciesCode,
      maxResults: maxResults.toString(),
      dist: '50'
    });
    
    const url = `${NETLIFY_FUNCTIONS_BASE}/ebird?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn('Failed to find nearest species');
      return [];
    }
    
    const data = await response.json();
    
    // Transform to standard format
    return data.map(obs => {
      const parsedLat = typeof obs.lat === 'number' ? obs.lat : parseFloat(obs.lat);
      const parsedLng = typeof obs.lng === 'number' ? obs.lng : parseFloat(obs.lng);
      
      if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
      
      const distance = calculateDistanceMiles(lat, lng, parsedLat, parsedLng) * MILES_TO_METERS;
      const date = new Date(obs.obsDt);
      const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      const timeStr = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
      
      return {
        id: `${obs.speciesCode}-${obs.obsDt}-${obs.locId}`,
        name: `${obs.comName}${obs.howMany > 1 ? ` (${obs.howMany})` : ''}`,
        address: obs.locName || 'Unknown location',
        categories: [obs.sciName],
        timeStr: `Spotted ${timeStr}`,
        provider: 'eBird',
        lat: parsedLat,
        lng: parsedLng,
        location: { lat: parsedLat, lng: parsedLng },
        distance,
        _original: obs
      };
    }).filter(Boolean);
  } catch (err) {
    console.error('Failed to find nearest species:', err);
    return [];
  }
}

// Get eBird taxonomy data
export async function fetchBirdTaxonomy(speciesCode = null) {
  try {
    const params = new URLSearchParams({
      endpoint: 'taxonomy'
    });
    if (speciesCode) {
      params.append('speciesCode', speciesCode);
    }
    
    const url = `${NETLIFY_FUNCTIONS_BASE}/ebird?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn('Failed to fetch bird taxonomy');
      return [];
    }
    
    const data = await response.json();
    return data || [];
  } catch (err) {
    console.error('Failed to fetch bird taxonomy:', err);
    return [];
  }
}

// Get top 100 contributors for a region
export async function fetchTopContributors(regionCode) {
  try {
    const params = new URLSearchParams({
      endpoint: 'top100',
      regionCode: regionCode
    });
    
    const url = `${NETLIFY_FUNCTIONS_BASE}/ebird?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn('Failed to fetch top contributors');
      return [];
    }
    
    const data = await response.json();
    return data || [];
  } catch (err) {
    console.error('Failed to fetch top contributors:', err);
    return [];
  }
}

// ===== BREWERIES (Open Brewery DB - FREE) =====

export async function searchBreweries(lat, lng, query = '') {
  try {
    const cacheKey = generateLocationCacheKey(lat, lng, query);
    const cached = breweriesCache.get(cacheKey);
    
    if (isCacheValid(cached, BREWERIES_CACHE_MS)) {
      console.log('Using cached brewery results');
      return cached.value;
    }
    
    let url;
    if (query) {
      url = `https://api.openbrewerydb.org/v1/breweries/search?query=${encodeURIComponent(query)}&per_page=50`;
    } else {
      url = `https://api.openbrewerydb.org/v1/breweries?by_dist=${lat},${lng}&per_page=50`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Brewery API request failed:', response.status);
      return [];
    }
    
    const data = await response.json();
    
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
        calculateDistanceMiles(lat, lng, parseFloat(brewery.latitude), parseFloat(brewery.longitude)) : null
    })).filter(b => b.lat && b.lng);
    
    // Filter to local breweries (within 15 miles)
    const localBreweries = breweries
      .filter(b => b.distance && b.distance <= 15)
      .sort((a, b) => a.distance - b.distance);
    
    // Cache results
    breweriesCache.set(cacheKey, {
      value: localBreweries,
      timestamp: Date.now()
    });
    
    return localBreweries;
  } catch (err) {
    console.error('Failed to fetch breweries:', err);
    return [];
  }
}

// ===== WHAT3WORDS =====

export async function fetchWhat3Words(lat, lng) {
  try {
    const url = `${NETLIFY_FUNCTIONS_BASE}/what3words?lat=${lat}&lng=${lng}`;
    const response = await fetch(url);
    
    if (!response.ok) {
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

// ===== LOCAL EVENTS (Ticketmaster) =====

export async function searchLocalEvents(lat, lng, classification = '') {
  try {
    // Get the current date and calculate date range for next 30 days only
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + 30); // Only look 30 days ahead
    
    const startDateStr = today.toISOString().split('T')[0] + 'T00:00:00Z';
    const endDateStr = endDate.toISOString().split('T')[0] + 'T23:59:59Z';
    
    const params = new URLSearchParams({
      latlong: `${lat},${lng}`,
      radius: '10', // Reduced from 25 to 10 miles for truly local events
      unit: 'miles',
      startDateTime: startDateStr,
      endDateTime: endDateStr,
      sort: 'date,asc', // Sort by date to get soonest events first
      size: '50' // Get more events so we can filter better
    });
    
    if (classification) {
      params.append('classificationName', classification);
    }
    
    const url = `${NETLIFY_FUNCTIONS_BASE}/ticketmaster?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    const events = (data._embedded && data._embedded.events) || [];
    
    // Additional filtering for truly local events
    const now = Date.now();
    const oneWeekFromNow = now + (7 * 24 * 60 * 60 * 1000); // 1 week in milliseconds
    
    return events.filter(event => {
      // Filter out events too far in the future (more than 1 week)
      if (event.dates && event.dates.start && event.dates.start.dateTime) {
        const eventDate = new Date(event.dates.start.dateTime).getTime();
        if (eventDate > oneWeekFromNow) {
          return false;
        }
      }
      
      // Filter out events that are too far away if we have venue coordinates
      if (event._embedded?.venues?.[0]) {
        const venue = event._embedded.venues[0];
        if (venue.location?.latitude && venue.location?.longitude) {
          const venueLat = parseFloat(venue.location.latitude);
          const venueLng = parseFloat(venue.location.longitude);
          
          // Calculate distance in miles
          const R = 3959; // Earth's radius in miles
          const dLat = (venueLat - lat) * Math.PI / 180;
          const dLng = (venueLng - lng) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                   Math.cos(lat * Math.PI / 180) * Math.cos(venueLat * Math.PI / 180) *
                   Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;
          
          // Only include events within 8 miles
          if (distance > 8) {
            return false;
          }
        }
      }
      
      return true;
    });
  } catch (err) {
    console.error('Failed to fetch events:', err);
    return [];
  }
}

// ===== NATIONAL PARKS (NPS) =====

export async function searchNationalParks(lat, lng, radius = 100) {
  try {
    const params = new URLSearchParams({
      endpoint: 'parks',
      limit: '10'
    });
    
    const url = `${NETLIFY_FUNCTIONS_BASE}/nps?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    
    if (data.data && Array.isArray(data.data)) {
      return data.data
        .filter(park => park.latitude && park.longitude)
        .map(park => {
          const parkLat = parseFloat(park.latitude);
          const parkLng = parseFloat(park.longitude);
          const distance = calculateDistanceMiles(lat, lng, parkLat, parkLng);
          
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
            states: park.states,
            images: park.images || []
          };
        })
        .filter(park => park.distance < radius)
        .sort((a, b) => a.distance - b.distance);
    }
    
    return [];
  } catch (err) {
    console.error('Failed to fetch national parks:', err);
    return [];
  }
}

// ===== RECREATION AREAS (Recreation.gov) =====

export async function searchRecreationAreas(lat, lng, radius = 50) {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      radius: radius.toString(),
      limit: '20'
    });
    
    const url = `${NETLIFY_FUNCTIONS_BASE}/recreation?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
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
        reservationUrl: facility.FacilityReservationURL
      }));
    }
    
    return [];
  } catch (err) {
    console.error('Failed to fetch recreation areas:', err);
    return [];
  }
}

// ===== FOURSQUARE =====

export async function searchFoursquareNearby(lat, lng, query = '', limit = 20) {
  try {
    const params = new URLSearchParams({
      endpoint: 'places/search',
      ll: `${lat},${lng}`,
      limit: limit.toString(),
      radius: '8046' // 5 miles
    });
    
    if (query) {
      params.append('query', query);
    }
    
    const url = `${NETLIFY_FUNCTIONS_BASE}/foursquare?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    
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
    
    return results;
  } catch (err) {
    console.error('Failed to fetch Foursquare data:', err);
    return [];
  }
}

export async function getFoursquareDetails(fsqId) {
  if (!fsqId) return null;
  
  try {
    const params = new URLSearchParams({
      endpoint: `places/${fsqId}`
    });
    
    const url = `${NETLIFY_FUNCTIONS_BASE}/foursquare?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
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
    console.error('Failed to fetch Foursquare details:', err);
    return null;
  }
}
