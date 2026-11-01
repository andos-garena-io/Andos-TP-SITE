/* ANDOS Production Service Worker v3 — Cache Versioning, Legacy PWA Auto-Purge & Fresh HTML Guarantee */
const CACHE_VERSION = 'v18';
const STATIC_MEDIA_CACHE = 'andos-media-' + CACHE_VERSION;
const HTML_CACHE = 'andos-html-' + CACHE_VERSION;
const HTML_KEY = 'index.html';   /* single key: / or /index.html?source=pwa sab isi par */
const APP_BUILD_ID = 'andos-v3-20261101c1';
const PRECACHE_MEDIA = [
  './assets/videos/splash-loading.mp4',
  './assets/app-icon/splash-frame0-ed73c7df.webp',
  './assets/app-icon/logo-192.png',
  './assets/app-icon/logo-512.png',
  './assets/css/tw.2d52300d.css',
  './assets/css/andos1.f4a7f80d.css',
  './assets/css/andos2.c35d525b.css',
  './assets/css/andos3.8eaf10d2.css',
  './assets/css/andos4.6b07466e.css',
  './assets/css/andos5.1c269aa0.css',
  './assets/css/fa.6.5.0.min.css',
  './assets/css/gf.local.css',
  './assets/css/gf2.local.css',
  './assets/photos/hero-anniversary-a.jpg',
  './assets/app-icon/logo-1254.png',
  './assets/js/andos2.8556ab0e.js',
  './assets/js/andos3.719baac1.js',
  './assets/js/andos4.4ca47c00.js',
  './assets/js/andos6.15ddda7d.js',
  './assets/js/deeplink.0cb0a828.js',
  './assets/mirror/FF-PLAN-520/combo-card.jpg',
  './assets/mirror/FF-PLAN-520/featured-plans.jpg',
  './assets/mirror/FF-PLAN-520/ff-card.jpg',
  './assets/mirror/FF-PLAN-520/ff-guild.png',
  './assets/mirror/FF-PLAN-520/mega-packs.jpg',
  './assets/mirror/FF-PLAN-520/membership-plans.jpg',
  './assets/mirror/FF-PLAN-520/monthly-membership-offer.jpg',
  './assets/mirror/brand-logos/garena_logo.png',
  './assets/mirror/instruction-steps/step-1.png',
  './assets/mirror/instruction-steps/step-2.png',
  './assets/mirror/photos/cat-ai.png',
  './assets/mirror/photos/cat-bills.png',
  './assets/mirror/photos/cat-education.png',
  './assets/mirror/photos/cat-food.png',
  './assets/mirror/photos/cat-gaming.png',
  './assets/mirror/photos/cat-giftcard.png',
  './assets/mirror/photos/cat-health.png',
  './assets/mirror/photos/cat-ott.png',
  './assets/mirror/photos/cat-recharge.png',
  './assets/mirror/photos/cat-seeall.png',
  './assets/mirror/photos/cat-shopping.png',
  './assets/mirror/photos/cat-social.png',
  './assets/mirror/photos/cat-travel.png',
  './assets/mirror/photos/daily-streak-gift.jpg',
  './assets/mirror/photos/ff-rail-01.jpg',
  './assets/mirror/photos/ff-rail-02.jpg',
  './assets/mirror/photos/ff-rail-03.jpg',
  './assets/mirror/photos/ff-rail-04.jpg',
  './assets/mirror/photos/ff-rail-05.jpg',
  './assets/mirror/photos/ff-rail-06.jpg',
  './assets/mirror/photos/hero-anniversary-a.jpg',
  './assets/mirror/photos/invite-art.jpg',
  './assets/mirror/photos/leaderboard-p1.jpg',
  './assets/mirror/photos/leaderboard-p2.jpg',
  './assets/mirror/photos/leaderboard-p3.jpg',
  './assets/mirror/photos/leaderboard-podium.jpg',
  './assets/mirror/photos/trust-video-1.png',
  './assets/mirror/photos/verify-badge.png',
  './assets/mirror/photos/wallet-coin.png',
  './assets/mirror/photos/wallet-spin-banner.jpg',
  './assets/mirror/service-logos/airtel.png',
  './assets/mirror/service-logos/amazon.png',
  './assets/mirror/service-logos/facebook.png',
  './assets/mirror/service-logos/freefire.png',
  './assets/mirror/service-logos/instagram.png',
  './assets/mirror/service-logos/playstore.png',
  './assets/mirror/service-logos/youtube.png',
  './assets/shortcuts/deals-192.png',
  './assets/shortcuts/history-192.png',
  './assets/shortcuts/orders-192.png',
  './assets/shortcuts/wallet-192.png',
  './assets/splash/apple-startup-1125x2436.png',
  './assets/splash/apple-startup-1170x2532.png',
  './assets/splash/apple-startup-1284x2778.png',
  './assets/splash/apple-startup-750x1334.png',
  './assets/splash/apple-startup-828x1792.png'
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
/* ---- image fallback tile (blank asset kabhi nahi) ---- */
const FALLBACK_TILE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#312e81"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><rect width="96" height="96" rx="20" fill="url(#g)"/><path d="M48 28l5.6 12.4L66 46l-12.4 5.6L48 64l-5.6-12.4L30 46l12.4-5.6z" fill="#fff" opacity=".92"/></svg>';
function isImageRequest(url, req) {
  if (req.destination === 'image') return true;
  return /\.(png|jpe?g|webp|gif|svg|avif|ico)$/i.test(url.pathname);
}

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

      if (!cached) {
        try { return await net; } catch (e) { return Response.error(); }
      }
      /* NETWORK-FIRST: 1.2s tak naya HTML. Purana cache sirf timeout/offline par. */
      try {
        var fresh = await Promise.race([
          net,
          new Promise(function (_, rej) { setTimeout(function () { rej(new Error('html-timeout')); }, 1200); })
        ]);
        if (fresh && fresh.ok) return fresh;
      } catch (e) {}
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
    (url.pathname.includes('/assets/videos/splash-loading.mp4') || url.pathname.includes('/assets/app-icon/') ||
     url.pathname.startsWith('/assets/css/') || url.pathname.startsWith('/assets/js/') ||
     url.pathname.startsWith('/assets/mirror/') || url.pathname.startsWith('/assets/photos/') ||
     url.pathname.startsWith('/assets/ff-logo/') || url.pathname.startsWith('/assets/splash/') ||
     url.pathname.startsWith('/assets/shortcuts/') || url.pathname.startsWith('/assets/brand-logos/'))
  ) {
    event.respondWith(
      caches.open(STATIC_MEDIA_CACHE).then(async (cache) => {
        if (req.headers.has('range')) {
          return fetch(req);
        }
        const hit = await cache.match(req, { ignoreSearch: true });
        if (hit) return hit;
        let fresh = null;
        try { fresh = await fetch(req); } catch (e) { fresh = null; }
        if (fresh && fresh.status === 200) {
          cache.put(req, fresh.clone()).catch(() => {});
          return fresh;
        }
        /* 404 / offline / corrupt: image ke liye kabhi blank na dikhe -> inline tile */
        if (isImageRequest(url, req)) {
          return new Response(FALLBACK_TILE_SVG, {
            status: 200,
            headers: { 'Content-Type': 'image/svg+xml;charset=utf-8', 'Cache-Control': 'no-store' }
          });
        }
        return fresh || Response.error();
      })
    );
  }
});
