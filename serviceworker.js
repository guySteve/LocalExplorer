const CACHE_NAME = 'local-explorer-v3'; // Updated cache version for new design
const urlsToCache = [
    '/',
    'LocalExplorer.html',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@700&family=Raleway:wght@400;600&display=swap'
];

// Install the service worker and cache the core application assets.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching app shell');
                return cache.addAll(urlsToCache);
            })
    );
});

// This event is fired when the new service worker is activated.
// This is the perfect time to clean up old, unused caches.
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // If a cache is found that is not in our whitelist, we delete it.
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // This command ensures the new service worker takes control of the page immediately.
    return self.clients.claim();
});

// Serve cached content when offline, or fetch from network (Cache-first strategy).
self.addEventListener('fetch', event => {
    // We only want to cache GET requests.
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // If the response is found in the cache, return it.
                if (cachedResponse) {
                    return cachedResponse;
                }

                // If not in cache, fetch from the network.
                return fetch(event.request).then(
                    networkResponse => {
                        // Check if we received a valid response before caching.
                        // BUG FIX: Was checking 'response' instead of 'networkResponse'. Corrected.
                        if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // Clone the response because it's a stream and can only be consumed once.
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                // Add the new response to the cache.
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                );
            })
    );
});

