/*
 * Prod.io service worker (generated at build time from src/pwa/sw-template.js).
 * - Precaches every file of this build, so the game plays offline.
 * - Pages: network first (you get updates as soon as you're online), cache as fallback.
 * - Files: cache first; hashed file names change whenever their content does.
 * - Each build gets its own cache; old ones are removed once the new version takes over.
 */
const VERSION = '__VERSION__';
const CACHE = `prodio-${VERSION}`;
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('prodio-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html', { ignoreVary: true })),
    );
    return;
  }
  // ignoreVary: module scripts and styles are requested with an Origin header that precaching didn't send.
  event.respondWith(caches.match(request, { ignoreVary: true }).then((hit) => hit || fetch(request)));
});
