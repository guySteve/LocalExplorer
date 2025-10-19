const CACHE_NAME = 'local-explorer-v3';
const ASSETS = [
  './',
  './LocalExplorer.html',
  './manifest.json',
  './keys.js',
  './icon-192.png',
  './icon-512.png'
];

// Cache core assets on install
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

// Clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// Serve cached files or fetch new ones
self.addEventListener('fetch', e => {
  const req = e.request;

  // HTML pages – network-first
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => {
        const copy = r.clone();
        caches.open(CACHE_NAME).then(c => c.put('./local-explorer.html', copy));
        return r;
      }).catch(() => caches.match('./local-explorer.html'))
    );
    return;
  }

  // Static assets – cache-first
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});

