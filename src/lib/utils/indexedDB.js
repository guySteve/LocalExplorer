// IndexedDB utility for local POI database (Stage 2: Local POI Database)

const DB_NAME = 'LocalExplorerDB';
const DB_VERSION = 1;
const STORES = {
  POIS: 'pois',
  CATEGORIES: 'categories',
  SEARCH_CACHE: 'searchCache',
  SYNC_METADATA: 'syncMetadata'
};

let dbInstance = null;

/**
 * Initialize IndexedDB database
 * @returns {Promise<IDBDatabase>} Database instance
 */
export async function initDB() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('IndexedDB initialized successfully');
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // POIs store - stores all points of interest
      if (!db.objectStoreNames.contains(STORES.POIS)) {
        const poiStore = db.createObjectStore(STORES.POIS, { keyPath: 'id' });
        poiStore.createIndex('category', 'category', { unique: false });
        poiStore.createIndex('name', 'name', { unique: false });
        poiStore.createIndex('location', ['lat', 'lng'], { unique: false });
        poiStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      }

      // Categories store - stores category definitions
      if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
        db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
      }

      // Search cache - caches search results
      if (!db.objectStoreNames.contains(STORES.SEARCH_CACHE)) {
        const cacheStore = db.createObjectStore(STORES.SEARCH_CACHE, { keyPath: 'query' });
        cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Sync metadata - tracks last sync times
      if (!db.objectStoreNames.contains(STORES.SYNC_METADATA)) {
        db.createObjectStore(STORES.SYNC_METADATA, { keyPath: 'key' });
      }

      console.log('IndexedDB schema created');
    };
  });
}

/**
 * Add or update a POI in the database
 * @param {Object} poi - POI object
 * @returns {Promise<string>} POI ID
 */
export async function savePOI(poi) {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.POIS], 'readwrite');
    const store = transaction.objectStore(STORES.POIS);
    
    const poiData = {
      ...poi,
      id: poi.id || `poi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lastUpdated: Date.now()
    };
    
    const request = store.put(poiData);
    
    request.onsuccess = () => resolve(poiData.id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a POI by ID
 * @param {string} id - POI ID
 * @returns {Promise<Object|null>} POI object or null
 */
export async function getPOI(id) {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.POIS], 'readonly');
    const store = transaction.objectStore(STORES.POIS);
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Search POIs by various criteria
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Array of POI objects
 */
export async function searchPOIs(options = {}) {
  const db = await initDB();
  const { category, name, bounds, limit = 100 } = options;
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.POIS], 'readonly');
    const store = transaction.objectStore(STORES.POIS);
    
    let request;
    
    if (category) {
      const index = store.index('category');
      request = index.getAll(category);
    } else if (name) {
      const index = store.index('name');
      request = index.getAll();
    } else {
      request = store.getAll();
    }
    
    request.onsuccess = () => {
      let results = request.result || [];
      
      // Filter by name if provided
      if (name) {
        const searchTerm = name.toLowerCase();
        results = results.filter(poi => 
          poi.name && poi.name.toLowerCase().includes(searchTerm)
        );
      }
      
      // Filter by bounds if provided
      if (bounds) {
        const { north, south, east, west } = bounds;
        results = results.filter(poi => 
          poi.lat >= south && poi.lat <= north &&
          poi.lng >= west && poi.lng <= east
        );
      }
      
      // Apply limit
      if (limit) {
        results = results.slice(0, limit);
      }
      
      resolve(results);
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get POIs near a location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusKm - Radius in kilometers
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} Array of nearby POI objects
 */
export async function getNearbyPOIs(lat, lng, radiusKm = 10, options = {}) {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.POIS], 'readonly');
    const store = transaction.objectStore(STORES.POIS);
    const request = store.getAll();
    
    request.onsuccess = () => {
      let results = request.result || [];
      
      // Calculate distance and filter
      results = results
        .map(poi => {
          if (!poi.lat || !poi.lng) return null;
          
          const distance = calculateDistance(lat, lng, poi.lat, poi.lng);
          return { ...poi, distance };
        })
        .filter(poi => poi && poi.distance <= radiusKm * 1000) // Convert km to meters
        .sort((a, b) => a.distance - b.distance);
      
      // Filter by category if provided
      if (options.category) {
        results = results.filter(poi => poi.category === options.category);
      }
      
      // Apply limit
      if (options.limit) {
        results = results.slice(0, options.limit);
      }
      
      resolve(results);
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a POI by ID
 * @param {string} id - POI ID
 * @returns {Promise<void>}
 */
export async function deletePOI(id) {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.POIS], 'readwrite');
    const store = transaction.objectStore(STORES.POIS);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Bulk insert POIs
 * @param {Array} pois - Array of POI objects
 * @returns {Promise<number>} Number of POIs inserted
 */
export async function bulkInsertPOIs(pois) {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.POIS], 'readwrite');
    const store = transaction.objectStore(STORES.POIS);
    
    let count = 0;
    
    pois.forEach(poi => {
      const poiData = {
        ...poi,
        id: poi.id || `poi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        lastUpdated: Date.now()
      };
      
      store.put(poiData);
      count++;
    });
    
    transaction.oncomplete = () => resolve(count);
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Clear all POIs from the database
 * @returns {Promise<void>}
 */
export async function clearPOIs() {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.POIS], 'readwrite');
    const store = transaction.objectStore(STORES.POIS);
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get sync metadata
 * @param {string} key - Metadata key
 * @returns {Promise<Object|null>} Metadata object or null
 */
export async function getSyncMetadata(key) {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SYNC_METADATA], 'readonly');
    const store = transaction.objectStore(STORES.SYNC_METADATA);
    const request = store.get(key);
    
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save sync metadata
 * @param {string} key - Metadata key
 * @param {Object} data - Metadata to save
 * @returns {Promise<void>}
 */
export async function saveSyncMetadata(key, data) {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SYNC_METADATA], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_METADATA);
    const request = store.put({ key, ...data, lastUpdated: Date.now() });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in meters
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
 * Get database statistics
 * @returns {Promise<Object>} Database statistics
 */
export async function getDBStats() {
  const db = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.POIS], 'readonly');
    const store = transaction.objectStore(STORES.POIS);
    const countRequest = store.count();
    
    countRequest.onsuccess = () => {
      resolve({
        totalPOIs: countRequest.result,
        dbVersion: DB_VERSION,
        dbName: DB_NAME
      });
    };
    
    countRequest.onerror = () => reject(countRequest.error);
  });
}

export { STORES, DB_NAME, DB_VERSION };
