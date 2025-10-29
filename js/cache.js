// API Response Caching for Cost Reduction

// Cache configuration
const CACHE_CONFIG = {
  nearbySearch: {
    duration: 15 * 60 * 1000, // 15 minutes
    maxSize: 50
  },
  placeDetails: {
    duration: 30 * 60 * 1000, // 30 minutes
    maxSize: 100
  },
  geocode: {
    duration: 60 * 60 * 1000, // 1 hour
    maxSize: 50
  }
};

// In-memory cache storage
const cacheStorage = {
  nearbySearch: new Map(),
  placeDetails: new Map(),
  geocode: new Map()
};

// Last geocoded position to prevent excessive calls
let lastGeocodedPosition = null;
const MIN_GEOCODE_DISTANCE_METERS = 500;

/**
 * Calculate distance between two coordinates using Haversine formula (meters)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Generate cache key for nearby search
 */
function getNearbySearchCacheKey(lat, lng, keyword, type) {
  // Round to 3 decimal places (~111m precision)
  const latKey = lat.toFixed(3);
  const lngKey = lng.toFixed(3);
  return `${latKey}|${lngKey}|${keyword}|${type || 'none'}`;
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(cachedItem, maxAge) {
  if (!cachedItem) return false;
  const age = Date.now() - cachedItem.timestamp;
  return age < maxAge;
}

/**
 * Limit cache size by removing oldest entries
 */
function limitCacheSize(cache, maxSize) {
  if (cache.size <= maxSize) return;
  
  // Convert to array and sort by timestamp
  const entries = Array.from(cache.entries())
    .sort((a, b) => a[1].timestamp - b[1].timestamp);
  
  // Remove oldest entries
  const toRemove = entries.slice(0, cache.size - maxSize);
  toRemove.forEach(([key]) => cache.delete(key));
}

/**
 * Cache nearby search results
 */
function cacheNearbySearch(lat, lng, keyword, type, results) {
  const key = getNearbySearchCacheKey(lat, lng, keyword, type);
  cacheStorage.nearbySearch.set(key, {
    results: results,
    timestamp: Date.now()
  });
  limitCacheSize(cacheStorage.nearbySearch, CACHE_CONFIG.nearbySearch.maxSize);
}

/**
 * Get cached nearby search results
 */
function getCachedNearbySearch(lat, lng, keyword, type) {
  const key = getNearbySearchCacheKey(lat, lng, keyword, type);
  const cached = cacheStorage.nearbySearch.get(key);
  
  if (isCacheValid(cached, CACHE_CONFIG.nearbySearch.duration)) {
    return cached.results;
  }
  
  return null;
}

/**
 * Cache place details
 */
function cachePlaceDetails(placeId, details) {
  cacheStorage.placeDetails.set(placeId, {
    details: details,
    timestamp: Date.now()
  });
  limitCacheSize(cacheStorage.placeDetails, CACHE_CONFIG.placeDetails.maxSize);
}

/**
 * Get cached place details
 */
function getCachedPlaceDetails(placeId) {
  const cached = cacheStorage.placeDetails.get(placeId);
  
  if (isCacheValid(cached, CACHE_CONFIG.placeDetails.duration)) {
    return cached.details;
  }
  
  return null;
}

/**
 * Check if geocoding should be performed based on distance from last geocoded position
 */
function shouldPerformGeocode(lat, lng) {
  if (!lastGeocodedPosition) return true;
  
  // Calculate distance from last geocoded position
  const distance = calculateDistance(
    lastGeocodedPosition.lat,
    lastGeocodedPosition.lng,
    lat,
    lng
  );
  
  return distance > MIN_GEOCODE_DISTANCE_METERS;
}

/**
 * Update last geocoded position
 */
function updateLastGeocodedPosition(lat, lng) {
  lastGeocodedPosition = { lat, lng };
}

/**
 * Cache geocode result
 */
function cacheGeocodeResult(lat, lng, result) {
  const key = `${lat.toFixed(4)}|${lng.toFixed(4)}`;
  cacheStorage.geocode.set(key, {
    result: result,
    timestamp: Date.now()
  });
  limitCacheSize(cacheStorage.geocode, CACHE_CONFIG.geocode.maxSize);
}

/**
 * Get cached geocode result
 */
function getCachedGeocodeResult(lat, lng) {
  const key = `${lat.toFixed(4)}|${lng.toFixed(4)}`;
  const cached = cacheStorage.geocode.get(key);
  
  if (isCacheValid(cached, CACHE_CONFIG.geocode.duration)) {
    return cached.result;
  }
  
  return null;
}

/**
 * Clear all caches
 */
function clearAllCaches() {
  cacheStorage.nearbySearch.clear();
  cacheStorage.placeDetails.clear();
  cacheStorage.geocode.clear();
  lastGeocodedPosition = null;
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  return {
    nearbySearch: {
      size: cacheStorage.nearbySearch.size,
      maxSize: CACHE_CONFIG.nearbySearch.maxSize
    },
    placeDetails: {
      size: cacheStorage.placeDetails.size,
      maxSize: CACHE_CONFIG.placeDetails.maxSize
    },
    geocode: {
      size: cacheStorage.geocode.size,
      maxSize: CACHE_CONFIG.geocode.maxSize
    }
  };
}

// Export functions to global scope
window.cacheAPI = {
  nearbySearch: {
    get: getCachedNearbySearch,
    set: cacheNearbySearch
  },
  placeDetails: {
    get: getCachedPlaceDetails,
    set: cachePlaceDetails
  },
  geocode: {
    get: getCachedGeocodeResult,
    set: cacheGeocodeResult,
    shouldPerform: shouldPerformGeocode,
    updatePosition: updateLastGeocodedPosition
  },
  clear: clearAllCaches,
  stats: getCacheStats
};
