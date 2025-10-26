// Core app state and storage helpers
const DEFAULT_THEME = 'naval'; // Polished Sailor is the new 'naval'
const THEMES = {
  // --- Existing Themes ---
  naval:    { '--background': '#f8f7f2', '--card': '#1a2b44', '--primary': '#c87941', '--secondary': '#334e68', '--text-dark': '#1a2b44', '--text-light': '#ffffff', '--accent': '#8a5a44', /* Compass Defaults used */ },
  sunset:   { '--background': '#1b1c3d', '--card': '#ef476f', '--primary': '#ffd166', '--secondary': '#073b4c', '--text-dark': '#f7f5ff', '--text-light': '#fff8f0', '--accent': '#06d6a0', 
              '--compass-dial-border': 'rgba(255, 209, 102, 0.3)', '--compass-dial-bg': 'radial-gradient(circle, #2a2d5a 40%, #1b1c3d 100%)', '--compass-marker-color': '#ffd166', '--compass-marker-shadow': '0 0 8px rgba(255, 209, 102, 0.6)', '--compass-arrow-color': '#ef476f', '--compass-arrow-shadow': 'drop-shadow(0 0 8px rgba(239, 71, 111, 0.6))', '--compass-value': '#ffd166'},
  neon:     { '--background': '#080b1a', '--card': '#1f2a44', '--primary': '#ef2d56', '--secondary': '#2fbf71', '--text-dark': '#f2f7ff', '--text-light': '#f2f7ff', '--accent': '#08f7fe', 
              '--compass-bg': 'linear-gradient(165deg, #101828 0%, #080b1a 100%)', '--compass-dial-border': 'rgba(8, 247, 254, 0.3)', '--compass-dial-bg': 'radial-gradient(circle, #1f2a44 30%, #080b1a 100%)', '--compass-marker-color': '#08f7fe', '--compass-marker-shadow': '0 0 10px rgba(8, 247, 254, 0.7)', '--compass-arrow-color': '#ef2d56', '--compass-arrow-shadow': 'drop-shadow(0 0 10px rgba(239, 45, 86, 0.7))', '--compass-value': '#08f7fe'},
  arctic:   { '--background': '#e4f0f6', '--card': '#1b3b5f', '--primary': '#3d9be9', '--secondary': '#1f5673', '--text-dark': '#1b3b5f', '--text-light': '#ffffff', '--accent': '#8bc6ec', 
              '--compass-bg': 'linear-gradient(165deg, #607d8b 0%, #37474f 100%)', '--compass-text': '#ffffff', '--compass-label': 'rgba(255,255,255,0.8)', '--compass-value': '#8bc6ec', '--compass-dial-border': 'rgba(139, 198, 236, 0.4)', '--compass-dial-bg': 'radial-gradient(circle, #263238 40%, #1b3b5f 100%)', '--compass-marker-color': '#8bc6ec', '--compass-marker-shadow': '0 0 6px rgba(139, 198, 236, 0.5)', '--compass-arrow-color': '#ffffff', '--compass-arrow-shadow': 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))'},
  highseas: { '--background': '#050a1c', '--card': '#0f2447', '--primary': '#1dd3b0', '--secondary': '#16355f', '--text-dark': '#d7f3ff', '--text-light': '#f0fbff', '--accent': '#58a4ff', 
              '--compass-dial-border': 'rgba(88, 164, 255, 0.3)', '--compass-dial-bg': 'radial-gradient(circle, #16355f 35%, #050a1c 100%)', '--compass-marker-color': '#58a4ff', '--compass-marker-shadow': '0 0 9px rgba(88, 164, 255, 0.6)', '--compass-arrow-color': '#1dd3b0', '--compass-arrow-shadow': 'drop-shadow(0 0 9px rgba(29, 211, 176, 0.6))', '--compass-value': '#58a4ff'},
  mojave:   { '--background': '#fff3e1', '--card': '#4a2c22', '--primary': '#f4a259', '--secondary': '#bc5f34', '--text-dark': '#3f2a1b', '--text-light': '#fffaf5', '--accent': '#f7c59f', 
              '--compass-bg': 'linear-gradient(165deg, #a1887f 0%, #6d4c41 100%)', '--compass-text': '#fffaf5', '--compass-label': 'rgba(255, 250, 245, 0.7)', '--compass-value': '#f4a259', '--compass-dial-border': 'rgba(247, 197, 159, 0.4)', '--compass-dial-bg': 'radial-gradient(circle, #6d4c41 40%, #4a2c22 100%)', '--compass-marker-color': '#f7c59f', '--compass-marker-shadow': '0 0 6px rgba(247, 197, 159, 0.5)', '--compass-arrow-color': '#fffaf5', '--compass-arrow-shadow': 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))'},
  aurora:   { '--background': '#060b1b', '--card': '#102a43', '--primary': '#7f5af0', '--secondary': '#2cb67d', '--text-dark': '#e6f0ff', '--text-light': '#f7f2ff', '--accent': '#64dfdf', 
              '--compass-dial-border': 'rgba(100, 223, 223, 0.3)', '--compass-dial-bg': 'radial-gradient(circle, #102a43 30%, #060b1b 100%)', '--compass-marker-color': '#64dfdf', '--compass-marker-shadow': '0 0 10px rgba(100, 223, 223, 0.6)', '--compass-arrow-color': '#7f5af0', '--compass-arrow-shadow': 'drop-shadow(0 0 10px rgba(127, 90, 240, 0.6))', '--compass-value': '#64dfdf'},
  retro90:  { /* Defined in theme.css */ },
  groove70: { /* Defined in theme.css */ },

  // --- New Themes (UPDATED) ---
  neverland:{ '--background': '#f0e8d8', '--card': '#3a2e28', '--primary': '#d4a373', '--secondary': '#586f6b', '--text-dark': '#3a2e28', '--text-light': '#fdfaf6', '--accent': '#8a5a44', 
              '--compass-dial-border': 'rgba(212, 163, 115, 0.3)', '--compass-dial-bg': 'radial-gradient(circle, #3a2e28 40%, #2b211c 100%)', '--compass-marker-color': '#d4a373', '--compass-marker-shadow': '0 0 8px rgba(212, 163, 115, 0.6)', '--compass-arrow-color': '#fdfaf6', '--compass-arrow-shadow': 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.5))', '--compass-value': '#d4a373'},
  arcane:   { '--background': '#0a1128', '--card': '#122c34', '--primary': '#fec601', '--secondary': '#005f73', '--text-dark': '#e0fbfc', '--text-light': '#ffffff', '--accent': '#94d2bd', 
              '--compass-dial-border': 'rgba(254, 198, 1, 0.3)', '--compass-dial-bg': 'radial-gradient(circle, #122c34 40%, #0a1128 100%)', '--compass-marker-color': '#fec601', '--compass-marker-shadow': '0 0 10px rgba(254, 198, 1, 0.7)', '--compass-arrow-color': '#94d2bd', '--compass-arrow-shadow': 'drop-shadow(0 0 8px rgba(148, 210, 189, 0.6))', '--compass-value': '#fec601'},
  roblox:   { '--background': '#e1e1e1', '--card': '#a3a3a3', '--primary': '#da242a', '--secondary': '#00a2ff', '--text-dark': '#393939', '--text-light': '#ffffff', '--accent': '#ffcb00', 
              '--compass-dial-border': 'rgba(0, 162, 255, 0.3)', '--compass-dial-bg': 'radial-gradient(circle, #a3a3a3 40%, #888888 100%)', '--compass-marker-color': '#ffcb00', '--compass-marker-shadow': '0 0 10px rgba(255, 203, 0, 0.7)', '--compass-arrow-color': '#da242a', '--compass-arrow-shadow': 'drop-shadow(0 0 8px rgba(218, 36, 42, 0.6))', '--compass-value': '#ffcb00'},
  ramen:    { '--background': '#fff9e6', '--card': '#d44d5c', '--primary': '#ffc107', '--secondary': '#77bfa3', '--text-dark': '#4a2c22', '--text-light': '#ffffff', '--accent': '#f4a259', 
              '--compass-dial-border': 'rgba(255, 193, 7, 0.4)', '--compass-dial-bg': 'radial-gradient(circle, #d44d5c 40%, #b03a48 100%)', '--compass-marker-color': '#ffc107', '--compass-marker-shadow': '0 0 10px rgba(255, 193, 7, 0.7)', '--compass-arrow-color': '#ffffff', '--compass-arrow-shadow': 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.6))', '--compass-value': '#ffc107'},
  dog:      { '--background': '#f5f5f5', '--card': '#6d4c41', '--primary': '#ffb300', '--secondary': '#455a64', '--text-dark': '#3e2723', '--text-light': '#ffffff', '--accent': '#ef5350', 
              '--compass-dial-border': 'rgba(255, 179, 0, 0.4)', '--compass-dial-bg': 'radial-gradient(circle, #6d4c41 40%, #5d4037 100%)', '--compass-marker-color': '#ffb300', '--compass-marker-shadow': '0 0 10px rgba(255, 179, 0, 0.7)', '--compass-arrow-color': '#ef5350', '--compass-arrow-shadow': 'drop-shadow(0 0 8px rgba(239, 83, 80, 0.6))', '--compass-value': '#ffb300'},
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

// --- Storage Functions ---
function getSavedList() { /* ... unchanged ... */ }
function savePlace(place) { /* ... unchanged ... */ }
function removePlace(id) { /* ... unchanged ... */ }
function getPlan() { /* ... unchanged ... */ }
function savePlan(list) { /* ... unchanged ... */ }
function getVisitedPlan() { /* ... unchanged ... */ }
function saveVisitedPlan(list) { /* ... unchanged ... */ }
function addToPlan(place) { /* ... unchanged ... */ }
function removeFromPlan(id) { /* ... unchanged ... */ }
function toggleVisited(id) { /* ... unchanged ... */ }
