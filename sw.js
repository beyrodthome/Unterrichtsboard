/* Unterrichtsboard – Offline-Speicher (Service Worker)
   Die Seite wird beim ersten Öffnen gespeichert und funktioniert danach auch ohne Internet.
   Mit Internet wird immer zuerst die neueste Version geladen. */
const CACHE = 'unterrichtsboard-v1';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => (k.startsWith('klassenboard-') || k.startsWith('unterrichtsboard-')) && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Seite: erst Netz (max. 3 s), sonst gespeicherte Fassung. Bilder & Co.: erst Speicher.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const net = await Promise.race([
          fetch(req, { cache: 'no-store' }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))
        ]);
        if (net && net.ok) { cache.put('./index.html', net.clone()); return net; }
        throw new Error('bad');
      } catch (err) {
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
    return res;
  })));
});
