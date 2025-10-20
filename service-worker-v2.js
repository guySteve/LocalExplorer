// service-worker-v2.js
const CACHE_NAME = 'local-explorer-v14.3-install-robust'; // Incremented cache name AGAIN
const urlsToCache = [
    './',
    './LocalExplorer.html',
    './manifest.json',
    './icons/icon-192x192.png', // Assuming this one exists now
    // './icons/icon-144x144.png', // Still removed
    './key.js'
];

self.addEventListener('install', event => {
  console.log(`SW ${CACHE_NAME}: Install event STARTED.`);
  event.waitUntil(
    (async () => {
      let cache;
      try {
        console.log(`SW ${CACHE_NAME}: Opening cache...`);
        cache = await caches.open(CACHE_NAME);
        console.log(`SW ${CACHE_NAME}: Cache opened. Caching core assets:`, urlsToCache);
        // Force reload from network during install for core files
        const requests = urlsToCache.map(url => new Request(url, { cache: 'reload' }));

        // Cache files one by one for better error reporting
        for (const request of requests) {
            try {
                await cache.add(request);
                console.log(`SW ${CACHE_NAME}: Successfully cached: ${request.url}`);
            } catch (err) {
                console.error(`SW ${CACHE_NAME}: FAILED to cache: ${request.url}`, err);
                // Optional: Decide if failure is critical. If any failure should stop install:
                // throw new Error(`Failed to cache ${request.url}`);
            }
        }
        console.log(`SW ${CACHE_NAME}: Core asset caching attempt FINISHED.`);
      } catch (e) {
        console.error(`SW ${CACHE_NAME}: CRITICAL Cache operation failed during install:`, e);
        // Do not call skipWaiting if install failed critically
        return; // Stop processing install
      }
      // If caching succeeded (or individual failures were not critical)
      console.log(`SW ${CACHE_NAME}: Install successful, calling skipWaiting().`);
      self.skipWaiting(); // Activate the new service worker immediately
    })()
  );
});

self.addEventListener('activate', event => {
  console.log(`SW ${CACHE_NAME}: Activate event STARTED.`);
  event.waitUntil(
    (async () => {
      // Clean up old caches
      console.log(`SW ${CACHE_NAME}: Checking for old caches...`);
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
      console.log(`SW ${CACHE_NAME}: Claiming clients...`);
      await self.clients.claim(); // Added await for clarity
      console.log(`SW ${CACHE_NAME}: Clients claimed. Activation FINISHED.`);
    })()
  );
});

// Fetch event listener remains the same as the last version
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') { return; }
  const url = new URL(request.url);

  if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith( (async () => { /* Network-First logic */ })() );
    return;
  }
  event.respondWith( (async () => { /* Cache-First logic for assets */ })() );
});

// Make sure the fetch handlers inside respondWith are included:
self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') { return; }
    const url = new URL(request.url);

    // Network-First for HTML navigation requests
    if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
        event.respondWith(
            (async () => {
                try {
                    const networkResponse = await fetch(new Request(request, { cache: 'reload' }));
                    // console.log(`SW ${CACHE_NAME}: Fetched ${request.url} from network.`); // Reduce noise
                    if (networkResponse && networkResponse.ok) {
                        const cache = await caches.open(CACHE_NAME);
                        cache.put(request, networkResponse.clone());
                        return networkResponse;
                    }
                    console.warn(`SW ${CACHE_NAME}: Network fetch for ${request.url} failed or wasn't ok, trying cache.`);
                    const cachedResponse = await caches.match(request);
                    return cachedResponse || new Response('Offline - HTML not cached (Network failed)', { status: 503, statusText: 'Offline' });
                } catch (e) {
                    console.error(`SW ${CACHE_NAME}: Network error for ${request.url}, trying cache.`, e);
                    const cached = await caches.match(request);
                    return cached || new Response('Offline - HTML not cached (Network error)', { status: 503, statusText: 'Offline' });
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
                return cachedResponse;
            }
            try {
                const networkResponse = await fetch(request);
                if (networkResponse && networkResponse.ok) {
                    // Cache core assets dynamically if missed
                    const isCoreAsset = urlsToCache.some(coreUrl => request.url.endsWith(coreUrl.replace('./', '')));
                    if (isCoreAsset) {
                       const cache = await caches.open(CACHE_NAME);
                       cache.put(request, networkResponse.clone());
                       // console.log(`SW ${CACHE_NAME}: Cached ${request.url} dynamically.`); // Reduce noise
                    }
                }
                return networkResponse;
            } catch (e) {
                console.error(`SW ${CACHE_NAME}: Network error fetching asset ${request.url}.`, e);
                return new Response(`Offline - Asset ${url.pathname} not cached`, { status: 503, statusText: 'Offline' });
            }
        })()
    );
});
