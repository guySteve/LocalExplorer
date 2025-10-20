const CACHE_NAME = 'local-explorer-v14-persistence-fix'; // Updated version
const urlsToCache = [
    './',
    './LocalExplorer.html',
    './manifest.json',
    './icons/icon-192x192.png'
];

// Install
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(urlsToCache);
      } catch (e) {
        // avoid failing install on opaque/404
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

// Cache-first for same-origin GET, network fallback
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

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
        // optionally serve an offline page here
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })()
  );
});
