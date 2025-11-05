// Leaflet map utilities for offline-capable maps
import L from 'leaflet';

/**
 * Initialize Leaflet default icons
 * Call this once when the app loads to fix icon paths
 */
export function initLeafletIcons() {
  // Fix Leaflet default icon paths for bundlers
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

/**
 * Create a Leaflet map instance
 * @param {HTMLElement} container - Container element for the map
 * @param {Object} options - Map options
 * @returns {L.Map} Leaflet map instance
 */
export function createMap(container, options = {}) {
  const defaultOptions = {
    center: options.center || [0, 0],
    zoom: options.zoom || 13,
    zoomControl: options.zoomControl !== false,
    attributionControl: options.attributionControl !== false,
  };

  const map = L.map(container, defaultOptions);

  // Add default tile layer (OpenStreetMap)
  addTileLayer(map, options.tileLayer || 'osm');

  return map;
}

/**
 * Add a tile layer to the map
 * @param {L.Map} map - Leaflet map instance
 * @param {string} provider - Tile provider ('osm', 'topo', 'satellite')
 */
export function addTileLayer(map, provider = 'osm') {
  // Remove existing tile layers
  map.eachLayer((layer) => {
    if (layer instanceof L.TileLayer) {
      map.removeLayer(layer);
    }
  });

  let tileLayer;
  
  switch (provider) {
    case 'topo':
      // OpenTopoMap
      tileLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
        maxZoom: 17,
      });
      break;
    
    case 'satellite':
      // Esri World Imagery
      tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19,
      });
      break;
    
    case 'osm':
    default:
      // OpenStreetMap
      tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      });
      break;
  }

  tileLayer.addTo(map);
  return tileLayer;
}

/**
 * Add a marker to the map
 * @param {L.Map} map - Leaflet map instance
 * @param {Object} location - Location object with lat and lng
 * @param {Object} options - Marker options
 * @returns {L.Marker} Leaflet marker instance
 */
export function addMarker(map, location, options = {}) {
  const { lat, lng } = location;
  
  if (!lat || !lng) {
    console.warn('Invalid location for marker:', location);
    return null;
  }

  const marker = L.marker([lat, lng], {
    title: options.title || '',
    draggable: options.draggable || false,
  });

  if (options.popup) {
    marker.bindPopup(options.popup);
  }

  marker.addTo(map);
  return marker;
}

/**
 * Calculate distance between two points (Haversine formula)
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in meters
 */
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

/**
 * Calculate bearing between two points
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Bearing in degrees (0-360)
 */
export function calculateBearing(lat1, lng1, lat2, lng2) {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Center map on location with optional zoom
 * @param {L.Map} map - Leaflet map instance
 * @param {Object} location - Location object with lat and lng
 * @param {number} zoom - Optional zoom level
 */
export function centerMap(map, location, zoom = null) {
  const { lat, lng } = location;
  if (!lat || !lng) return;
  
  if (zoom !== null) {
    map.setView([lat, lng], zoom);
  } else {
    map.panTo([lat, lng]);
  }
}

/**
 * Fit map to show all markers
 * @param {L.Map} map - Leaflet map instance
 * @param {Array} locations - Array of location objects with lat and lng
 * @param {Object} options - Fit bounds options
 */
export function fitBounds(map, locations, options = {}) {
  if (!locations || locations.length === 0) return;
  
  const bounds = L.latLngBounds(
    locations.map(loc => [loc.lat, loc.lng])
  );
  
  map.fitBounds(bounds, {
    padding: options.padding || [50, 50],
    maxZoom: options.maxZoom || 15,
  });
}

/**
 * Create a custom marker icon
 * @param {Object} options - Icon options
 * @returns {L.Icon} Leaflet icon instance
 */
export function createCustomIcon(options = {}) {
  return L.icon({
    iconUrl: options.iconUrl || 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: options.iconRetinaUrl || 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: options.shadowUrl || 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: options.iconSize || [25, 41],
    iconAnchor: options.iconAnchor || [12, 41],
    popupAnchor: options.popupAnchor || [1, -34],
    shadowSize: options.shadowSize || [41, 41],
  });
}
