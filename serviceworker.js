/*
  Service worker for the Local Explorer PWA.

  This script pre‑caches the core application shell (HTML, manifest and icons)
  on install, cleans up old caches on activate, and provides a cache‑first
  strategy for navigation and static assets. If a request fails and there is
  no cached response, the service worker falls back to the main HTML file,
  ensuring the app continues to work offline.
*/

// Update cache name to invalidate old caches when file structure changes
const CACHE_NAME = 'local-explorer-cache-v2';
// List of core assets to precache (app shell)
const URLS_TO_CACHE = [
  'local-explorer.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'keys.js'
];

// Install: pre-cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

// Activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});

// Fetch handler: cache‑first with network fallback
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Perform network fetch regardless to update the cache in the background
      const fetchPromise = fetch(event.request)
        .then(networkResponse => {
          // Cache the response if it is a same‑origin request and OK
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network request failed; return cached response if available
          return cachedResponse || caches.match('local-explorer.html');
        });
      // Return cached response immediately if present (stale‑while‑revalidate)
      return cachedResponse || fetchPromise;
    })
  );
});
