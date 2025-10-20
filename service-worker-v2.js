// service-worker.js
const CACHE_NAME = 'local-explorer-v16-network-first'; // CRITICAL: Updated version
const urlsToCache = [
    './',
    './LocalExplorer.html', // We will cache this as a fallback
    './manifest.json',
    './icons/icon-192x192.png',
    './key.js' // Cache the key file too
];

// Install
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(urlsToCache);
      } catch (e) {
        console.log('SW: addAll failed (continuing):', e);
      }
    })()
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map(k => (k === CACHE_NAME ? null : caches.delete(k)))
      );
    })()
  );
  self.clients.claim();
});

// Fetch: Network-First for HTML, Cache-First for others
self.addEventListener('fetch', event => {
  const { request } = event;

  // Not a GET request, so just fetch
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  const url = new URL(request.url);

  // **** NEW NETWORK-FIRST STRATEGY ****
  // If it's the main HTML file, always try network first
  // This ensures the app code is ALWAYS up-to-date.
  if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          // If we get a good response, cache it and return it
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }
          // If network fails, try to serve from cache
          return await caches.match(request);
        } catch (e) {
          // Network failed, try cache
          console.log('SW: Network-first fetch failed, trying cache.', e);
          const cached = await caches.match(request);
          return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  // **** CACHE-FIRST STRATEGY (for all other assets) ****
  // For JS, CSS, images, etc., serve from cache first for speed.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const resp = await fetch(request);
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, copy).catch(()=>{});
        }
        return resp;
      } catch (e) {
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })()
  );
});
