// Core app state and storage helpers
const DEFAULT_THEME = 'naval'; // Polished Sailor is the new 'naval'
const THEMES = {
  naval:    { '--background': '#f8f7f2', '--card': '#1a2b44', '--primary': '#c87941', '--secondary': '#334e68', '--text-dark': '#1a2b44', '--text-light': '#ffffff', '--accent': '#8a5a44' },
  sunset:   { '--background': '#1b1c3d', '--card': '#ef476f', '--primary': '#ffd166', '--secondary': '#073b4c', '--text-dark': '#f7f5ff', '--text-light': '#fff8f0', '--accent': '#06d6a0' },
  neon:     { '--background': '#080b1a', '--card': '#16213e', '--primary': '#ff4d6d', '--secondary': '#38d9a9', '--text-dark': '#f4f4ff', '--text-light': '#f8f9ff', '--accent': '#4cc9f0' },
  arctic:   { '--background': '#e9f4fb', '--card': '#1b3b5f', '--primary': '#3d9be9', '--secondary': '#1f5673', '--text-dark': '#1b3b5f', '--text-light': '#ffffff', '--accent': '#8bc6ec' },
  highseas: { '--background': '#050a1c', '--card': '#0f2447', '--primary': '#1dd3b0', '--secondary': '#16355f', '--text-dark': '#d7f3ff', '--text-light': '#f0fbff', '--accent': '#58a4ff' },
  aurora:   { '--background': '#060b1b', '--card': '#102a43', '--primary': '#7f5af0', '--secondary': '#2cb67d', '--text-dark': '#e6f0ff', '--text-light': '#f7f2ff', '--accent': '#64dfdf' },
  arcane:   { '--background': '#0b0d1f', '--card': '#2b1f4d', '--primary': '#cf6bff', '--secondary': '#5c3dc1', '--text-dark': '#f3eafa', '--text-light': '#fdf7ff', '--accent': '#f7c873' },
  solstice: { '--background': '#fff7eb', '--card': '#255270', '--primary': '#fa824c', '--secondary': '#3f7cbf', '--text-dark': '#1f3346', '--text-light': '#ffffff', '--accent': '#ffd275' },
  evergreen:{ '--background': '#f2f7ee', '--card': '#2d4a3a', '--primary': '#74b49b', '--secondary': '#3b6b52', '--text-dark': '#22352c', '--text-light': '#fdfdf9', '--accent': '#d9a441' },
  voyager:  { '--background': '#0a0f2b', '--card': '#182952', '--primary': '#4cc9f0', '--secondary': '#4361ee', '--text-dark': '#dbe8ff', '--text-light': '#eef5ff', '--accent': '#fca311' },
  monochrome:{ '--background': '#f6f6f6', '--card': '#1e1e1e', '--primary': '#4c4c4c', '--secondary': '#2f2f2f', '--text-dark': '#1e1e1e', '--text-light': '#ffffff', '--accent': '#888888' },
  playful:  { '--background': '#fff3f8', '--card': '#ff7eb6', '--primary': '#ffd23f', '--secondary': '#5f6dec', '--text-dark': '#273043', '--text-light': '#ffffff', '--accent': '#ff6b6b' },
  retro90:  { '--background': '#1a0b2a', '--card': '#ff5dad', '--primary': '#00f5d4', '--secondary': '#845ef7', '--text-dark': '#fef9ff', '--text-light': '#ffffff', '--accent': '#ffd23f' },
  groove70: { '--background': '#fff2d7', '--card': '#d2691e', '--primary': '#ffb347', '--secondary': '#ef476f', '--text-dark': '#402218', '--text-light': '#fffaf2', '--accent': '#ffa69e' },
  mojave:   { '--background': '#fff3e1', '--card': '#4a2c22', '--primary': '#f4a259', '--secondary': '#bc5f34', '--text-dark': '#3f2a1b', '--text-light': '#fffaf5', '--accent': '#f7c59f' }
};
let currentThemeKey = DEFAULT_THEME;

// Shared state
let currentPosition = null;
let currentAddress = '';
let streetViewPanorama;
let currentResults = [];
let currentPlaceDetails;
let latestLocationLabel = '';
let currentPaginationHandle = null;
let appendNextResults = false;
let lastResultsTitle = 'Results';
let pendingStreetViewLatLng = null;

let lastWeatherFetch = 0;
let lastWeatherCoords = null;
let cachedWeather = null;
const WEATHER_CACHE_MS = 10 * 60 * 1000; // 10 minutes
let selectedVoiceUri = localStorage.getItem('selectedVoiceUri') || '';

