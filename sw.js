/* ANDOS — TEMPORARY HOLD SW (server busy page)
   Kaam: purane app ke saare caches saaf karo, koi fetch intercept nahi ->
   sab kuch seedha network se aayega (yaani naya index.html = Server Busy page).
   Revert: isi file ko git se wapas laana (git checkout <prev> -- sw.js). */
const HOLD_VERSION = 'busy-hold-1';

self.addEventListener('install', (e) => { self.skipWaiting(); });

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) {}
    try { await self.clients.claim(); } catch (e) {}
    try {
      const list = await self.clients.matchAll({ type: 'window' });
      for (const c of list) { try { c.navigate(c.url); } catch (e) {} }
    } catch (e) {}
  })());
});

/* koi fetch handler nahi -> browser default (network) behaviour */
