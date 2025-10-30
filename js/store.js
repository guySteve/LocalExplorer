/**
 * Central State Store for LocalExplorer
 * 
 * This module provides a centralized state management system following these principles:
 * - Single source of truth for application state
 * - Controlled state mutations through setState()
 * - Automatic re-rendering on state changes
 * - Predictable state flow
 */

// Initial state structure
const initialState = {
  // Location & Geography
  currentPosition: null,
  currentAddress: '',
  latestLocationLabel: '',
  
  // Results & Data
  currentResults: [],
  currentPlaceDetails: null,
  currentPaginationHandle: null,
  appendNextResults: false,
  lastResultsTitle: 'Results',
  
  // Weather Cache
  lastWeatherFetch: 0,
  lastWeatherCoords: null,
  cachedWeather: null,
  
  // UI State
  streetViewPanorama: null,
  pendingStreetViewLatLng: null,
  
  // Theme
  currentThemeKey: 'naval',
  
  // Voice
  selectedVoiceUri: localStorage.getItem('selectedVoiceUri') || ''
};

// Current state
let state = { ...initialState };

// Registered render functions
const renderFunctions = new Set();

/**
 * Get the current state (read-only)
 * @returns {Object} Current application state
 */
export function getState() {
  // Return a shallow copy to prevent direct mutations
  return { ...state };
}

/**
 * Update the application state and trigger re-renders
 * @param {Object} newState - Partial state object to merge
 */
export function setState(newState) {
  if (!newState || typeof newState !== 'object') {
    console.warn('setState called with invalid argument:', newState);
    return;
  }
  
  // Merge new state
  const prevState = { ...state };
  state = { ...state, ...newState };
  
  // Log state change in development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('State updated:', { prevState, newState, state });
  }
  
  // Trigger all registered render functions
  renderFunctions.forEach(renderFn => {
    try {
      renderFn(state, prevState);
    } catch (error) {
      console.error('Error in render function:', error);
    }
  });
}

/**
 * Register a render function to be called on state changes
 * @param {Function} renderFn - Function to call on state updates
 * @returns {Function} Unregister function
 */
export function subscribe(renderFn) {
  if (typeof renderFn !== 'function') {
    console.warn('subscribe called with non-function:', renderFn);
    return () => {};
  }
  
  renderFunctions.add(renderFn);
  
  // Return unsubscribe function
  return () => {
    renderFunctions.delete(renderFn);
  };
}

/**
 * Reset state to initial values
 */
export function resetState() {
  setState({ ...initialState });
}

// Make store available globally for backward compatibility during migration
if (typeof window !== 'undefined') {
  window.storeGetState = getState;
  window.storeSetState = setState;
  window.storeSubscribe = subscribe;
}