// Search categories
const categories = {
  'Foodie Finds': [
    { name: 'Italian', keyword: 'italian restaurant', type: 'restaurant', primaryTypeOnly: true },
    { name: 'Pizza', keyword: 'pizza', type: 'restaurant', primaryTypeOnly: true },
    { name: 'Cafes', keyword: 'cafe', type: 'cafe', primaryTypeOnly: true },
    { name: 'Bakeries', keyword: 'bakery', type: 'bakery', primaryTypeOnly: true },
    { name: 'Sushi', keyword: 'sushi', type: 'restaurant', primaryTypeOnly: true }
  ],
  'Iconic Sights': [
    { name: 'Tourist Attractions', type: 'tourist_attraction', primaryTypeOnly: true },
    { name: 'Museums', type: 'museum', primaryTypeOnly: true },
    { name: 'Art Galleries', type: 'art_gallery', primaryTypeOnly: true },
    { name: 'Parks', type: 'park', primaryTypeOnly: true },
    { name: 'Landmarks', keyword: 'landmark', type: 'point_of_interest' }
  ],
  'Night Out': [
    { name: 'Bars', type: 'bar', primaryTypeOnly: true },
    { name: 'Night Clubs', type: 'night_club', primaryTypeOnly: true },
    { name: 'Movie Theaters', type: 'movie_theater', primaryTypeOnly: true },
    { name: 'Bowling Alleys', type: 'bowling_alley', primaryTypeOnly: true },
    { name: 'Concert Venues', keyword: 'concert', type: 'point_of_interest' }
  ],
  'Hidden Gems': [
    { name: 'Libraries', type: 'library', primaryTypeOnly: true },
    { name: 'Book Stores', type: 'book_store', primaryTypeOnly: true },
    { name: 'Gardens', keyword: 'garden', type: 'park', primaryTypeOnly: true },
    { name: 'Historical Sites', keyword: 'historical site', type: 'point_of_interest' },
    { name: 'Local Favorites', keyword: 'local favorite', type: 'point_of_interest' },
    { name: 'Historical Markers', keyword: 'historical marker', type: 'point_of_interest' }
  ],
  'Pet Friendly': [
    { name: 'Dog Parks', keyword: 'dog park', type: 'park', primaryTypeOnly: true },
    { name: 'Pet Stores', type: 'pet_store', primaryTypeOnly: true },
    { name: 'Veterinary Care', type: 'veterinary_care', primaryTypeOnly: true },
    { name: 'Pet Friendly Cafes', keyword: 'pet friendly cafe', type: 'cafe', primaryTypeOnly: true },
    { name: 'Pet Friendly Hotels', keyword: 'pet friendly hotel', type: 'lodging', primaryTypeOnly: true }
  ],
  'Utilities & Help': [
    { name: 'Hospitals', type: 'hospital', ignoreRating: true, primaryTypeOnly: true },
    { name: 'Pharmacies', type: 'pharmacy', ignoreRating: true, primaryTypeOnly: true },
    { name: 'Police', type: 'police', ignoreRating: true, primaryTypeOnly: true },
    { name: 'Gas Stations', type: 'gas_station', ignoreRating: true, primaryTypeOnly: true },
    { name: 'ATMs', type: 'atm', ignoreRating: true, primaryTypeOnly: true }
  ],
  Outdoor: [
    { name: 'Parks', type: 'park', primaryTypeOnly: true },
    { name: 'Trails', keyword: 'hiking trail', type: 'park', primaryTypeOnly: true },
    { name: 'Nature Reserves', keyword: 'nature reserve', type: 'park', primaryTypeOnly: true },
    { name: 'Beaches', keyword: 'beach', type: 'park', primaryTypeOnly: true },
    { name: 'Campgrounds', keyword: 'campground', type: 'campground', primaryTypeOnly: true }
  ],
  'Local Events': [
    { name: 'All Events', value: 'all' },
    { name: 'Music', value: 'music' },
    { name: 'Sports', value: 'sports' },
    { name: 'Comedy', value: 'comedy' },
    { name: 'Festivals', value: 'festival' }
  ]
};

const STORAGE_KEYS = {
  saved: 'localExplorer.savedPlaces',
  plan: 'localExplorer.plan',
  visited: 'localExplorer.visitedPlan'
};

const STORAGE_LIMITS = {
  saved: 60,
  plan: 40
};

