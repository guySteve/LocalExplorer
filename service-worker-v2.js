// service-worker-v2.js
const CACHE_NAME = 'local-explorer-v14.2-iconfix'; // Cache name updated to force update
const urlsToCache = [
    './', // Cache the root index
    './LocalExplorer.html', // Cache the HTML as a fallback
    './manifest.json',
    './icons/icon-192x192.png', // Kept this one assuming it exists
    // './icons/icon-144x144.png', // REMOVED to fix 404 error during install
    './key.js'
];

self.addEventListener('install', event => {
  // Use new cache name in console logs for easier debugging
  console.log(`SW ${CACHE_NAME}: Install event`);
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log(`SW ${CACHE_NAME}: Caching core assets`);
        // Force reload from network during install for core files
        const requests = urlsToCache.map(url => new Request(url, { cache: 'reload' }));
        await cache.addAll(requests);
        console.log(`SW ${CACHE_NAME}: Core assets cached successfully`); // Success message
      } catch (e) {
        // Log the specific error
        console.error(`SW ${CACHE_NAME}: Cache addAll failed during install:`, e);
        // IMPORTANT: If install fails, the SW won't activate.
      }
    })()
  );
  self.skipWaiting(); // Activate immediately IF install succeeds
});

self.addEventListener('activate', event => {
  console.log(`SW ${CACHE_NAME}: Activate event`);
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const keys = await caches.keys();
      await Promise.all(
        keys.map(k => {
          if (k !== CACHE_NAME) {
            console.log(`SW ${CACHE_NAME}: Deleting old cache:`, k);
            return caches.delete(k);
          }
        })
      );
      // Take control of clients immediately
      console.log(`SW ${CACHE_NAME}: Claiming clients`);
      return self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  // Ignore non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Network-First for HTML navigation requests
  if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      (async () => {
        try {
          // Always try network first, bypassing HTTP cache
          const networkResponse = await fetch(new Request(request, { cache: 'reload' }));
          console.log(`SW ${CACHE_NAME}: Fetched ${request.url} from network.`);
          // If successful, cache and return
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }
          // Network failed but response wasn't 'ok' (e.g., 404) - try cache
          console.warn(`SW ${CACHE_NAME}: Network fetch for ${request.url} failed or wasn't ok, trying cache.`);
          const cachedResponse = await caches.match(request); // Added await
          return cachedResponse || new Response('Offline - HTML not cached (Network failed)', { status: 503, statusText: 'Offline' }); // More specific error
        } catch (e) {
          // Network completely failed (offline) - try cache
          console.error(`SW ${CACHE_NAME}: Network error for ${request.url}, trying cache.`, e);
          const cached = await caches.match(request);
          return cached || new Response('Offline - HTML not cached (Network error)', { status: 503, statusText: 'Offline' }); // More specific error
        }
      })()
    );
    return;
  }

  // Cache-First for all other assets (JS, CSS, images, etc.)
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        // console.log(`SW ${CACHE_NAME}: Serving ${request.url} from cache.`); // Uncomment for verbose logging
        return cachedResponse;
      }
      // console.log(`SW ${CACHE_NAME}: ${request.url} not in cache, fetching from network.`); // Uncomment for verbose logging
      try {
        const networkResponse = await fetch(request); // Standard fetch
        if (networkResponse && networkResponse.ok) {
           // Check if it's one of our core assets before caching dynamically
           // This prevents caching external resources like Google Maps tiles etc. unnecessarily
           const isCoreAsset = urlsToCache.some(coreUrl => request.url.endsWith(coreUrl.replace('./', '')));
           if (isCoreAsset) {
             const cache = await caches.open(CACHE_NAME);
             cache.put(request, networkResponse.clone());
             console.log(`SW ${CACHE_NAME}: Cached ${request.url} dynamically.`);
           }
        }
        return networkResponse;
      } catch (e) {
        console.error(`SW ${CACHE_NAME}: Network error fetching asset ${request.url}.`, e);
        // Provide a more specific error response for assets if needed, or just fail
        return new Response(`Offline - Asset ${url.pathname} not cached`, { status: 503, statusText: 'Offline' });
      }
    })()
  );
});
