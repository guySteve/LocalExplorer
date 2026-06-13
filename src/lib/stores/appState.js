// Core app state management using Svelte stores
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Theme configuration — single polished "naval" theme
export const DEFAULT_THEME = 'naval';
export const THEMES = {
  naval: {
    '--background': '#f8f7f2',
    '--card': '#1a2b44',
    '--card-rgb': '26, 43, 68',
    '--primary': '#c87941',
    '--primary-rgb': '200, 121, 65',
    '--secondary': '#334e68',
    '--text-dark': '#1a2b44',
    '--text-light': '#ffffff',
    '--accent': '#8a5a44',
    '--radius': '12px',
    '--button-radius': '12px',
    '--font-primary': 'Poppins, sans-serif',
    '--font-secondary': 'Raleway, sans-serif'
  }
};

// Reactive stores
export const currentTheme = writable(DEFAULT_THEME);
export const currentPosition = writable(null);
export const currentAddress = writable('');
export const currentResults = writable([]);
export const currentPlaceDetails = writable(null);
export const latestLocationLabel = writable('');
export const currentPaginationHandle = writable(null);
export const appendNextResults = writable(false);
export const lastResultsTitle = writable('Results');
export const pendingStreetViewLatLng = writable(null);

// Weather state
export const lastWeatherFetch = writable(0);
export const lastWeatherCoords = writable(null);
export const cachedWeather = writable(null);
export const WEATHER_CACHE_MS = 10 * 60 * 1000; // 10 minutes
export const currentWeatherCondition = writable('clear'); // Store current weather condition for context-aware sorting

// Voice settings
function getInitialVoiceUri() {
  if (browser) {
    return localStorage.getItem('selectedVoiceUri') || '';
  }
  return '';
}
export const selectedVoiceUri = writable(getInitialVoiceUri());

function getInitialBooleanSetting(key, defaultValue) {
  if (!browser) return defaultValue;
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return defaultValue;
    return saved === 'true';
  } catch (error) {
    console.warn(`Unable to read setting "${key}" from localStorage`, error);
    return defaultValue;
  }
}

export const showBirdSightings = writable(getInitialBooleanSetting('showBirdSightings', false)); // Default to OFF unless user enables
export const voiceNavigationEnabled = writable(getInitialBooleanSetting('voiceEnabled', true));

// Font size setting for accessibility
function getInitialFontSize() {
  if (!browser) return 'medium';
  try {
    const saved = localStorage.getItem('fontSize');
    return saved || 'medium';
  } catch (error) {
    console.warn('Unable to read fontSize from localStorage', error);
    return 'medium';
  }
}
export const fontSize = writable(getInitialFontSize());

// Network status
export const isOffline = writable(false);

