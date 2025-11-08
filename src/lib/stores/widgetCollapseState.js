import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'localExplorer.widgetCollapseState';

const DEFAULT_STATE = {
  primaryActions: true,
  weather: true,
  filterGrid: false,
  support: false
};

function loadState() {
  if (!browser) {
    return { ...DEFAULT_STATE };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch (err) {
    console.warn('Failed to load widget collapse state:', err);
  }

  return { ...DEFAULT_STATE };
}

function persistState(state) {
  if (!browser) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to persist widget collapse state:', err);
  }
}

function createWidgetCollapseStore() {
  const { subscribe, set, update } = writable(loadState());

  return {
    subscribe,
    toggle: (widgetId) =>
      update((state) => {
        if (!widgetId) return state;
        const next = { ...state, [widgetId]: !state[widgetId] };
        persistState(next);
        return next;
      }),
    setOpen: (widgetId, isOpen) =>
      update((state) => {
        if (!widgetId || state[widgetId] === isOpen) return state;
        const next = { ...state, [widgetId]: isOpen };
        persistState(next);
        return next;
      }),
    ensure: (widgetId, defaultValue = false) =>
      update((state) => {
        if (!widgetId || state[widgetId] !== undefined) return state;
        const next = { ...state, [widgetId]: defaultValue };
        persistState(next);
        return next;
      }),
    reset: () => {
      persistState(DEFAULT_STATE);
      set({ ...DEFAULT_STATE });
    }
  };
}

export const widgetCollapseState = createWidgetCollapseStore();

export function getWidgetCollapse(state, widgetId, fallback = false) {
  if (!state || !widgetId) return fallback;
  return state[widgetId] ?? fallback;
}
