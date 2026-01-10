const CACHE_NAME = 'skinner-box-v2';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './storage.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './psych_test_01.json',
    './psych_test_02.json',
    './psych_test_03.json',
    './psych_test_04.json',
    './psych_test_05.json',
    './psych_test_06.json',
    './images/logo_new.png'
];

// Install Event: Cache everything
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Install');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching all assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activate');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

// Fetch Event: Cache First strategy with Network Fallback for most things
// But for development safety, we'll strive for:
// 1. Cache
// 2. Network
// 3. Fallback (if offline)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Hit? Return it
            if (response) {
                return response;
            }
            // Miss? Fetch from network
            return fetch(event.request).catch(() => {
                // Network failed (offline).
                // If it's a navigation request, we could return index.html,
                // but since we cache index.html, the match above should have hit for './'.
                console.log('[Service Worker] Fetch failed (offline)', event.request.url);
            });
        })
    );
});
