// =========================================
// SERVICE WORKER - UsahawanDigital PWA
// =========================================

const CACHE_NAME = 'usahawan-digital-v1';

// Senarai fail yang perlu di-cache
const ASSETS = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/login.html',
    '/register.html',
    '/modul.html',
    '/jualan.html',
    '/templat.html',
    '/profile-settings.html',
    '/css/style.css',
    '/js/supabase.js',
    '/js/auth.js',
    '/js/dashboard.js',
    '/js/jualan.js',
    '/js/main.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// =========================================
// INSTALL - Cache assets
// =========================================
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching assets...');
                return cache.addAll(ASSETS);
            })
            .then(() => {
                console.log('[SW] Install complete!');
                return self.skipWaiting();
            })
    );
});

// =========================================
// ACTIVATE - Clean old caches
// =========================================
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
        .then(() => {
            console.log('[SW] Activation complete!');
            return self.clients.claim();
        })
    );
});

// =========================================
// FETCH - Serve from cache, fallback to network
// =========================================
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request)
                    .then(networkResponse => {
                        return caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, networkResponse.clone());
                                return networkResponse;
                            });
                    })
                    .catch(() => {
                        return new Response(
                            '<h1>Offline</h1><p>Sila sambung ke internet untuk mengakses portal ini.</p>',
                            { headers: { 'Content-Type': 'text/html' } }
                        );
                    });
            })
    );
});