// Search categories configuration - Refocused for exploration and discovery
export const categories = {
  'Hidden Gems': [
    { name: 'Libraries', type: 'library', primaryTypeOnly: true },
    { name: 'Book Stores', type: 'book_store', primaryTypeOnly: true },
    { name: 'Gardens', keyword: 'garden', type: 'park', primaryTypeOnly: true },
    { name: 'Historical Sites', keyword: 'historical site', type: 'point_of_interest' },
    { name: 'Local Favorites', keyword: 'local favorite', type: 'point_of_interest' },
    { name: 'Historical Markers', keyword: 'historical marker', type: 'point_of_interest' }
  ],
  'Outdoor': [
    { name: 'Parks', type: 'park', primaryTypeOnly: true },
    { name: 'Trails', keyword: 'hiking trail', type: 'park', primaryTypeOnly: true },
    { name: 'Nature Reserves', keyword: 'nature reserve', type: 'park', primaryTypeOnly: true },
    { name: 'Beaches', keyword: 'beach', type: 'park', primaryTypeOnly: true },
    { name: 'Campgrounds', keyword: 'campground', type: 'campground', primaryTypeOnly: true }
  ],
  'Recreation': [
    { name: 'Campgrounds', search: 'campground' },
    { name: 'Recreation Areas', search: 'recreation' },
    { name: 'National Parks', search: 'national_park' },
    { name: 'Pickleball Courts', keyword: 'pickleball court', type: 'sports_complex', primaryTypeOnly: false }
  ],
  'Geographic Features': [
    { name: 'Summits', keyword: 'summit', type: 'natural_feature', primaryTypeOnly: false },
    { name: 'Springs', keyword: 'spring', type: 'natural_feature', primaryTypeOnly: false },
    { name: 'Geological Formations', keyword: 'geological formation', type: 'natural_feature', primaryTypeOnly: false },
    { name: 'Valleys', keyword: 'valley', type: 'natural_feature', primaryTypeOnly: false },
    { name: 'Overlooks', keyword: 'scenic overlook', type: 'point_of_interest', primaryTypeOnly: false }
  ],
  'Local Provisions': [
    { name: 'Farmers Markets', keyword: 'farmers market', type: 'point_of_interest', primaryTypeOnly: false },
    { name: 'Bakeries', keyword: 'bakery', type: 'bakery', primaryTypeOnly: true },
    { name: 'Cafes', keyword: 'cafe', type: 'cafe', primaryTypeOnly: true },
    { name: 'Picnic Spots', keyword: 'picnic area', type: 'park', primaryTypeOnly: false },
    { name: 'Local Food', keyword: 'local food', type: 'restaurant', primaryTypeOnly: false }
  ],
  'Iconic Sights': [
    { name: 'Tourist Attractions', type: 'tourist_attraction', primaryTypeOnly: true },
    { name: 'Museums', type: 'museum', primaryTypeOnly: true },
    { name: 'Art Galleries', type: 'art_gallery', primaryTypeOnly: true },
    { name: 'Parks', type: 'park', primaryTypeOnly: true },
    { name: 'Landmarks', keyword: 'landmark', type: 'point_of_interest' }
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
  'Breweries': [
    { name: 'Nearby Breweries', search: 'breweries' },
    { name: 'Micro Breweries', search: 'micro' },
    { name: 'Brew Pubs', search: 'brewpub' }
  ],
  'Regional Bird Guide': [
    { name: 'Recent Sightings', value: 'bird-sightings' },
    { name: 'Rare Birds', value: 'rare-birds' },
    { name: 'Hotspots Near Me', value: 'bird-hotspots-nearby' },
    { name: 'Notable Species', value: 'bird-notable' }
  ]
};

// Apply theme to document
if (browser) {
  // Load saved theme first, before subscribing
  const savedTheme = localStorage.getItem('currentTheme');
  if (savedTheme && THEMES[savedTheme]) {
    currentTheme.set(savedTheme);
  }
  
  // Then subscribe to changes
  currentTheme.subscribe(themeKey => {
    const appliedKey = THEMES[themeKey] ? themeKey : DEFAULT_THEME;
    const theme = THEMES[appliedKey];
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    if (document.body) {
      document.body.dataset.theme = appliedKey;
    }
    localStorage.setItem('currentTheme', appliedKey);
  });

  showBirdSightings.subscribe(value => {
    localStorage.setItem('showBirdSightings', value ? 'true' : 'false');
  });

  voiceNavigationEnabled.subscribe(value => {
    localStorage.setItem('voiceEnabled', value ? 'true' : 'false');
  });

  selectedVoiceUri.subscribe(uri => {
    if (uri) {
      localStorage.setItem('selectedVoiceUri', uri);
    } else {
      localStorage.removeItem('selectedVoiceUri');
    }
  });

  fontSize.subscribe(size => {
    localStorage.setItem('fontSize', size);
    // Apply font size to body element only in browser environment
    if (typeof document !== 'undefined' && document.body) {
      document.body.setAttribute('data-font-size', size);
    }
  });
}
