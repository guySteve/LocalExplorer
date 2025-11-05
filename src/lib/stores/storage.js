// Storage utilities for persisting user data
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export const STORAGE_KEYS = {
  saved: 'localExplorer.savedPlaces',
  plan: 'localExplorer.plan',
  visited: 'localExplorer.visitedPlan',
  dayPlan: 'localExplorer.dayPlan',
  customPOIs: 'localExplorer.customPOIs',
  userNotes: 'localExplorer.userNotes',
  gpsTrack: 'localExplorer.gpsTracks'
};

export const STORAGE_LIMITS = {
  saved: 60,
  plan: 40,
  dayPlan: 20,
  customPOIs: 100,
  gpsTracks: 50
};

const storageFallback = Object.create(null);

function getStorage() {
  if (!browser) return null;
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch (error) {
    console.warn('localStorage not available:', error);
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

export function normalizePlace(place, options = {}) {
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

// Saved places store
function createSavedPlacesStore() {
  const { subscribe, set, update } = writable(browser ? revivePlaces(STORAGE_KEYS.saved, STORAGE_LIMITS.saved) : []);

  return {
    subscribe,
    add: (place) => {
      const normalized = normalizePlace(place);
      if (!normalized) return;
      update(list => {
        const filtered = list.filter(item => item.place_id !== normalized.place_id);
        filtered.unshift(normalized);
        const trimmed = filtered.slice(0, STORAGE_LIMITS.saved);
        writeStorageList(STORAGE_KEYS.saved, trimmed);
        return trimmed;
      });
    },
    remove: (id) => {
      if (!id) return;
      update(list => {
        const filtered = list.filter(item => item.place_id !== id);
        writeStorageList(STORAGE_KEYS.saved, filtered);
        return filtered;
      });
    },
    refresh: () => {
      set(revivePlaces(STORAGE_KEYS.saved, STORAGE_LIMITS.saved));
    }
  };
}

// Plan store
function createPlanStore() {
  const { subscribe, set, update } = writable(browser ? revivePlaces(STORAGE_KEYS.plan, STORAGE_LIMITS.plan) : []);

  return {
    subscribe,
    add: (place) => {
      const normalized = normalizePlace(place);
      if (!normalized) return;
      update(list => {
        const filtered = list.filter(item => item.place_id !== normalized.place_id);
        filtered.push(normalized);
        const trimmed = filtered.slice(0, STORAGE_LIMITS.plan);
        writeStorageList(STORAGE_KEYS.plan, trimmed);
        return trimmed;
      });
    },
    remove: (id) => {
      if (!id) return;
      update(list => {
        const filtered = list.filter(item => item.place_id !== id);
        writeStorageList(STORAGE_KEYS.plan, filtered);
        
        // Clean up visited list
        const validIds = filtered.map(item => item.place_id);
        const visited = getVisitedPlan().filter(vid => validIds.includes(vid));
        saveVisitedPlan(visited);
        
        return filtered;
      });
    },
    set: (list) => {
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
      set(trimmed);
    },
    refresh: () => {
      set(revivePlaces(STORAGE_KEYS.plan, STORAGE_LIMITS.plan));
    }
  };
}

// Visited places in plan
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

// Visited plan store
function createVisitedPlanStore() {
  const { subscribe, set, update } = writable(browser ? getVisitedPlan() : []);

  return {
    subscribe,
    toggle: (id) => {
      if (!id) return;
      update(visited => {
        const visitedSet = new Set(visited);
        if (visitedSet.has(id)) {
          visitedSet.delete(id);
        } else {
          visitedSet.add(id);
        }
        const result = [...visitedSet];
        saveVisitedPlan(result);
        return result;
      });
    },
    refresh: () => {
      set(getVisitedPlan());
    }
  };
}

export const savedPlaces = createSavedPlacesStore();
export const plan = createPlanStore();
export const visitedPlan = createVisitedPlanStore();

// Day Plan store for trip planning
function createDayPlanStore() {
  const { subscribe, set, update } = writable(browser ? revivePlaces(STORAGE_KEYS.dayPlan, STORAGE_LIMITS.dayPlan) : []);

  return {
    subscribe,
    add: (place) => {
      const normalized = normalizePlace(place);
      if (!normalized) return;
      update(list => {
        // Check if already in plan
        const filtered = list.filter(item => item.place_id !== normalized.place_id);
        // Add to end of list for trip order
        filtered.push(normalized);
        const trimmed = filtered.slice(0, STORAGE_LIMITS.dayPlan);
        writeStorageList(STORAGE_KEYS.dayPlan, trimmed);
        return trimmed;
      });
    },
    remove: (id) => {
      if (!id) return;
      update(list => {
        const filtered = list.filter(item => item.place_id !== id);
        writeStorageList(STORAGE_KEYS.dayPlan, filtered);
        return filtered;
      });
    },
    set: (list) => {
      const incoming = Array.isArray(list) ? list : [];
      const sanitized = [];
      const seen = new Set();
      incoming.forEach(item => {
        const normalized = normalizePlace(item, { preserveTimestamp: true });
        if (!normalized || seen.has(normalized.place_id)) return;
        seen.add(normalized.place_id);
        sanitized.push(normalized);
      });
      const trimmed = sanitized.slice(0, STORAGE_LIMITS.dayPlan);
      writeStorageList(STORAGE_KEYS.dayPlan, trimmed);
      set(trimmed);
    },
    refresh: () => {
      set(revivePlaces(STORAGE_KEYS.dayPlan, STORAGE_LIMITS.dayPlan));
    },
    clear: () => {
      writeStorageList(STORAGE_KEYS.dayPlan, []);
      set([]);
    }
  };
}

export const dayPlan = createDayPlanStore();

// Data normalization utilities
export function normalizePlaceData(place, provider) {
  if (!place) return null;
  
  const isGoogle = provider === 'google';
  const isFoursquare = provider === 'foursquare';
  
  const id = isGoogle ? place.place_id : (isFoursquare ? place.fsq_id : place.id);
  if (!id) return null;
  
  const name = (place.name || '').trim() || 'Unnamed place';
  
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
  
  const address = place.formatted_address || place.vicinity || place.address || place.location?.formatted_address || '';
  const rating = typeof place.rating === 'number' ? place.rating : null;
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
    _original: place
  };
}

// Calculate distance using Haversine formula
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// De-duplicate merged results from multiple providers
export function deduplicatePlaces(places) {
  if (!places || !Array.isArray(places) || places.length === 0) return [];
  
  const seen = new Map();
  const duplicates = new Set();
  
  places.forEach((place, index) => {
    if (!place || !place.name || !place.location) return;
    
    const nameKey = place.name.toLowerCase().trim().replace(/[^\w\s]/g, '');
    
    if (!seen.has(nameKey)) {
      seen.set(nameKey, []);
    }
    seen.get(nameKey).push({ place, index });
  });
  
  seen.forEach((group) => {
    if (group.length <= 1) return;
    
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const place1 = group[i].place;
        const place2 = group[j].place;
        
        if (!place1.location || !place2.location) continue;
        
        const distance = calculateDistance(
          place1.location.lat, place1.location.lng,
          place2.location.lat, place2.location.lng
        );
        
        if (distance < 100) {
          const keepPlace1 = place1.provider === 'google' || 
                            (place1.rating && !place2.rating) ||
                            (place1.user_ratings_total || 0) > (place2.user_ratings_total || 0);
          
          duplicates.add(keepPlace1 ? group[j].index : group[i].index);
        }
      }
    }
  });
  
  return places.filter((_, index) => !duplicates.has(index));
}

