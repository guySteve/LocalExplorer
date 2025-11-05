// Offline tile storage utility (Stage 3: Offline Tile Storage)
// Uses Cache API to store map tiles for offline use

const TILE_CACHE_NAME = 'leaflet-tiles-v1';
const MAX_CACHE_SIZE = 500; // Maximum number of tiles to cache
const TILE_PROVIDERS = {
  osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  topo: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
};

/**
 * Get the tile cache
 * @returns {Promise<Cache>} Cache instance
 */
async function getTileCache() {
  return await caches.open(TILE_CACHE_NAME);
}

/**
 * Generate tile URL for a given provider
 * @param {string} provider - Tile provider ('osm', 'topo', 'satellite')
 * @param {number} z - Zoom level
 * @param {number} x - Tile X coordinate
 * @param {number} y - Tile Y coordinate
 * @returns {string} Tile URL
 */
export function generateTileURL(provider, z, x, y) {
  const template = TILE_PROVIDERS[provider] || TILE_PROVIDERS.osm;
  
  // Handle subdomain (random selection for load balancing)
  const subdomains = ['a', 'b', 'c'];
  const subdomain = subdomains[Math.floor(Math.random() * subdomains.length)];
  
  return template
    .replace('{s}', subdomain)
    .replace('{z}', z)
    .replace('{x}', x)
    .replace('{y}', y);
}

/**
 * Cache a single tile
 * @param {string} url - Tile URL
 * @returns {Promise<boolean>} Success status
 */
