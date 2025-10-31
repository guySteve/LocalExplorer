// API utilities for LocalExplorer SvelteKit
import { get } from 'svelte/store';
import { currentPosition } from '$lib/stores/appState';
import { browser } from '$app/environment';

// Netlify functions base URL
export const NETLIFY_FUNCTIONS_BASE = browser 
  ? (window.location.hostname === 'localhost' ? 'http://localhost:8888/.netlify/functions' : '/.netlify/functions')
  : '';

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Normalize place data from different providers
export function normalizePlaceData(place, provider) {
  const normalized = {
    id: place.id || place.fsq_id || place.place_id,
    provider: provider,
    name: place.name || place.displayName?.text || '',
    address: place.location?.formatted_address || place.formattedAddress || place.location?.address || '',
    location: null,
    rating: place.rating || null,
    categories: [],
    _original: place
  };

  // Extract location
  if (place.geocodes?.main) {
    normalized.location = { lat: place.geocodes.main.latitude, lng: place.geocodes.main.longitude };
  } else if (place.location?.lat && place.location?.lng) {
    normalized.location = { lat: place.location.lat, lng: place.location.lng };
  } else if (place.geometry?.location) {
    normalized.location = { lat: place.geometry.location.lat, lng: place.geometry.location.lng };
  }

  // Extract categories
  if (place.categories && Array.isArray(place.categories)) {
    normalized.categories = place.categories.map(c => c.name);
  } else if (place.types && Array.isArray(place.types)) {
    normalized.categories = place.types;
  }

  return normalized;
}

// Deduplicate places by name and location proximity
export function deduplicatePlaces(places, thresholdMeters = 50) {
  const unique = [];
  
  for (const place of places) {
    let isDuplicate = false;
    
    for (const existing of unique) {
      const isSameName = place.name.toLowerCase() === existing.name.toLowerCase();
      let isNearby = false;
      
      if (place.location && existing.location) {
        const distance = calculateDistance(
          place.location.lat, place.location.lng,
          existing.location.lat, existing.location.lng
        );
        isNearby = distance < thresholdMeters;
      }
      
      if (isSameName && isNearby) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      unique.push(place);
    }
  }
  
  return unique;
}

// Perform unified search across multiple APIs
export async function performUnifiedSearch(query) {
  const position = get(currentPosition);
  if (!position) {
    throw new Error('Location not available');
  }

  const searchTerm = query.trim();
  const results = {
    foursquare: [],
    nps: [],
    recreation: [],
    ticketmaster: []
  };

  const apiCalls = [];

  // Foursquare Search
  apiCalls.push(
    fetch(`${NETLIFY_FUNCTIONS_BASE}/foursquare?query=${encodeURIComponent(searchTerm)}&ll=${position.lat},${position.lng}`)
      .then(res => res.json())
      .then(data => {
        if (data.results && Array.isArray(data.results)) {
          results.foursquare = data.results.map(place => normalizePlaceData(place, 'foursquare'));
        }
      })
      .catch(err => console.warn('Foursquare search failed:', err))
  );

  // NPS Search
  apiCalls.push(
    fetch(`${NETLIFY_FUNCTIONS_BASE}/nps?query=${encodeURIComponent(searchTerm)}&lat=${position.lat}&lng=${position.lng}`)
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
    fetch(`${NETLIFY_FUNCTIONS_BASE}/recreation?query=${encodeURIComponent(searchTerm)}&lat=${position.lat}&lng=${position.lng}`)
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

  // Ticketmaster Search
  apiCalls.push(
    fetch(`${NETLIFY_FUNCTIONS_BASE}/ticketmaster?keyword=${encodeURIComponent(searchTerm)}&latlong=${position.lat},${position.lng}&radius=25&unit=miles`)
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

  // Wait for all API calls
  await Promise.allSettled(apiCalls);

  // Merge and deduplicate
  const allResults = [
    ...results.foursquare,
    ...results.nps,
    ...results.recreation,
    ...results.ticketmaster
  ].filter(item => item && item.name && item.location);

  const deduplicatedResults = deduplicatePlaces(allResults);

  // Calculate distances and sort
  if (position) {
    deduplicatedResults.forEach(place => {
      if (place.location) {
        place.distance = calculateDistance(
          position.lat,
          position.lng,
          place.location.lat,
          place.location.lng
        );
      }
    });
    deduplicatedResults.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
  }

  return deduplicatedResults;
}

// Search Google Places (requires Google Maps API)
export async function searchGooglePlaces(type, keyword, primaryTypeOnly = false) {
  const position = get(currentPosition);
  if (!position) {
    throw new Error('Location not available');
  }

  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.maps) {
      reject(new Error('Google Maps not loaded'));
      return;
    }

    const service = new window.google.maps.places.PlacesService(document.getElementById('hiddenMap') || document.createElement('div'));
    
    const request = {
      location: new window.google.maps.LatLng(position.lat, position.lng),
      radius: 10000, // 10km
      type: type
    };

    if (keyword) {
      request.keyword = keyword;
    }

    service.nearbySearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        let filtered = results;
        
        if (primaryTypeOnly && type) {
          filtered = results.filter(place => 
            place.types && place.types[0] === type
          );
        }

        // Normalize results
        const normalized = filtered.map(place => ({
          id: place.place_id,
          provider: 'google',
          name: place.name,
          address: place.vicinity || '',
          location: place.geometry?.location ? {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          } : null,
          rating: place.rating || null,
          categories: place.types || [],
          _original: place
        }));

        resolve(normalized);
      } else {
        reject(new Error(`Google Places search failed: ${status}`));
      }
    });
  });
}

// Fetch weather data
export async function fetchWeather(lat, lng) {
  if (!browser) return null;
  
  const WEATHER_API_KEY = window.OPENWEATHER_API_KEY || '';
  if (!WEATHER_API_KEY) {
    console.warn('Weather API key not configured');
    return null;
  }

  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${WEATHER_API_KEY}&units=imperial`
  );

  if (!response.ok) {
    throw new Error('Weather fetch failed');
  }

  return response.json();
}

// Fetch 7-day forecast
export async function fetchForecast(lat, lng) {
  if (!browser) return null;
  
  const WEATHER_API_KEY = window.OPENWEATHER_API_KEY || '';
  if (!WEATHER_API_KEY) {
    console.warn('Weather API key not configured');
    return null;
  }

  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast/daily?lat=${lat}&lon=${lng}&cnt=7&appid=${WEATHER_API_KEY}&units=imperial`
  );

  if (!response.ok) {
    throw new Error('Forecast fetch failed');
  }

  return response.json();
}

// Get place details from Google
export async function getPlaceDetails(placeId) {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.maps) {
      reject(new Error('Google Maps not loaded'));
      return;
    }

    const service = new window.google.maps.places.PlacesService(document.getElementById('hiddenMap') || document.createElement('div'));
    
    service.getDetails({ placeId }, (place, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        resolve(place);
      } else {
        reject(new Error(`Place details failed: ${status}`));
      }
    });
  });
}
