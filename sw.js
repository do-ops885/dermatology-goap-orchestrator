const CACHE_VERSION = 'v2';
const CACHES = {
  static: `clinical-ai-static-${CACHE_VERSION}`,
  models: `clinical-ai-models-v1`, // Keep v1 to avoid re-downloading large models on app update
  runtime: `clinical-ai-runtime-${CACHE_VERSION}`,
};

const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

// Domains that host large AI model weights (TF.js, WebLLM/HuggingFace)
const MODEL_DOMAINS = [
  'storage.googleapis.com', // TF.js models
  'huggingface.co', // WebLLM weights
  'raw.githubusercontent.com', // Model configs
  'cdn.jsdelivr.net', // Libraries
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHES.static)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old static/runtime caches, but PRESERVE model cache
            const isStatic =
              cacheName.startsWith('clinical-ai-static-') && cacheName !== CACHES.static;
            const isRuntime =
              cacheName.startsWith('clinical-ai-runtime-') && cacheName !== CACHES.runtime;

            if (isStatic || isRuntime) {
              console.log('[SW] Cleaning old cache:', cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Model Weights Strategy: Cache First, Fallback to Network
  // These files are large and immutable (usually versioned by hash or path)
  if (
    MODEL_DOMAINS.some((domain) => url.hostname.includes(domain)) ||
    url.pathname.endsWith('.bin') ||
    url.pathname.endsWith('.json')
  ) {
    event.respondWith(
      caches.open(CACHES.models).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            // Only cache valid responses
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      }),
    );
    return;
  }

  // 2. Static Assets Strategy: Stale While Revalidate
  // Serve cached immediately, update in background
  if (
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    event.request.destination === 'image' ||
    url.origin === self.location.origin
  ) {
    event.respondWith(
      caches.open(CACHES.static).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch((error) => {
              // Network failure - return cached response if available, else error
              console.log('[SW] Network fail for static asset:', error);
              if (cachedResponse) {
                return cachedResponse;
              }
              // If no cache and network fails, return a basic error response
              return new Response('Network error', {
                status: 503,
                statusText: 'Service Unavailable',
              });
            });

          return cachedResponse || fetchPromise;
        });
      }),
    );
    return;
  }

  // 3. Default: Network First, Fallback to Runtime Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Don't cache API calls or non-GET
        if (
          !response ||
          response.status !== 200 ||
          response.type !== 'basic' ||
          event.request.method !== 'GET'
        ) {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHES.runtime).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      }),
  );
});
