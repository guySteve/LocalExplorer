/*
  Service worker for the Local Explorer PWA.

  This script pre‑caches the core application shell (HTML, manifest and icons)
  on install, cleans up old caches on activate, and provides a cache‑first
  strategy for navigation and static assets. If a request fails and there is
  no cached response, the service worker falls back to the main HTML file,
  ensuring the app continues to work offline.
*/

const CACHE_NAME = 'local-explorer-cache-v1';
const URLS_TO_CACHE = [
  'local-explorer.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
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
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // Serve from cache if available
      if (cachedResponse) {
        return cachedResponse;
      }
      // Otherwise fetch from network and cache the response
      return fetch(event.request)
        .then(networkResponse => {
          // Only cache successful responses and same origin requests
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        })
        .catch(() => {
          // Fallback to the main page when offline or request fails
          return caches.match('local-explorer.html');
        });
    })
  );
});