const storageFallback = Object.create(null);

function getStorage() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch (_) {
    /* ignored */
  }
  return null;
}

function deepCloneList(list) {
  return JSON.parse(JSON.stringify(Array.isArray(list) ? list : []));
}

function readStorageList(key) {
  const storage = getStorage();
  if (storage) {
    try {
      const raw = storage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          storageFallback[key] = deepCloneList(parsed);
          return deepCloneList(parsed);
        }
      } else if (storageFallback[key]) {
        return deepCloneList(storageFallback[key]);
      }
    } catch (err) {
      console.warn(`Failed to read ${key} from localStorage`, err);
    }
  }
  const fallback = storageFallback[key];
  return fallback ? deepCloneList(fallback) : [];
}

function writeStorageList(key, list) {
  const payload = deepCloneList(list);
  storageFallback[key] = payload;
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(key, JSON.stringify(payload));
    } catch (err) {
      console.warn(`Failed to persist ${key} to localStorage`, err);
    }
  }
}

function extractLatLng(source) {
  if (!source) return null;
  let lat = source.lat;
  let lng = source.lng;
  if (typeof lat === 'function') lat = lat.call(source);
  if (typeof lng === 'function') lng = lng.call(source);
  if (typeof lat === 'number' && !Number.isNaN(lat) && typeof lng === 'number' && !Number.isNaN(lng)) {
    return { lat, lng };
  }
  return null;
}

function normalizePlace(place, options = {}) {
  if (!place) return null;
  const id = place.place_id || place.id;
  if (!id) return null;
  const normalizedName = (place.name || place.title || '').trim() || 'Unnamed place';
  const normalized = {
    place_id: id,
    name: normalizedName,
    formatted_address: place.formatted_address || place.vicinity || place.address || '',
    rating: typeof place.rating === 'number' ? place.rating : null,
    user_ratings_total: typeof place.user_ratings_total === 'number' ? place.user_ratings_total : null,
    types: Array.isArray(place.types) ? [...place.types] : Array.isArray(place.categories) ? [...place.categories] : [],
    icon: place.icon || '',
    url: place.url || '',
    website: place.website || '',
    timestamp: options.preserveTimestamp && typeof place.timestamp === 'number'
      ? place.timestamp
      : Date.now()
  };
  const location =
    extractLatLng(place.geometry?.location) ||
    extractLatLng(place.location) ||
    (place.location && typeof place.location.lat === 'number' && typeof place.location.lng === 'number'
      ? { lat: place.location.lat, lng: place.location.lng }
      : null);
  normalized.location = location;
  return normalized;
}

function revivePlaces(key, limit) {
  const list = readStorageList(key);
  const revived = [];
  const seen = new Set();
  list.forEach(item => {
    const normalized = normalizePlace(item, { preserveTimestamp: true });
    if (!normalized || seen.has(normalized.place_id)) return;
    seen.add(normalized.place_id);
    revived.push(normalized);
  });
  if (typeof limit === 'number' && revived.length > limit) {
    return revived.slice(0, limit);
  }
  return revived;
}

// --- Storage Functions ---
function getSavedList() {
  return revivePlaces(STORAGE_KEYS.saved, STORAGE_LIMITS.saved);
}

function savePlace(place) {
  const normalized = normalizePlace(place);
  if (!normalized) return getSavedList();
  const list = getSavedList().filter(item => item.place_id !== normalized.place_id);
  list.unshift(normalized);
  const trimmed = list.slice(0, STORAGE_LIMITS.saved);
  writeStorageList(STORAGE_KEYS.saved, trimmed);
  return trimmed;
}

function removePlace(id) {
  if (!id) return getSavedList();
  const list = getSavedList().filter(item => item.place_id !== id);
  writeStorageList(STORAGE_KEYS.saved, list);
  return list;
}

function getPlan() {
  return revivePlaces(STORAGE_KEYS.plan, STORAGE_LIMITS.plan);
}

function savePlan(list) {
  const incoming = Array.isArray(list) ? list : [];
  const sanitized = [];
  const seen = new Set();
  incoming.forEach(item => {
    const normalized = normalizePlace(item, { preserveTimestamp: true });
    if (!normalized || seen.has(normalized.place_id)) return;
    seen.add(normalized.place_id);
    sanitized.push(normalized);
  });
  const trimmed = sanitized.slice(0, STORAGE_LIMITS.plan);
  writeStorageList(STORAGE_KEYS.plan, trimmed);
  const validIds = trimmed.map(item => item.place_id);
  const visited = getVisitedPlan().filter(id => validIds.includes(id));
  saveVisitedPlan(visited);
  return trimmed;
}

