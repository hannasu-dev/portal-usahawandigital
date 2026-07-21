// =========================================
// SERVICE WORKER - Fixed clone error
// =========================================

const CACHE_NAME = 'usahawan-digital-v6';

const STATIC_ASSETS = [
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
                console.log('[SW] Caching static assets...');
                return cache.addAll(STATIC_ASSETS);
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
// FETCH - Fixed clone error
// =========================================
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // HTML files - ALWAYS from network (NO CACHE)
    if (request.mode === 'navigate' || url.pathname.endsWith('.html')) {
        event.respondWith(
            fetch(request, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            }).catch(() => {
                return new Response(
                    '<h1>Offline</h1><p>Sila sambung ke internet.</p>',
                    { headers: { 'Content-Type': 'text/html' } }
                );
            })
        );
        return;
    }
    
    // Supabase API - NEVER cache
    if (url.hostname.includes('supabase.co')) {
        event.respondWith(
            fetch(request, { cache: 'no-store' })
        );
        return;
    }
    
    // Static assets - Cache with proper clone handling
    if (request.method === 'GET') {
        event.respondWith(
            caches.match(request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        // Update cache in background WITHOUT cloning error
                        fetch(request).then(networkResponse => {
                            if (networkResponse && networkResponse.status === 200) {
                                // Clone response before using it
                                const clonedResponse = networkResponse.clone();
                                caches.open(CACHE_NAME).then(cache => {
                                    cache.put(request, clonedResponse);
                                });
                            }
                        }).catch(() => {});
                        return cachedResponse;
                    }
                    return fetch(request).then(networkResponse => {
                        if (networkResponse && networkResponse.status === 200) {
                            // Clone response before caching
                            const clonedResponse = networkResponse.clone();
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(request, clonedResponse);
                            });
                            return networkResponse;
                        }
                        return networkResponse;
                    });
                })
                .catch(() => {
                    return new Response('Resource not available', { status: 503 });
                })
        );
        return;
    }
    
    // Other requests - just network
    event.respondWith(fetch(request));
});