export async function cacheTile(url) {
  try {
    const cache = await getTileCache();
    const response = await fetch(url);
    
    if (response.ok) {
      await cache.put(url, response);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error caching tile:', error);
    return false;
  }
}

/**
 * Check if a tile is cached
 * @param {string} url - Tile URL
 * @returns {Promise<boolean>} True if tile is cached
 */
export async function isTileCached(url) {
  try {
    const cache = await getTileCache();
    const response = await cache.match(url);
    return !!response;
  } catch (error) {
    console.error('Error checking tile cache:', error);
    return false;
  }
}

/**
 * Get a cached tile
 * @param {string} url - Tile URL
 * @returns {Promise<Response|null>} Cached response or null
 */
export async function getCachedTile(url) {
  try {
    const cache = await getTileCache();
    return await cache.match(url);
  } catch (error) {
    console.error('Error getting cached tile:', error);
    return null;
  }
}

/**
 * Calculate tiles needed for a bounding box
 * @param {Object} bounds - Bounding box { north, south, east, west }
 * @param {number} zoom - Zoom level
 * @returns {Array} Array of tile coordinates [{ x, y, z }]
 */
export function calculateTilesForBounds(bounds, zoom) {
  const { north, south, east, west } = bounds;
  
  // Convert lat/lng to tile coordinates
  const nwTile = latLngToTile(north, west, zoom);
  const seTile = latLngToTile(south, east, zoom);
  
  const tiles = [];
  
  for (let x = Math.min(nwTile.x, seTile.x); x <= Math.max(nwTile.x, seTile.x); x++) {
    for (let y = Math.min(nwTile.y, seTile.y); y <= Math.max(nwTile.y, seTile.y); y++) {
      tiles.push({ x, y, z: zoom });
    }
  }
  
  return tiles;
}

/**
 * Convert lat/lng to tile coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} zoom - Zoom level
 * @returns {Object} Tile coordinates { x, y }
 */
function latLngToTile(lat, lng, zoom) {
  const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  return { x, y };
}

/**
 * Download tiles for a region
 * @param {Object} options - Download options
 * @returns {Promise<Object>} Download results
 */
export async function downloadRegionTiles(options) {
  const {
    bounds,
    minZoom = 10,
    maxZoom = 15,
    provider = 'osm',
    onProgress = null
  } = options;
  
  const results = {
    total: 0,
    success: 0,
    failed: 0,
    cancelled: false
  };
  
  try {
    // Calculate total tiles needed
    let allTiles = [];
    for (let z = minZoom; z <= maxZoom; z++) {
      const tiles = calculateTilesForBounds(bounds, z);
      allTiles = allTiles.concat(tiles);
    }
    
    results.total = allTiles.length;
    
    // Limit total tiles to prevent excessive downloads
    if (results.total > 1000) {
      throw new Error(`Too many tiles (${results.total}). Please select a smaller area or fewer zoom levels.`);
    }
    
    // Download tiles with rate limiting
    const batchSize = 5;
    for (let i = 0; i < allTiles.length; i += batchSize) {
      if (results.cancelled) break;
      
      const batch = allTiles.slice(i, i + batchSize);
      const promises = batch.map(async (tile) => {
        const url = generateTileURL(provider, tile.z, tile.x, tile.y);
        const success = await cacheTile(url);
        
        if (success) {
          results.success++;
        } else {
          results.failed++;
        }
        
        if (onProgress) {
          onProgress({
            current: results.success + results.failed,
            total: results.total,
            success: results.success,
            failed: results.failed
          });
        }
      });
      
      await Promise.all(promises);
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  } catch (error) {
    console.error('Error downloading tiles:', error);
    throw error;
  }
}

/**
 * Get cached tile count
 * @returns {Promise<number>} Number of cached tiles
 */
export async function getCachedTileCount() {
  try {
    const cache = await getTileCache();
    const keys = await cache.keys();
    return keys.length;
  } catch (error) {
    console.error('Error getting cache count:', error);
    return 0;
  }
}

/**
 * Clear all cached tiles
 * @returns {Promise<boolean>} Success status
 */
export async function clearTileCache() {
  try {
    return await caches.delete(TILE_CACHE_NAME);
  } catch (error) {
    console.error('Error clearing tile cache:', error);
    return false;
  }
}

/**
 * Get cache size estimate in bytes
 * @returns {Promise<number>} Cache size in bytes
 */
export async function getCacheSize() {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error estimating cache size:', error);
    return 0;
  }
}

/**
 * Prune cache to remove oldest tiles if exceeding limit
 * @returns {Promise<number>} Number of tiles removed
 */
export async function pruneTileCache() {
  try {
    const cache = await getTileCache();
    const keys = await cache.keys();
    
    if (keys.length <= MAX_CACHE_SIZE) {
      return 0;
    }
    
    // Remove oldest tiles (simple FIFO strategy)
    const toRemove = keys.length - MAX_CACHE_SIZE;
    const removed = keys.slice(0, toRemove);
    
    for (const request of removed) {
      await cache.delete(request);
    }
    
    return removed.length;
  } catch (error) {
    console.error('Error pruning cache:', error);
    return 0;
  }
}

/**
 * Create a custom tile layer that uses cache first
 * @param {L.Map} map - Leaflet map instance
 * @param {string} provider - Tile provider
 * @returns {L.TileLayer} Tile layer instance
 */
export function createOfflineTileLayer(L, provider = 'osm') {
  const template = TILE_PROVIDERS[provider] || TILE_PROVIDERS.osm;
  
  const layer = L.tileLayer(template, {
    attribution: getAttribution(provider),
    maxZoom: 19,
    // Override tile loading to check cache first
    crossOrigin: true
  });
  
  // Hook into tile loading
  const originalCreateTile = layer.createTile;
  layer.createTile = function(coords, done) {
    const tile = originalCreateTile.call(this, coords, done);
    const url = this.getTileUrl(coords);
    
    // Try to load from cache first
    getCachedTile(url).then(cachedResponse => {
      if (cachedResponse) {
        cachedResponse.blob().then(blob => {
          tile.src = URL.createObjectURL(blob);
        });
      }
      // If not cached, normal fetch will occur via tile.src
    }).catch(error => {
      console.warn('Error loading cached tile:', error);
    });
    
    return tile;
  };
  
  return layer;
}

/**
 * Get attribution for tile provider
 * @param {string} provider - Tile provider
 * @returns {string} Attribution HTML
 */
function getAttribution(provider) {
  const attributions = {
    osm: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    topo: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
    satellite: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  };
  
  return attributions[provider] || attributions.osm;
}

export { TILE_CACHE_NAME, MAX_CACHE_SIZE, TILE_PROVIDERS };
