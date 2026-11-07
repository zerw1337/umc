const BASE = '/basic-pwa/';
const CACHE_NAME = 'my-pwa-v1';

const APP_SHELL = [
    BASE,
    BASE + 'index.html',
];


self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(APP_SHELL);
        })
    );

    self.skipWaiting();
});


self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );

    self.clients.claim();
});


self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }


    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(async () => {
                return (
                    await caches.match(BASE + 'index.html')
                ) || Response.error();
            })
        );
        return;
    }

    event.respondWith(
        caches.match(request).then(async (cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            const response = await fetch(request);

            if (response.ok) {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(request, response.clone());
            }

            return response;
        })
    );
});