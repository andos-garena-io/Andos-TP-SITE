/* ANDOS auth gate — Telegram VERIFIED OPEN for Google / non-anonymous only.
   Guest + anonymous login is allowed. This file must never hide guest CTA
   or reject signInAnonymously. */
(function () {
  'use strict';

  function mute() {
    try { return !!(window.__andosTgMute && window.__andosTgMute()); } catch (e) { return false; }
  }

  function lsGet(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
  }

  function getAuth() {
    try {
      if (window.auth && typeof window.auth.onAuthStateChanged === 'function') return window.auth;
      if (window.firebase && firebase.auth) return firebase.auth();
    } catch (e) {}
    return null;
  }

  function isVerifiedUser(u) {
    if (!u || u.isAnonymous) return false;
    var email = String(u.email || '').trim();
    var providers = [];
    try {
      (u.providerData || []).forEach(function (p) {
        if (p && p.providerId) providers.push(String(p.providerId));
      });
    } catch (e) {}
    if (providers.indexOf('google.com') !== -1) return true;
    if (email) return true;
    return false;
  }

  function providerLabel(u) {
    try {
      var p = (u.providerData && u.providerData[0] && u.providerData[0].providerId) || '';
      if (p === 'google.com') return 'Google';
      return p || 'Firebase';
    } catch (e) { return 'Firebase'; }
  }

  function waitUser(cb) {
    var n = 0;
    (function tick() {
      var auth = getAuth();
      if (!auth) {
        if (++n > 80) return cb(null);
        return setTimeout(tick, 100);
      }
      var done = false;
      var t = setTimeout(function () {
        if (done) return;
        done = true;
        try { cb(auth.currentUser || null); } catch (e) { cb(null); }
      }, 8000);
      try {
        var unsub = auth.onAuthStateChanged(function (u) {
          if (done) return;
          done = true;
          clearTimeout(t);
          try { unsub(); } catch (e) {}
          cb(u || null);
        });
      } catch (e) {
        clearTimeout(t);
        cb(auth.currentUser || null);
      }
    })();
  }

  window.__andosAuthAppOpenPing = function () {
    if (mute()) return;
    var key = 'andos_tg_open_ping_v';
    try {
      var now = Date.now();
      var prev = Number(lsGet(key) || 0);
      if (now - prev < 864e5) return;
    } catch (e) {}
    waitUser(function (u) {
      if (!isVerifiedUser(u)) return;
      try { lsSet(key, String(Date.now())); } catch (e) {}
      var name = '';
      try { name = u.displayName || ''; } catch (e) {}
      try {
        var au = JSON.parse(lsGet('andos_user') || 'null');
        if (au && (au.name || au.mobile)) name = name || au.name || au.mobile;
      } catch (e) {}
      name = name || (u.email || '').split('@')[0] || 'ANDOS user';
      var fields = [
        ['Name', name],
        ['Email', u.email || ''],
        ['UID', u.uid || '', 'code'],
        ['Login', providerLabel(u)],
        ['Platform', (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || ''],
        ['Page', location.hostname || 'local']
      ];
      if (typeof window.tgCard === 'function') {
        window.tgCard(
          '\uD83D\uDFE2',
          'VERIFIED OPEN',
          fields,
          'Firebase non-anonymous · Google/account session',
          null
        );
      }
    });
  };
})();
