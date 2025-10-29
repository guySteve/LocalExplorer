// LocalExplorer Service Worker v2
// Progressive Web App - Offline First Architecture

const CACHE_VERSION = 'local-explorer-v2.0.1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

// App Shell - Essential files for offline functionality
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/theme.css',
  '/css/main.css',
  '/js/error-handler.js',
  '/js/cache.js',
  '/js/state.js',
  '/js/ui.js',
  '/js/api.js',
  '/js/compass.js',
  '/js/maps.js',
  '/js/app.js',
  '/key.js',
  '/icon-192.png',
  '/icon-512.png'
];

// Install Event - Pre-cache the App Shell
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[ServiceWorker] Caching App Shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        console.log('[ServiceWorker] App Shell cached successfully');
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[ServiceWorker] Failed to cache App Shell:', error);
      })
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              // Remove old version caches
              return cacheName.startsWith('static-') ||
                     cacheName.startsWith('dynamic-') ||
                     cacheName.startsWith('images-');
            })
            .filter(cacheName => {
              // Keep current version caches
              return cacheName !== STATIC_CACHE &&
                     cacheName !== DYNAMIC_CACHE &&
                     cacheName !== IMAGE_CACHE;
            })
            .map(cacheName => {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Old caches cleaned up');
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch Event - Implement Caching Strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests that aren't from allowed domains
  if (url.origin !== location.origin && 
      !url.hostname.includes('googleapis.com') &&
      !url.hostname.includes('gstatic.com') &&
      !url.hostname.includes('open-meteo.com')) {
    return;
  }

  // Skip Netlify Functions - let them handle their own responses
  if (url.pathname.startsWith('/.netlify/functions/')) {
    return;
  }

  // Different strategies for different resource types
  if (request.method !== 'GET') {
    // Don't cache non-GET requests
    return;
  }

  // Strategy 1: Cache First for App Shell assets (HTML, CSS, JS)
  if (APP_SHELL.includes(url.pathname) || 
      url.pathname.endsWith('.css') || 
      url.pathname.endsWith('.js')) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // Strategy 2: Cache First for Images with longer TTL
  if (request.destination === 'image' || 
      url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico)$/i)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
    return;
  }

  // Strategy 3: Stale-While-Revalidate for everything else
  // This provides fast response from cache while updating in background
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

// Cache First Strategy
// Perfect for App Shell - serves from cache, falls back to network
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[ServiceWorker] Serving from cache:', request.url);
      return cachedResponse;
    }

    console.log('[ServiceWorker] Cache miss, fetching:', request.url);
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] Cache First failed:', error);
    
    // Fallback to offline page for HTML requests
    if (request.destination === 'document') {
      const cache = await caches.open(STATIC_CACHE);
      return cache.match('/index.html');
    }
    
    throw error;
  }
}

// Stale-While-Revalidate Strategy
// Best for dynamic content - serves cache immediately, updates in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Fetch fresh data in the background
  const fetchPromise = fetch(request)
    .then(networkResponse => {
      // Update cache with fresh data if successful
      if (networkResponse && networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(error => {
      console.warn('[ServiceWorker] Network fetch failed:', error);
      return null;
    });

  // Return cached response immediately if available, otherwise wait for network
  if (cachedResponse) {
    console.log('[ServiceWorker] Serving stale, revalidating:', request.url);
    return cachedResponse;
  }

  console.log('[ServiceWorker] No cache, waiting for network:', request.url);
  return fetchPromise;
}

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    // Allow app to request caching of specific URLs
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then(cache => cache.addAll(event.data.urls))
    );
  }
});

// Background Sync for failed network requests (future enhancement)
self.addEventListener('sync', event => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Placeholder for background sync logic
  // This would retry failed API requests when connection is restored
  console.log('[ServiceWorker] Syncing data...');
}

console.log('[ServiceWorker] Service Worker v2 loaded');
