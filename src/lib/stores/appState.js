// Core app state management using Svelte stores
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Theme configuration
export const DEFAULT_THEME = 'naval';
export const THEMES = {
  naval:    { '--background': '#f8f7f2', '--card': '#1a2b44', '--primary': '#c87941', '--secondary': '#334e68', '--text-dark': '#1a2b44', '--text-light': '#ffffff', '--accent': '#8a5a44', '--button-radius': '12px', '--font-primary': 'Poppins, sans-serif', '--font-secondary': 'Raleway, sans-serif' },
  sunset:   { '--background': '#1b1c3d', '--card': '#ef476f', '--primary': '#ffd166', '--secondary': '#073b4c', '--text-dark': '#f7f5ff', '--text-light': '#fff8f0', '--accent': '#06d6a0', '--button-radius': '12px', '--font-primary': 'Poppins, sans-serif', '--font-secondary': 'Raleway, sans-serif' },
  neon:     { '--background': '#080b1a', '--card': '#16213e', '--primary': '#ff4d6d', '--secondary': '#38d9a9', '--text-dark': '#f4f4ff', '--text-light': '#f8f9ff', '--accent': '#4cc9f0', '--button-radius': '12px', '--font-primary': 'Poppins, sans-serif', '--font-secondary': 'Raleway, sans-serif' },
  arctic:   { '--background': '#e9f4fb', '--card': '#1b3b5f', '--primary': '#3d9be9', '--secondary': '#1f5673', '--text-dark': '#1b3b5f', '--text-light': '#ffffff', '--accent': '#8bc6ec', '--button-radius': '12px', '--font-primary': 'Poppins, sans-serif', '--font-secondary': 'Raleway, sans-serif' },
  highseas: { '--background': '#050a1c', '--card': '#0f2447', '--primary': '#1dd3b0', '--secondary': '#16355f', '--text-dark': '#d7f3ff', '--text-light': '#f0fbff', '--accent': '#58a4ff', '--button-radius': '12px', '--font-primary': 'Poppins, sans-serif', '--font-secondary': 'Raleway, sans-serif' },
  aurora:   { '--background': '#060b1b', '--card': '#102a43', '--primary': '#7f5af0', '--secondary': '#2cb67d', '--text-dark': '#e6f0ff', '--text-light': '#f7f2ff', '--accent': '#64dfdf', '--button-radius': '12px', '--font-primary': 'Poppins, sans-serif', '--font-secondary': 'Raleway, sans-serif' },
  arcane:   { '--background': '#0b0d1f', '--card': '#2b1f4d', '--primary': '#cf6bff', '--secondary': '#5c3dc1', '--text-dark': '#f3eafa', '--text-light': '#fdf7ff', '--accent': '#f7c873', '--button-radius': '12px', '--font-primary': 'Poppins, sans-serif', '--font-secondary': 'Raleway, sans-serif' },
  solstice: { '--background': '#fff7eb', '--card': '#255270', '--primary': '#fa824c', '--secondary': '#3f7cbf', '--text-dark': '#1f3346', '--text-light': '#ffffff', '--accent': '#ffd275', '--button-radius': '12px', '--font-primary': 'Poppins, sans-serif', '--font-secondary': 'Raleway, sans-serif' },
  evergreen:{ '--background': '#f2f7ee', '--card': '#2d4a3a', '--primary': '#74b49b', '--secondary': '#3b6b52', '--text-dark': '#22352c', '--text-light': '#fdfdf9', '--accent': '#d9a441', '--button-radius': '12px', '--font-primary': 'Poppins, sans-serif', '--font-secondary': 'Raleway, sans-serif' },
  voyager:  { '--background': '#0a0f2b', '--card': '#182952', '--primary': '#4cc9f0', '--secondary': '#4361ee', '--text-dark': '#dbe8ff', '--text-light': '#eef5ff', '--accent': '#fca311', '--button-radius': '12px', '--font-primary': 'Poppins, sans-serif', '--font-secondary': 'Raleway, sans-serif' },
  monochrome:{ '--background': '#f6f6f6', '--card': '#1e1e1e', '--primary': '#4c4c4c', '--secondary': '#2f2f2f', '--text-dark': '#1e1e1e', '--text-light': '#ffffff', '--accent': '#888888', '--button-radius': '12px', '--font-primary': 'Poppins, sans-serif', '--font-secondary': 'Raleway, sans-serif' },
  playful:  { '--background': '#fff3f8', '--card': '#ff7eb6', '--primary': '#ffd23f', '--secondary': '#5f6dec', '--text-dark': '#273043', '--text-light': '#ffffff', '--accent': '#ff6b6b', '--button-radius': '12px', '--font-primary': 'Poppins, sans-serif', '--font-secondary': 'Raleway, sans-serif' },
  retro90:  { '--background': '#1a0b2a', '--card': '#ff5dad', '--primary': '#00f5d4', '--secondary': '#845ef7', '--text-dark': '#fef9ff', '--text-light': '#ffffff', '--accent': '#ffd23f', '--button-radius': '4px', '--font-primary': 'Press Start 2P, monospace', '--font-secondary': 'Press Start 2P, monospace' },
  groove70: { '--background': '#fff2d7', '--card': '#d2691e', '--primary': '#ffb347', '--secondary': '#ef476f', '--text-dark': '#402218', '--text-light': '#fffaf2', '--accent': '#ffa69e', '--button-radius': '16px', '--font-primary': 'Poppins, sans-serif', '--font-secondary': 'Raleway, sans-serif' },
  mojave:   { '--background': '#fff3e1', '--card': '#4a2c22', '--primary': '#f4a259', '--secondary': '#bc5f34', '--text-dark': '#3f2a1b', '--text-light': '#fffaf5', '--accent': '#f7c59f', '--button-radius': '12px', '--font-primary': 'Poppins, sans-serif', '--font-secondary': 'Raleway, sans-serif' },
  atomic50: { '--background': '#e8f5f0', '--card': '#2b4c3e', '--primary': '#ff6b6b', '--secondary': '#4ecdc4', '--text-dark': '#1a3329', '--text-light': '#ffffff', '--accent': '#95e1d3', '--button-radius': '30px', '--font-primary': 'Poppins, sans-serif', '--font-secondary': 'Raleway, sans-serif' },
  psychedelic60: { '--background': '#ffd93d', '--card': '#6bcf7f', '--primary': '#ff6bcf', '--secondary': '#6b5fff', '--text-dark': '#2b1b3d', '--text-light': '#ffffff', '--accent': '#ff9d3d', '--button-radius': '0px', '--font-primary': 'Poppins, sans-serif', '--font-secondary': 'Helvetica, Arial, sans-serif' },
  arcade80: { '--background': '#0a0a0a', '--card': '#ff2079', '--primary': '#00ffff', '--secondary': '#ff00ff', '--text-dark': '#00ffff', '--text-light': '#ffffff', '--accent': '#ffff00', '--button-radius': '0px', '--font-primary': 'Press Start 2P, monospace', '--font-secondary': 'Roboto Mono, monospace' },
  y2k00:    { '--background': '#e0f7fa', '--card': '#0288d1', '--primary': '#00acc1', '--secondary': '#0097a7', '--text-dark': '#01579b', '--text-light': '#ffffff', '--accent': '#b2ebf2', '--button-radius': '8px', '--font-primary': 'Tahoma, Arial, sans-serif', '--font-secondary': 'Arial, sans-serif' },
  metro10:  { '--background': '#ffffff', '--card': '#2c3e50', '--primary': '#e74c3c', '--secondary': '#3498db', '--text-dark': '#2c3e50', '--text-light': '#ffffff', '--accent': '#95a5a6', '--button-radius': '0px', '--font-primary': 'Roboto, sans-serif', '--font-secondary': 'Roboto, sans-serif' },
  sushi:    { '--background': '#f5f5f5', '--card': '#1a1a1a', '--primary': '#e91e63', '--secondary': '#4caf50', '--text-dark': '#1a1a1a', '--text-light': '#ffffff', '--accent': '#ffc107', '--button-radius': '4px', '--font-primary': 'Noto Sans JP, sans-serif', '--font-secondary': 'Noto Sans JP, sans-serif' },
  bbq:      { '--background': '#3e2723', '--card': '#d32f2f', '--primary': '#ff6f00', '--secondary': '#5d4037', '--text-dark': '#fff3e0', '--text-light': '#ffffff', '--accent': '#ffab91', '--button-radius': '8px', '--font-primary': 'Rye, serif', '--font-secondary': 'Merriweather, serif' },
  cafe:     { '--background': '#fff8e1', '--card': '#5d4037', '--primary': '#8d6e63', '--secondary': '#6d4c41', '--text-dark': '#3e2723', '--text-light': '#ffffff', '--accent': '#bcaaa4', '--button-radius': '12px', '--font-primary': 'Merriweather, serif', '--font-secondary': 'Merriweather, serif' },
  broncos:  { '--background': '#002244', '--card': '#FB4F14', '--primary': '#FB4F14', '--secondary': '#002244', '--text-dark': '#FFFFFF', '--text-light': '#FFFFFF', '--accent': '#FFB612', '--button-radius': '8px', '--font-primary': 'Impact, sans-serif', '--font-secondary': 'Arial Black, sans-serif' }
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

export const showBirdSightings = writable(getInitialBooleanSetting('showBirdSightings', true));
export const sassyWeatherMode = writable(getInitialBooleanSetting('sassyWeather', false));
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

// Search categories configuration
export const categories = {
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
  ],
  'Breweries': [
    { name: 'Nearby Breweries', search: 'breweries' },
    { name: 'Micro Breweries', search: 'micro' },
    { name: 'Brew Pubs', search: 'brewpub' }
  ],
  'Recreation': [
    { name: 'Campgrounds', search: 'campground' },
    { name: 'Recreation Areas', search: 'recreation' },
    { name: 'National Parks', search: 'national_park' },
    { name: 'Pickleball Courts', keyword: 'pickleball court', type: 'sports_complex', primaryTypeOnly: false }
  ],
  'Bird Watching': [
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
    const theme = THEMES[themeKey] || THEMES[DEFAULT_THEME];
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    localStorage.setItem('currentTheme', themeKey);
  });

  showBirdSightings.subscribe(value => {
    localStorage.setItem('showBirdSightings', value ? 'true' : 'false');
  });

  sassyWeatherMode.subscribe(value => {
    localStorage.setItem('sassyWeather', value ? 'true' : 'false');
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
