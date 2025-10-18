const CACHE_NAME = 'local-explorer-v1';
const ASSETS = [
  '/',
  '/local-explorer.html',
  '/keys.js',
  '/icon-192.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
