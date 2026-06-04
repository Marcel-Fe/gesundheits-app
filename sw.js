const CACHE_VERSION = 'gesundheitsapp-v7';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Kern-Assets, die immer offline verfügbar sein sollen
const CORE_ASSETS = [
  './',
  './index.html',
  './css/styles.css?v=7',
  './js/data.js?v=7',
  './js/content.js?v=7',
  './js/knowledge.js?v=7',
  './js/logic.js?v=7',
  './js/app.js?v=7',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: Kern-Assets cachen + sofort aktiv werden
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: alte Caches aufräumen
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !k.startsWith(CACHE_VERSION)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch:
//  - KI-Anfragen (POST / fremde Origin) nie cachen → immer Netz
//  - statische GETs: cache-first mit Netz-Fallback + Runtime-Cache
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // externe (z. B. KI-Worker) durchlassen

  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
