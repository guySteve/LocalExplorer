// Core app state and storage helpers
const DEFAULT_THEME = 'naval'; // Polished Sailor is the new 'naval'
const THEMES = {
  naval: { '--background': '#f8f7f2', '--card': '#1a2b44', '--primary': '#c87941', '--secondary': '#334e68', '--text-dark': '#1a2b44', '--text-light': '#ffffff', '--accent': '#8a5a44' },
  sunset: { '--background': '#1b1c3d', '--card': '#ef476f', '--primary': '#ffd166', '--secondary': '#073b4c', '--text-dark': '#f7f5ff', '--text-light': '#fff8f0', '--accent': '#06d6a0' },
  neon: { '--background': '#080b1a', '--card': '#1f2a44', '--primary': '#ef2d56', '--secondary': '#2fbf71', '--text-dark': '#f2f7ff', '--text-light': '#f2f7ff', '--accent': '#08f7fe' },
  arctic: { '--background': '#e4f0f6', '--card': '#1b3b5f', '--primary': '#3d9be9', '--secondary': '#1f5673', '--text-dark': '#1b3b5f', '--text-light': '#ffffff', '--accent': '#8bc6ec' },
  highseas: { '--background': '#050a1c', '--card': '#0f2447', '--primary': '#1dd3b0', '--secondary': '#16355f', '--text-dark': '#d7f3ff', '--text-light': '#f0fbff', '--accent': '#58a4ff' },
  mojave: { '--background': '#fff3e1', '--card': '#4a2c22', '--primary': '#f4a259', '--secondary': '#bc5f34', '--text-dark': '#3f2a1b', '--text-light': '#fffaf5', '--accent': '#f7c59f' },
  aurora: { '--background': '#060b1b', '--card': '#102a43', '--primary': '#7f5af0', '--secondary': '#2cb67d', '--text-dark': '#e6f0ff', '--text-light': '#f7f2ff', '--accent': '#64dfdf' },
  retro90: { '--background': '#f3f0ff', '--card': '#1f1d2b', '--primary': '#ff6ec7', '--secondary': '#3a86ff', '--text-dark': '#1f1d2b', '--text-light': '#fff8fb', '--accent': '#ffde03' },
  groove70: { '--background': '#fff4da', '--card': '#4b2c20', '--primary': '#ff8a3c', '--secondary': '#d95f26', '--text-dark': '#4b2c20', '--text-light': '#fff9f1', '--accent': '#ffc857' }
};
let currentThemeKey = DEFAULT_THEME;

// Shared state
let currentPosition = null;
let currentAddress = '';
let map;
let placesService;
let geocoder;
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
    { name: 'Italian', keyword: 'italian restaurant', type: 'restaurant' },
    { name: 'Pizza', keyword: 'pizza', type: 'restaurant' },
    { name: 'Cafes', keyword: 'cafe', type: 'cafe' },
    { name: 'Bakeries', keyword: 'bakery', type: 'bakery' },
    { name: 'Sushi', keyword: 'sushi', type: 'restaurant' }
  ],
  'Iconic Sights': [
    { name: 'Tourist Attractions', type: 'tourist_attraction' },
    { name: 'Museums', type: 'museum' },
    { name: 'Art Galleries', type: 'art_gallery' },
    { name: 'Parks', type: 'park' },
    { name: 'Landmarks', keyword: 'landmark', type: 'point_of_interest' }
  ],
  'Night Out': [
    { name: 'Bars', type: 'bar' },
    { name: 'Night Clubs', type: 'night_club' },
    { name: 'Movie Theaters', type: 'movie_theater' },
    { name: 'Bowling Alleys', type: 'bowling_alley' },
    { name: 'Concert Venues', keyword: 'concert', type: 'point_of_interest' }
  ],
  'Hidden Gems': [
    { name: 'Libraries', type: 'library' },
    { name: 'Book Stores', type: 'book_store' },
    { name: 'Gardens', keyword: 'garden', type: 'park' },
    { name: 'Historical Sites', keyword: 'historical site', type: 'point_of_interest' },
    { name: 'Local Favorites', keyword: 'local favorite', type: 'point_of_interest' },
    { name: 'Historical Markers', keyword: 'historical marker', type: 'point_of_interest' }
  ],
  'Pet Friendly': [
    { name: 'Dog Parks', keyword: 'dog park', type: 'park' },
    { name: 'Pet Stores', type: 'pet_store' },
    { name: 'Veterinary Care', type: 'veterinary_care' },
    { name: 'Pet Friendly Cafes', keyword: 'pet friendly cafe', type: 'cafe' },
    { name: 'Pet Friendly Hotels', keyword: 'pet friendly hotel', type: 'lodging' }
  ],
  'Utilities & Help': [
    { name: 'Hospitals', type: 'hospital', ignoreRating: true },
    { name: 'Pharmacies', type: 'pharmacy', ignoreRating: true },
    { name: 'Police', type: 'police', ignoreRating: true },
    { name: 'Gas Stations', type: 'gas_station', ignoreRating: true },
    { name: 'ATMs', type: 'atm', ignoreRating: true }
  ],
  Outdoor: [
    { name: 'Parks', type: 'park' },
    { name: 'Trails', keyword: 'hiking trail', type: 'park' },
    { name: 'Nature Reserves', keyword: 'nature reserve', type: 'park' },
    { name: 'Beaches', keyword: 'beach', type: 'park' },
    { name: 'Campgrounds', keyword: 'campground', type: 'campground' }
  ],
  'Local Events': [
    { name: 'All Events', value: 'all' },
    { name:g: 'Music', value: 'music' },
    { name: 'Sports', value: 'sports' },
    { name: 'Comedy', value: 'comedy' },
    { name: 'Festivals', value: 'festival' }
  ]
};

function getSavedList() {
  return JSON.parse(localStorage.getItem('myPlaces') || '[]');
}

function savePlace(place) {
  const list = getSavedList();
  if (!list.find((p) => p.place_id === place.place_id)) {
    if (list.length >= 50) list.shift();
    list.push({
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      rating: place.rating,
      url: place.url
    });
    localStorage.setItem('myPlaces', JSON.stringify(list));
  }
}

function removePlace(id) {
  const list = getSavedList().filter((p) => p.place_id !== id);
  localStorage.setItem('myPlaces', JSON.stringify(list));
}

function getPlan() {
  return JSON.parse(localStorage.getItem('myPlan') || '[]');
}

function savePlan(list) {
  localStorage.setItem('myPlan', JSON.stringify(list));
}

function getVisitedPlan() {
  return JSON.parse(localStorage.getItem('visitedPlan') || '[]');
}

function saveVisitedPlan(list) {
  localStorage.setItem('visitedPlan', JSON.stringify(list));
}

function addToPlan(place) {
  const plan = getPlan();
  if (!plan.some((p) => p.place_id === place.place_id)) {
    plan.push({
      place_id: place.place_id,
      name: place.name,
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
      address: place.formatted_address || ''
    });
    savePlan(plan);
  }
}

function removeFromPlan(id) {
  const plan = getPlan().filter((p) => p.place_id !== id);
  savePlan(plan);
}

function toggleVisited(id) {
  let visited = getVisitedPlan();
  visited = visited.includes(id) ? visited.filter((i) => i !== id) : [...visited, id];
  saveVisitedPlan(visited);
}
