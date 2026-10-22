/* ANDOS Production Service Worker v3 — Cache Versioning, Legacy PWA Auto-Purge & Fresh HTML Guarantee */
const CACHE_VERSION = 'v3';
const STATIC_MEDIA_CACHE = 'andos-media-' + CACHE_VERSION;
const APP_BUILD_ID = 'andos-v3-20261022';
const PRECACHE_MEDIA = [
  './assets/videos/splash-loading.mp4',
  './assets/app-icon/logo-192.png',
  './assets/app-icon/logo-512.png'
];

// Track clients that confirm running the latest APP_BUILD_ID
const ackedClients = new Set();

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(STATIC_MEDIA_CACHE);
      await Promise.allSettled(
        PRECACHE_MEDIA.map((url) =>
          fetch(url, { cache: 'reload' }).then((res) => {
            if (res && res.ok) return cache.put(url, res.clone());
          })
        )
      );
    } catch (e) {}
    // Activate v3 immediately without waiting for old tabs/PWA shells to close
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1. Delete EVERY old Cache Storage entry from previous versions (anything !== 'andos-media-v3')
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== STATIC_MEDIA_CACHE)
          .map((key) => caches.delete(key))
      );
    } catch (e) {}

    // 2. Immediately claim control of all open tabs & installed standalone PWA windows
    await self.clients.claim();

    // 3. Notify all windows & auto-upgrade any legacy installed PWA still running stale HTML
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      try {
        client.postMessage({
          type: 'ANDOS_SW_UPDATED',
          version: CACHE_VERSION,
          cacheName: STATIC_MEDIA_CACHE,
          buildId: APP_BUILD_ID
        });
      } catch (e) {}
    }

    // If an older pre-v3 installed PWA window has no message listener to ACK, force-navigate it to fresh network HTML!
    if (windows.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      for (const client of windows) {
        if (!ackedClients.has(client.id)) {
          try {
            if (typeof client.navigate === 'function' && client.url && client.url.startsWith(self.location.origin)) {
              await client.navigate(client.url);
            }
          } catch (e) {}
        }
      }
    }
  })());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'ANDOS_CLIENT_ACK' && event.source && event.source.id) {
    if (data.buildId === APP_BUILD_ID) {
      ackedClients.add(event.source.id);
    }
    return;
  }
  if (data.type === 'ANDOS_SW_STATUS' && event.source) {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      event.source.postMessage({
        type: 'ANDOS_SW_STATUS_REPLY',
        version: CACHE_VERSION,
        cacheName: STATIC_MEDIA_CACHE,
        buildId: APP_BUILD_ID,
        activeCaches: keys
      });
    })());
  }
});

// Network-first (`no-store`) for ALL HTML & manifest requests; instant cache-first ONLY for versioned static media (`v3`)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 1. Always bypass cache for index.html, root navigation, manifest.json & sw.js so users NEVER get stale HTML
  if (
    req.mode === 'navigate' ||
    req.destination === 'document' ||
    url.pathname === '/' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/manifest.json') ||
    url.pathname.endsWith('/sw.js')
  ) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() => caches.match(req))
    );
    return;
  }

  // 2. Serve splash video & app icons instantaneously from `andos-media-v3` (zero cold-start lag!)
  if (
    url.origin === self.location.origin &&
    (url.pathname.includes('/assets/videos/splash-loading.mp4') || url.pathname.includes('/assets/app-icon/'))
  ) {
    event.respondWith(
      caches.open(STATIC_MEDIA_CACHE).then(async (cache) => {
        // Range-safe direct pass-through if byte range requested by mobile hardware video decoder
        if (req.headers.has('range')) {
          return fetch(req);
        }
        const hit = await cache.match(req, { ignoreSearch: true });
        if (hit) return hit;
        const fresh = await fetch(req);
        if (fresh && fresh.status === 200) {
          cache.put(req, fresh.clone()).catch(() => {});
        }
        return fresh;
      })
    );
  }
});
