const CACHE = 'fbcore-app-v1';
const OFFLINE_URL = '/index.html';
const PRECACHE = ['/index.html', '/manifest.json', '/icons/icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (request.url.includes('/api/')) return;          // never cache API calls

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(request, c)); return res; })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(res => {
        if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(request, c)); }
        return res;
      });
      return cached ?? fetchPromise;
    })
  );
});