function getVisitedPlan() {
  const list = readStorageList(STORAGE_KEYS.visited);
  return list.filter(id => typeof id === 'string' && id.trim()).map(id => id.trim());
}

function saveVisitedPlan(list) {
  const unique = Array.from(
    new Set(
      (Array.isArray(list) ? list : [])
        .map(id => (typeof id === 'string' ? id.trim() : null))
        .filter(Boolean)
    )
  );
  writeStorageList(STORAGE_KEYS.visited, unique);
  return unique;
}

function addToPlan(place) {
  const normalized = normalizePlace(place);
  if (!normalized) return getPlan();
  const current = getPlan().filter(item => item.place_id !== normalized.place_id);
  current.push(normalized);
  return savePlan(current);
}

function removeFromPlan(id) {
  if (!id) return getPlan();
  const current = getPlan().filter(item => item.place_id !== id);
  return savePlan(current);
}

function toggleVisited(id) {
  if (!id) return;
  const planHasId = getPlan().some(item => item.place_id === id);
  if (!planHasId) return;
  const visited = new Set(getVisitedPlan());
  if (visited.has(id)) visited.delete(id);
  else visited.add(id);
  saveVisitedPlan([...visited]);
}

// Unified data model for search results from multiple providers
function normalizePlaceData(place, provider) {
  if (!place) return null;
  
  const isGoogle = provider === 'google';
  const isFoursquare = provider === 'foursquare';
  
  // Extract ID
  const id = isGoogle ? place.place_id : (isFoursquare ? place.fsq_id : place.id);
  if (!id) return null;
  
  // Extract name
  const name = (place.name || '').trim() || 'Unnamed place';
  
  // Extract location
  let location = null;
  if (isGoogle && place.geometry?.location) {
    location = {
      lat: typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat,
      lng: typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng
    };
  } else if (isFoursquare) {
    location = {
      lat: place.lat || place.geocodes?.main?.latitude,
      lng: place.lng || place.geocodes?.main?.longitude
    };
  }
  
  // Extract address
  const address = place.formatted_address || place.vicinity || place.address || place.location?.formatted_address || '';
  
  // Extract rating
  const rating = typeof place.rating === 'number' ? place.rating : null;
  
  // Extract categories/types
  const categories = Array.isArray(place.types) ? place.types : 
                     Array.isArray(place.categories) ? place.categories.map(c => c.name || c) : [];
  
  return {
    id: id,
    provider: provider,
    name: name,
    address: address,
    location: location,
    rating: rating,
    user_ratings_total: place.user_ratings_total || null,
    categories: categories,
    distance: place.distance || null,
    icon: place.icon || '',
    // Keep original data for details lookup
    _original: place
  };
}

// De-duplicate merged results from multiple providers
function deduplicatePlaces(places) {
  if (!places || !Array.isArray(places) || places.length === 0) return [];
  
  const seen = new Map();
  const duplicates = new Set();
  
  // First pass: identify potential duplicates by name and proximity
  places.forEach((place, index) => {
    if (!place || !place.name || !place.location) return;
    
    const nameKey = place.name.toLowerCase().trim().replace(/[^\w\s]/g, '');
    
    if (!seen.has(nameKey)) {
      seen.set(nameKey, []);
    }
    seen.get(nameKey).push({ place, index });
  });
  
  // Second pass: check proximity for places with same/similar names
  seen.forEach((group) => {
    if (group.length <= 1) return;
    
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const place1 = group[i].place;
        const place2 = group[j].place;
        
        if (!place1.location || !place2.location) continue;
        
        // Calculate distance in meters
        const distance = calculateDistance(
          place1.location.lat, place1.location.lng,
          place2.location.lat, place2.location.lng
        );
        
        // If within 100 meters, consider duplicate
        if (distance < 100) {
          // Prefer Google over Foursquare, or the one with more data
          const keepPlace1 = place1.provider === 'google' || 
                            (place1.rating && !place2.rating) ||
                            (place1.user_ratings_total || 0) > (place2.user_ratings_total || 0);
          
          duplicates.add(keepPlace1 ? group[j].index : group[i].index);
        }
      }
    }
  });
  
  // Return filtered array
  return places.filter((_, index) => !duplicates.has(index));
}

// Calculate distance between two coordinates using Haversine formula
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
