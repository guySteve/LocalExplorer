const CACHE_NAME = 'local-explorer-v10-gold-master'; // Final production cache version
const urlsToCache = [
    '/',
    'LocalExplorer.html',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@700&family=Raleway:wght@400;600&display=swap'
];

// Install the service worker and cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching app shell');
                return cache.addAll(urlsToCache);
            })
    );
});

// Clean up old caches when a new service worker is activated
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Serve cached content when offline, or fetch from network (Cache-first strategy)
self.addEventListener('fetch', event => {
    // We only want to cache GET requests.
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Return cached response if found.
                if (cachedResponse) {
                    return cachedResponse;
                }

                // If not in cache, fetch from network.
                return fetch(event.request).then(
                    networkResponse => {
                        // Check if we received a valid response before caching.
                        if(!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }

                        // Clone the response to cache it.
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                ).catch(error => {
                    // This is a fallback for network errors.
                    console.error('Fetch failed:', error);
                    // Optionally, you could return a custom offline page here.
                });
            })
    );
});