// Custom POI store for user-created points of interest
function createCustomPOIStore() {
  const { subscribe, set, update } = writable(browser ? readStorageList(STORAGE_KEYS.customPOIs) : []);

  return {
    subscribe,
    add: (poi) => {
      if (!poi || !poi.name || !poi.location) return;
      const customPOI = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: poi.name,
        location: poi.location,
        notes: poi.notes || '',
        tags: Array.isArray(poi.tags) ? poi.tags : [],
        photos: Array.isArray(poi.photos) ? poi.photos : [],
        created: Date.now(),
        isCustom: true
      };
      update(list => {
        const newList = [customPOI, ...list].slice(0, STORAGE_LIMITS.customPOIs);
        writeStorageList(STORAGE_KEYS.customPOIs, newList);
        return newList;
      });
      return customPOI.id;
    },
    update: (id, updates) => {
      if (!id) return;
      update(list => {
        const newList = list.map(poi => 
          poi.id === id ? { ...poi, ...updates, updated: Date.now() } : poi
        );
        writeStorageList(STORAGE_KEYS.customPOIs, newList);
        return newList;
      });
    },
    remove: (id) => {
      if (!id) return;
      update(list => {
        const newList = list.filter(poi => poi.id !== id);
        writeStorageList(STORAGE_KEYS.customPOIs, newList);
        return newList;
      });
    },
    refresh: () => {
      set(readStorageList(STORAGE_KEYS.customPOIs));
    }
  };
}

// User notes store for adding notes to any POI (custom or official)
function createUserNotesStore() {
  const { subscribe, set, update } = writable(browser ? readStorageList(STORAGE_KEYS.userNotes) : {});

  return {
    subscribe,
    set: (placeId, note) => {
      if (!placeId) return;
      update(notes => {
        const newNotes = { ...notes, [placeId]: { text: note, updated: Date.now() } };
        writeStorageList(STORAGE_KEYS.userNotes, newNotes);
        return newNotes;
      });
    },
    get: (placeId) => {
      let result = null;
      subscribe(notes => { result = notes[placeId] || null; })();
      return result;
    },
    remove: (placeId) => {
      if (!placeId) return;
      update(notes => {
        const newNotes = { ...notes };
        delete newNotes[placeId];
        writeStorageList(STORAGE_KEYS.userNotes, newNotes);
        return newNotes;
      });
    },
    refresh: () => {
      set(readStorageList(STORAGE_KEYS.userNotes) || {});
    }
  };
}

// GPS Track store for recording tracks
function createGPSTrackStore() {
  const { subscribe, set, update } = writable(browser ? readStorageList(STORAGE_KEYS.gpsTrack) : []);

  return {
    subscribe,
    add: (track) => {
      if (!track || !track.name || !Array.isArray(track.points) || track.points.length === 0) return;
      const gpsTrack = {
        id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: track.name,
        points: track.points,
        distance: track.distance || 0,
        duration: track.duration || 0,
        created: Date.now(),
        notes: track.notes || ''
      };
      update(list => {
        const newList = [gpsTrack, ...list].slice(0, STORAGE_LIMITS.gpsTracks);
        writeStorageList(STORAGE_KEYS.gpsTrack, newList);
        return newList;
      });
      return gpsTrack.id;
    },
    remove: (id) => {
      if (!id) return;
      update(list => {
        const newList = list.filter(track => track.id !== id);
        writeStorageList(STORAGE_KEYS.gpsTrack, newList);
        return newList;
      });
    },
    refresh: () => {
      set(readStorageList(STORAGE_KEYS.gpsTrack));
    }
  };
}

export const customPOIs = createCustomPOIStore();
export const userNotes = createUserNotesStore();
export const gpsTracks = createGPSTrackStore();
