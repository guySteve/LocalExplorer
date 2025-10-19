const CACHE_NAME = 'local-explorer-cache-v1';
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@700&family=Raleway:wght@400;500;700&display=swap',
    'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7Z1xlFQ.woff2',
    'https://fonts.gstatic.com/s/raleway/v28/1Ptxg8zYS_SKggPN4iEgvnHyvXTnBw.woff2'
];

// Install event: Cache core app shell files
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching app shell');
                return cache.addAll(URLS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Clearing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event: Serve from cache or network
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // --- Network-Only Strategy ---
    // Do not cache API requests (Google, Wikipedia)
    if (url.origin.includes('googleapis.com') || url.origin.includes('wikipedia.org')) {
        event.respondWith(fetch(request));
        return;
    }
    
    // --- Cache-First Strategy ---
    // For app shell files and fonts
    if (URLS_TO_CACHE.includes(url.pathname) || url.origin.includes('fonts.gstatic.com')) {
        event.respondWith(
            caches.match(request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return fetch(request);
                })
        );
        return;
    }

    // --- Stale-While-Revalidate Strategy (Default) ---
    // For everything else (e.g., images not in core cache)
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(request).then(cachedResponse => {
                // Fetch from network in the background
                const fetchPromise = fetch(request).then(networkResponse => {
                    // Check for valid response
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(err => {
                    // Network failed, but we might have a cached response
                    console.log('Service Worker: Network fetch failed.', err);
                });

                // Return cached response immediately if available, otherwise wait for network
                return cachedResponse || fetchPromise;
            });
        })
    );
});
