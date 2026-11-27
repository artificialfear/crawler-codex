/* Crawler Codex service worker: keeps the app itself on the phone so it opens with no signal.
   - Page (index.html): network first, fall back to the saved copy when offline.
   - Everything else on this site: cache first (URLs carry ?v=<content hash>, so a new
     version is a new URL and never stale).
   - Google Apps Script (the data): never touched here; the app handles offline data itself. */
const CACHE = 'codex-app-v1';

self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// The page sends the files it loaded before this worker was running.
const ASSET = /\.(js|css|png|webp|ttf|json)(\?|$)/;
self.addEventListener('message', (e) => {
  const d = e.data || {};
  const jobs = [];
  if (d.page) jobs.push(['./', d.page]);
  (d.assets || []).filter((u) => ASSET.test(u)).forEach((u) => jobs.push([u, u]));
  e.waitUntil(caches.open(CACHE).then((cache) => Promise.all(jobs.map(async ([key, u]) => {
    try {
      const res = await fetch(u, { cache: 'no-cache' });
      const type = res.headers.get('content-type') || '';
      if (res.ok && (key !== './' || type.includes('text/html'))) await cache.put(key, res);
    } catch (err) {}
  }))));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const net = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))]);
        if (net && net.ok && (net.headers.get('content-type') || '').includes('text/html')) cache.put('./', net.clone());
        return net;
      } catch (err) {
        return (await cache.match('./')) || (await cache.match(req)) || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) return hit;
    const net = await fetch(req);
    if (net && net.ok && ASSET.test(url.pathname + url.search)) cache.put(req, net.clone());
    return net;
  })());
});
