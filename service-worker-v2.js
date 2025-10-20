// service-worker-v2.js
const CACHE_NAME = 'local-explorer-v14.0-deploy';
const urlsToCache = [
    './', // Cache the root index
    './LocalExplorer.html', // Cache the HTML as a fallback
    './manifest.json',
    './icons/icon-192x192.png',
    './key.js'
];

self.addEventListener('install', event => {
  console.log('SW V18: Install event');
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log('SW V18: Caching core assets');
        // Force reload from network during install for core files
        const requests = urlsToCache.map(url => new Request(url, { cache: 'reload' }));
        await cache.addAll(requests);
        console.log('SW V18: Core assets cached');
      } catch (e) {
        console.error('SW V18: Cache addAll failed during install:', e);
      }
    })()
  );
  self.skipWaiting(); // Activate immediately
});

self.addEventListener('activate', event => {
  console.log('SW V18: Activate event');
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const keys = await caches.keys();
      await Promise.all(
        keys.map(k => {
          if (k !== CACHE_NAME) {
            console.log('SW V18: Deleting old cache:', k);
            return caches.delete(k);
          }
        })
      );
      // Take control of clients immediately
      console.log('SW V18: Claiming clients');
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
          console.log(`SW V18: Fetched ${request.url} from network.`);
          // If successful, cache and return
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }
          // Network failed but response wasn't 'ok' (e.g., 404) - try cache
          console.warn(`SW V18: Network fetch for ${request.url} failed or wasn't ok, trying cache.`);
          return await caches.match(request);
        } catch (e) {
          // Network completely failed (offline) - try cache
          console.error(`SW V18: Network error for ${request.url}, trying cache.`, e);
          const cached = await caches.match(request);
          return cached || new Response('Offline - HTML not cached', { status: 503, statusText: 'Offline' });
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
        // console.log(`SW V18: Serving ${request.url} from cache.`);
        return cachedResponse;
      }
      // console.log(`SW V18: ${request.url} not in cache, fetching from network.`);
      try {
        const networkResponse = await fetch(request); // Standard fetch
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (e) {
        console.error(`SW V18: Network error fetching asset ${request.url}.`, e);
        return new Response(`Offline - Asset ${request.url} not cached`, { status: 503, statusText: 'Offline' });
      }
    })()
  );
});
