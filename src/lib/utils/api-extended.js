// Extended API utilities for LocalExplorer - Weather, eBird, Breweries, What3Words, etc.
import { browser } from '$app/environment';
import { NETLIFY_FUNCTIONS_BASE, calculateDistance, calculateDistanceMiles } from './api.js';

// ===== CACHING =====
const weatherCache = new Map();
const birdFactCache = new Map();
const breweriesCache = new Map();

const WEATHER_CACHE_MS = 10 * 60 * 1000; // 10 minutes
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

// ===== WEATHER (Open-Meteo - FREE) =====

export async function fetchWeatherData(lat, lng) {
  // Check cache first
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = weatherCache.get(cacheKey);
  
  if (isCacheValid(cached, WEATHER_CACHE_MS)) {
    console.log('✅ Weather: Using cached data');
    return cached.value;
  }
  
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    current_weather: 'true',
    hourly: 'apparent_temperature',
    daily: 'temperature_2m_max,temperature_2m_min,sunrise,sunset,weathercode,precipitation_sum,windspeed_10m_max',
    timezone: 'auto',
    forecast_days: 7
  });
  
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  
  if (!response.ok) {
    throw new Error('Weather fetch failed');
  }
  
  const data = await response.json();
  
  // Cache the result
  weatherCache.set(cacheKey, {
    value: data,
    timestamp: Date.now()
  });
  
  return data;
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
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      dist: type === 'hotspots' ? '50' : '25', // Wider radius for hotspots
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
      // Consider birds with low observation counts as "rare" (observed <= 2 times)
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
      
      let distance = null;
      if (bird.lat && bird.lng) {
        distance = calculateDistanceMiles(lat, lng, bird.lat, bird.lng) * 1609.34; // miles to meters
      }
      
      return {
        id: `${bird.speciesCode}-${bird.obsDt}-${bird.locId}`,
        name: `${bird.comName}${bird.howMany > 1 ? ` (${bird.howMany})` : ''}`,
        address: bird.locName || 'Unknown location',
        categories: [bird.sciName],
        timeStr: `Spotted ${timeStr}`,
        provider: 'eBird',
        lat: parseFloat(bird.lat),
        lng: parseFloat(bird.lng),
        distance: distance,
        obsReviewed: bird.obsReviewed,
        locationPrivate: bird.locationPrivate
      };
    }).filter(b => b.lat && b.lng);
  } catch (err) {
    console.error('Failed to search bird sightings:', err);
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
    const params = new URLSearchParams({
      latlong: `${lat},${lng}`,
      radius: '25',
      unit: 'miles'
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
    return (data._embedded && data._embedded.events) || [];
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
