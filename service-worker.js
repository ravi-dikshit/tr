
// service-worker.js

const APP_CACHE = 'series-app-v1';
const APP_SHELL = [
  './',               // relative paths for GitHub Pages subpath
  './index.html',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== APP_CACHE ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Don’t attempt to cache YouTube video embeds/streams
  if (url.hostname.endsWith('youtube.com') || url.hostname.endsWith('ytimg.com')) {
    return;
  }

  // App shell & static: cache-first
  if (req.method === 'GET' && APP_SHELL.some(p => url.pathname.endsWith(p.replace('./','')))) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(APP_CACHE).then(cache => cache.put(req, copy));
        return res;
      }))
    );
    return;
  }

  // YouTube Data API & JSON: network-first with cache fallback
  if (url.hostname === 'www.googleapis.com') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(APP_CACHE).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Default: try cache, then network
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (req.method === 'GET' && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(APP_CACHE).then(cache => cache.put(req, copy));
      }
      return res;
    }))
  );
});
