/* ANDOS Production Service Worker v3 — Cache Versioning, Legacy PWA Auto-Purge & Fresh HTML Guarantee */
const CACHE_VERSION = 'v9';
const STATIC_MEDIA_CACHE = 'andos-media-' + CACHE_VERSION;
const HTML_CACHE = 'andos-html-' + CACHE_VERSION;
const HTML_KEY = 'index.html';   /* single key: / or /index.html?source=pwa sab isi par */
const APP_BUILD_ID = 'andos-v3-20261030l58'; // must match window.__ANDOS_BUILD_ID in assets/js/andos3 (else SW forces a reload that skips the splash)
const PRECACHE_MEDIA = [
  './assets/videos/splash-loading.mp4',
  './assets/app-icon/splash-frame0-ed73c7df.webp',   // splash poster == mp4 frame 0 (byte-identical)
  './assets/app-icon/logo-192.png',
  './assets/app-icon/logo-512.png'
];

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

async function notifyAndUpgradeClients() {
  try {
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

    // Wait briefly for modern clients to ACK; auto-navigate any ancient client still stuck on pre-v3 cached HTML!
    if (windows.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      for (const client of windows) {
        if (!ackedClients.has(client.id)) {
          try {
            if (typeof client.navigate === 'function' && client.url && client.url.startsWith(self.location.origin)) {
              client.navigate(client.url).catch(() => {});
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {}
}

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1. Delete EVERY old Cache Storage entry from previous versions (anything !== 'andos-media-v3')
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== STATIC_MEDIA_CACHE && key !== HTML_CACHE)
          .map((key) => caches.delete(key))
      );
    } catch (e) {}

    // 2. Immediately claim control of all open tabs & installed standalone PWA windows
    await self.clients.claim();
  })().then(() => {
    // 3. Fire AFTER `activate` resolves to `'activated'` so `fetch` event dispatch NEVER deadlocks!
    setTimeout(notifyAndUpgradeClients, 60);
  }));
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

  // 0. APP LAUNCH (HTML): fresh HTML try karo, par 700ms se zyada intezaar nahi.
  //    Slow network par cached HTML turant milta hai -> splash/video bina rukavat shuru.
  //    Background fetch fresh HTML cache me daal deta hai (next launch ke liye).
  if (
    req.mode === 'navigate' ||
    req.destination === 'document' ||
    url.pathname === '/' ||
    url.pathname.endsWith('/index.html')
  ) {
    event.respondWith((async () => {
      let cache = null;
      try { cache = await caches.open(HTML_CACHE); } catch (e) {}
      const key = new Request(new URL(HTML_KEY, self.registration.scope).href);
      let cached = cache ? await cache.match(key).catch(() => null) : null;
      /* 7 din se purana cached HTML = user ne hafta bhar app khola hi nahi -> cache ignore */
      if (cached && cache) {
        try {
          const meta = await cache.match(HTML_KEY + '-at');
          const at = meta ? Number(await meta.text()) : 0;
          if (!at || Date.now() - at > 7 * 24 * 60 * 60 * 1000) cached = null;
        } catch (e) {}
      }

      const net = fetch(req, { cache: 'no-store' }).then((res) => {
        if (res && res.ok && cache) {
          cache.put(key, res.clone()).catch(() => {});
          cache.put(new Request(new URL(HTML_KEY + '-at', self.registration.scope).href),
                    new Response(String(Date.now()))).catch(() => {});
        }
        return res;
      });

      if (!cached) {                       /* pehli baar: cache khaali hai -> network */
        try { return await net; } catch (e) { return Response.error(); }
      }
      /* STALE-WHILE-REVALIDATE: cached HTML TURANT do (0 ms), fresh background me
         aa kar cache update karta rahega. Agli launch par naya build mil jayega. */
      net.catch(() => {});
      return cached;
    })());
    return;
  }

  // 1. manifest.json & sw.js: always network (chhote hain, fresh hi chahiye)
  if (url.pathname.endsWith('/manifest.json') || url.pathname.endsWith('/sw.js')) {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(req)));
    return;
  }

  // 2. Serve splash video & app icons instantaneously from `andos-media-v3` (zero cold-start lag!)
  if (
    url.origin === self.location.origin &&
    (url.pathname.includes('/assets/videos/splash-loading.mp4') || url.pathname.includes('/assets/app-icon/'))
  ) {
    event.respondWith(
      caches.open(STATIC_MEDIA_CACHE).then(async (cache) => {
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
