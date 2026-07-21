const CACHE_NAME = 'usahawan-digital-v4';
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
// FETCH - NO CACHE FOR HTML
// =========================================
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // HTML files - ALWAYS fetch from network (NO CACHE)
    if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
        event.respondWith(
            fetch(request, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            })
        );
        return;
    }
    
    // Supabase API - NO CACHE
    if (url.hostname.includes('supabase.co')) {
        event.respondWith(
            fetch(request, {
                cache: 'no-store'
            })
        );
        return;
    }
    
    // Other GET requests - use cache but validate
    if (request.method === 'GET') {
        event.respondWith(
            caches.match(request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        // Check if cache is still fresh
                        return fetch(request)
                            .then(networkResponse => {
                                if (networkResponse.status === 200) {
                                    caches.open(CACHE_NAME)
                                        .then(cache => {
                                            cache.put(request, networkResponse.clone());
                                        });
                                }
                                return networkResponse;
                            })
                            .catch(() => {
                                return cachedResponse;
                            });
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
    }
});
