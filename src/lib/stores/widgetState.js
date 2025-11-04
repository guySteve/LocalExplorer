// Widget visibility state management
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'localExplorer.widgetState';

// Default widget visibility
const DEFAULT_STATE = {
  weather: true,
  primaryActions: true,
  filterGrid: true,
  supportCTA: true
};

function loadWidgetState() {
  if (!browser) return DEFAULT_STATE;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_STATE, ...JSON.parse(stored) };
    }
  } catch (err) {
    console.warn('Failed to load widget state:', err);
  }
  
  return DEFAULT_STATE;
}

function saveWidgetState(state) {
  if (!browser) return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save widget state:', err);
  }
}

function createWidgetStateStore() {
  const { subscribe, set, update } = writable(loadWidgetState());
  
  return {
    subscribe,
    toggle: (widgetName) => {
      update(state => {
        const newState = { ...state, [widgetName]: !state[widgetName] };
        saveWidgetState(newState);
        return newState;
      });
    },
    show: (widgetName) => {
      update(state => {
        const newState = { ...state, [widgetName]: true };
        saveWidgetState(newState);
        return newState;
      });
    },
    hide: (widgetName) => {
      update(state => {
        const newState = { ...state, [widgetName]: false };
        saveWidgetState(newState);
        return newState;
      });
    },
    reset: () => {
      saveWidgetState(DEFAULT_STATE);
      set(DEFAULT_STATE);
    }
  };
}

export const widgetState = createWidgetStateStore();
