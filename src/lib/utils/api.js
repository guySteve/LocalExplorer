// API utilities for LocalExplorer SvelteKit
import { get } from 'svelte/store';
import { currentPosition, isOffline } from '$lib/stores/appState';
import { browser } from '$app/environment';

// Note: This app now uses GitHub Pages static hosting.
// Only free APIs (Open-Meteo weather, OpenBreweryDB) are directly accessible.
// Features requiring API keys (eBird, Ticketmaster, etc.) are disabled.

// ===== CACHING UTILITIES =====

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

// Initialize caches
const nearbySearchCache = new Map();
const placeDetailsCache = new Map();
const eventSearchCache = new Map();
const what3wordsCache = new Map();
const foursquareSearchCache = new Map();
const foursquareDetailsCache = new Map();
const recreationCache = new Map();
const npsCache = new Map();
const npsEventsCache = new Map();

const NEARBY_SEARCH_CACHE_MS = 15 * 60 * 1000; // 15 minutes
const PLACE_DETAILS_CACHE_MS = 60 * 60 * 1000; // 1 hour
const EVENT_SEARCH_CACHE_MS = 30 * 60 * 1000; // 30 minutes
const WHAT3WORDS_CACHE_MS = 60 * 60 * 1000; // 1 hour
const FOURSQUARE_SEARCH_CACHE_MS = 15 * 60 * 1000; // 15 minutes
const FOURSQUARE_DETAILS_CACHE_MS = 60 * 60 * 1000; // 1 hour
const RECREATION_CACHE_MS = 60 * 60 * 1000; // 1 hour
const NPS_CACHE_MS = 60 * 60 * 1000; // 1 hour

// ===== DISTANCE CALCULATIONS =====

// Conversion constant
export const MILES_TO_METERS = 1609.34;

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in meters
 */
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

/**
 * Calculate distance in miles
 */
export function calculateDistanceMiles(lat1, lon1, lat2, lon2) {
  const meters = calculateDistance(lat1, lon1, lat2, lon2);
  return meters / MILES_TO_METERS; // Convert to miles
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
    google: []
    // Note: Features requiring API proxying (foursquare, nps, recreation, ticketmaster, ebird, holiday) 
    // are disabled in the static GitHub Pages deployment
  };

  const apiCalls = [];

  try {
    // Check if browser reports offline status
    if (browser && !navigator.onLine) {
      console.warn('Browser reports offline status');
      isOffline.set(true);
      // Continue with the search attempt anyway, as navigator.onLine can be unreliable
    }

    // Google Maps Places Search - works client-side with API key
    apiCalls.push(
      searchGooglePlaces(null, searchTerm, false)
        .then(places => {
          if (places && places.length > 0) {
            results.google = places;
          }
        })
        .catch(err => console.warn('Google Places search failed:', err))
    );

    // The following APIs have been disabled for static hosting:
    // - Foursquare (requires API key proxy)
    // - NPS (requires API key proxy)
    // - Recreation.gov (requires API key proxy)
    // - Ticketmaster (requires API key proxy)
    // - eBird (requires API key proxy)
    // - Holiday API (requires API key proxy)

    // Wait for all API calls
    await Promise.allSettled(apiCalls);

    // Merge and deduplicate (only Google Places results now)
    const allResults = [
      ...results.google
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

    // Clear offline status on successful search
    isOffline.set(false);

    return deduplicatedResults;
  } catch (error) {
    // Check if error is due to offline condition
    if (error instanceof TypeError && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('network'))) {
      console.error('Network error detected - user appears to be offline:', error);
      isOffline.set(true);
    }
    throw error;
  }
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
