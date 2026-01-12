const CACHE_NAME = 'skinner-box-online-v1';

// Install Event: Skip waiting to activate immediately
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Install (Online Only)');
    self.skipWaiting();
});

// Activate Event: Claim clients immediately
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activate');
    // Clear any old caches if they exist
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                console.log('[Service Worker] Removing old cache', key);
                return caches.delete(key);
            }));
        })
    );
    return self.clients.claim();
});

// Fetch Event: Network Only
// We do NOT cache anything. If offline, the browser's default offline page will show.
self.addEventListener('fetch', (event) => {
    // Just pass through to network
    return;
});
