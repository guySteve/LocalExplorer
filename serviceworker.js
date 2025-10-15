const CACHE_NAME = 'local-explorer-v8';
const APP_SHELL = [
  './',
  './LocalExplorer.html',
  './manifest.json'
];
// Safe list of cross-origin assets you want cached at install (optional)
const PRECACHE_EXTERNAL = [
  'https://fonts.googleapis.com/css2?family=Poppins:wght@700&family=Raleway:wght@400;600&display=swap'
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL.concat(PRECACHE_EXTERNAL));
    self.skipWaiting();
  })());
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE_NAME) ? null : caches.delete(k)));
    await self.clients.claim();
  })());
});

// Fetch: cache-first for same-origin; network-first for cross-origin (avoid caching Maps requests)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && res.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, res.clone());
        }
        return res;
      } catch (e) {
        // Optional: return a fallback page if request is navigational
        if (req.mode === 'navigate') {
          const fallback = await caches.match('./LocalExplorer.html');
          if (fallback) return fallback;
        }
        throw e;
      }
    })());
  } else {
    // Cross-origin: network-first, don't cache heavy/volatile APIs like Google Maps
    event.respondWith(fetch(req).catch(() => caches.match(req)));
  }
});
