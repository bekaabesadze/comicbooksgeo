const STATIC_CACHE = 'comicbooksgeo-static-v1';
const STATIC_ASSET_PATTERNS = [
  /^\/_next\/static\//,
  /^\/icons\//,
  /^\/fonts\//,
];
const STATIC_FILES = new Set([
  '/',
  '/manifest.webmanifest',
  '/icon.jpg',
  '/CBA.jpg',
  '/banner.jpg',
  '/hero-bg.png',
  '/globe.svg',
]);

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== STATIC_CACHE)
        .map((cacheName) => caches.delete(cacheName))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api')) return;

  const isStaticAsset = STATIC_FILES.has(url.pathname) || STATIC_ASSET_PATTERNS.some((pattern) => pattern.test(url.pathname));

  if (!isStaticAsset) {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request, { ignoreSearch: false });
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque') {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  })());
});
