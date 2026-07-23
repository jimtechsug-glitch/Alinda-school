const CACHE_NAME = 'alinda-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

// Install: Cache core assets robustly
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('PWA Service Worker: Caching critical assets');
      // Use Map to cache assets individually so a single missing file doesn't crash the install
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => 
          cache.add(url).catch(err => console.warn(`PWA Service Worker: Failed to cache ${url}`, err))
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('PWA Service Worker: Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network falling back to Cache
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  // Bypass socket, hot updates, API calls (we want actual API to be fresh)
  const url = event.request.url;
  if (
    url.includes('/api/') || 
    url.includes('ws://') || 
    url.includes('localhost:5000') ||
    url.includes('socket.io') ||
    url.includes('chrome-extension') ||
    url.includes('/@vite/') || 
    url.includes('hot-update')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful basic responses
        if (response && response.status === 200 && response.type === 'basic') {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, resClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, serve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // SPA fallback: If it's a navigation request, serve index.html
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html').then((indexResponse) => {
              return indexResponse || new Response('Offline: Page not found', {
                status: 503,
                headers: { 'Content-Type': 'text/html' }
              });
            });
          }
          
          // Fallback response for missing assets to avoid service worker crash
          return new Response('Offline resource not found', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});
