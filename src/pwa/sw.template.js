/* Service Worker: App offline verfügbar machen */
const CACHE = 'protokoll-__VERSION__';
/* Bundeslebensmittelschlüssel (ca. 1,2 MB): eigener Cache, bleibt über App-Updates erhalten; neuer Name bei neuer Datei */
const BLS_CACHE = 'protokoll-bls40-1';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== BLS_CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

/* Mitteilungen (Web Push über die eigene Weiterleitung) */
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  const opts = { body: d.body || '', icon: './icon-192.png', badge: './icon-192.png', data: { url: d.url || '' } };
  if (d.tag) opts.tag = d.tag;
  e.waitUntil(self.registration.showNotification(d.title || 'Protokoll', opts));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const c = list[0];
    if (c) { c.postMessage({ type: 'nav', url }); return c.focus ? c.focus() : c; }
    return self.clients.openWindow('./' + url);
  }));
});

function timeout(ms) { return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)); }

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/bls40.json')) {
    e.respondWith(caches.open(BLS_CACHE).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { if (res && res.ok) c.put(req, res.clone()); return res; }))));
    return;
  }
  if (req.mode === 'navigate') {
    // Online: neueste Version holen (max. 3 s), sonst die gespeicherte
    e.respondWith(
      Promise.race([fetch(req), timeout(3000)])
        .then((res) => {
          if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); return res; }
          return caches.match('./index.html').then((r) => r || res);
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
