const CACHE_NAME = 'absenmuka-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/Absensi.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
