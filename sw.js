// =========================================
// SERVICE WORKER - UsahawanDigital PWA
// =========================================

const CACHE_NAME = 'usahawan-digital-v2';
const ASSETS = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/login.html',// =========================================
// SERVICE WORKER - UsahawanDigital PWA
// =========================================

const CACHE_NAME = 'usahawan-digital-v3';  // Tukar version number
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
                return self.skipWaiting();  // Force activate new SW
            })
    );
});

// =========================================
// ACTIVATE - Clean old caches & take control
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
            return self.clients.claim();  // Take control of all pages immediately
        })
    );
});

// =========================================
// FETCH - HANYA CACHE GET REQUEST SAHAJA!
// =========================================
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // HANYA cache request GET
    if (request.method !== 'GET') {
        return;
    }
    
    // JANGAN cache Supabase API
    if (url.hostname.includes('supabase.co')) {
        return;
    }
    
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(request)
                    .then(networkResponse => {
                        if (networkResponse.status === 200) {
                            return caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(request, networkResponse.clone());
                                    return networkResponse;
                                });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        if (url.pathname.endsWith('.html')) {
                            return new Response(
                                '<h1>Offline</h1><p>Sila sambung ke internet untuk mengakses portal ini.</p>',
                                { headers: { 'Content-Type': 'text/html' } }
                            );
                        }
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});
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
// FETCH - HANYA CACHE GET REQUEST SAHAJA!
// =========================================
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // HANYA cache request GET
    // JANGAN cache POST, PUT, PATCH, DELETE
    if (request.method !== 'GET') {
        // Biarkan request POST/PUT/PATCH/DELETE terus ke network
        return;
    }
    
    // JANGAN cache Supabase API requests (supabase.co)
    if (url.hostname.includes('supabase.co')) {
        // Biarkan request ke Supabase terus ke network
        return;
    }
    
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(request)
                    .then(networkResponse => {
                        // Hanya cache response yang berjaya (status 200)
                        if (networkResponse.status === 200) {
                            return caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(request, networkResponse.clone());
                                    return networkResponse;
                                });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // Offline fallback
                        if (url.pathname.endsWith('.html')) {
                            return new Response(
                                '<h1>Offline</h1><p>Sila sambung ke internet untuk mengakses portal ini.</p>',
                                { headers: { 'Content-Type': 'text/html' } }
                            );
                        }
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});
