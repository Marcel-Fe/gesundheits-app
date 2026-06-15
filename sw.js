const CACHE_VERSION = 'gesundheitsapp-v33';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Kern-Assets, die immer offline verfügbar sein sollen
const CORE_ASSETS = [
  './',
  './index.html',
  './css/styles.css?v=33',
  './js/data.js?v=33',
  './js/content/foods.js?v=33',
  './js/content/recipes.js?v=33',
  './js/content/exercises.js?v=33',
  './js/content/sessions.js?v=33',
  './js/content.js?v=33',
  './js/knowledge.js?v=33',
  './js/logic.js?v=33',
  './js/app/core.js?v=33',
  './js/app/screens-start.js?v=33',
  './js/app/ernaehrung.js?v=33',
  './js/app/wissen.js?v=33',
  './js/app/training.js?v=33',
  './js/app/tracker.js?v=33',
  './js/app/coach.js?v=33',
  './js/app/play3d.js?v=33',
  './js/app/main.js?v=33',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/coach/max.png',
  './icons/coach/david.png',
  './icons/coach/alex.png',
  './icons/coach/sarah.png',
  './icons/coach/lisa.png',
  './icons/coach/emma.png'
];

// Install: Kern-Assets cachen + sofort aktiv werden.
// Robust: jede Datei einzeln (eine fehlende Datei legt den Worker NICHT mehr lahm).
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.all(CORE_ASSETS.map(u => cache.add(u).catch(() => {})));
    await self.skipWaiting();
  })());
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
//  - Seite/Navigation (HTML): NETWORK-FIRST → App-Shell ist immer aktuell, ein
//    kaputter Cache kann die App nicht mehr blockieren. Offline → Cache-Fallback.
//  - statische, versionierte Assets: cache-first mit Netz-Fallback + Runtime-Cache.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // externe (z. B. KI-Worker) durchlassen

  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(STATIC_CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

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
