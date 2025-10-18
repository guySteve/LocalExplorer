const CACHE_NAME = "local-explorer-v3";
const CORE_ASSETS = [
  "./",
  "local-explorer.html",
  "manifest.json",
  "icon-192.png",
  "icon-512.png"
];

// Install: cache core assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for HTML, cache-first for static assets
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // Network-first for app shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match("local-explorer.html")))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(req).then(
      res =>
        res ||
        fetch(req).then(networkRes => {
          const copy = networkRes.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
          return networkRes;
        })
    )
  );
});
