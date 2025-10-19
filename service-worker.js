const CACHE_NAME = 'local-explorer-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/app.js',
  '/js/keys.js',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/offline/offline.html'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    if (req.mode === 'navigate') {
      e.respondWith(
        fetch(req).then(r => {
          const copy = r.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
          return r;
        }).catch(() => caches.match('/offline/offline.html'))
      );
    } else {
      e.respondWith(caches.match(req).then(r => r || fetch(req)));
    }
  }
});
