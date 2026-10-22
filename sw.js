/* ANDOS Production Service Worker — Force Cache Buster & Fresh HTML Guarantee */
const SW_VERSION = 'andos-sw-v2026-10-22-r4';

self.addEventListener('install', (event) => {
  // Activate the updated worker immediately without waiting for old tabs to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1. Delete EVERY old Cache Storage bucket immediately
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch (e) {}

    // 2. Claim control of all open clients immediately
    await self.clients.claim();

    // 3. Notify all open windows/PWA shells so stale HTML reloads cleanly to latest build
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      try {
        client.postMessage({ type: 'ANDOS_SW_UPDATED', version: SW_VERSION });
      } catch (e) {}
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Always fetch HTML / navigation requests directly from network (never trap users on cached index.html)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (
    req.mode === 'navigate' ||
    req.destination === 'document' ||
    url.pathname === '/' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/manifest.json')
  ) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() => caches.match(req))
    );
  }
});
