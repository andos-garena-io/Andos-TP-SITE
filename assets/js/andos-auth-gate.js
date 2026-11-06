/* ANDOS auth gate — Google / non-anonymous Firebase only.
   Guest + anonymous session dashboard nahi kholte.
   Telegram APP OPEN sirf verified account par, alag highlight. */
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

  function relock(reason) {
    try {
      var d = document.documentElement;
      d.classList.add('yg-lock');
      d.setAttribute('data-auth', 'login');
      lsSet('andos_auth_state', 'out');
      window.__ANDOS_AUTH_LOCKED = false;
      window.__ANDOS_HAS_PERSISTED_AUTH = false;
      window.__ANDOS_IS_GUEST = false;
      var st = document.getElementById('andosNoFlashGate');
      if (st && st.parentNode) st.parentNode.removeChild(st);
    } catch (e) {}
    try {
      var gate = document.getElementById('yuvaGate');
      if (gate) {
        gate.style.display = '';
        gate.classList.remove('saved-account');
      }
    } catch (e) {}
    hideGuestCta();
  }

  function hideGuestCta() {
    try {
      ['guestBtn', 'guestPage'].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (id === 'guestBtn') {
          el.style.display = 'none';
          if (el.parentElement) el.parentElement.style.display = 'none';
        }
      });
    } catch (e) {}
  }

  window.__andosGuestLogin = function () {
    try { hideGuestCta(); } catch (e) {}
    try {
      if (typeof showToast === 'function') showToast('Google se login karo — guest band hai.', 'warning');
    } catch (e) {}
    return Promise.reject(new Error('guest-disabled'));
  };

  function killAnonymousApi() {
    try {
      if (window.firebase && firebase.auth && firebase.auth.Auth && firebase.auth.Auth.prototype) {
        firebase.auth.Auth.prototype.signInAnonymously = function () {
          return Promise.reject(new Error('anonymous-disabled'));
        };
      }
    } catch (e) {}
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
      var photo = '';
      try { photo = (u.photoURL || '') + ''; } catch (e) {}
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

  function onAuth(u) {
    hideGuestCta();
    killAnonymousApi();
    if (!u) return;
    if (u.isAnonymous || !isVerifiedUser(u)) {
      try { getAuth() && getAuth().signOut(); } catch (e) {}
      relock('anonymous');
    }
  }

  function boot() {
    hideGuestCta();
    killAnonymousApi();
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t) return;
      if (t.id === 'guestBtn' || (t.closest && t.closest('#guestBtn'))) {
        e.preventDefault();
        e.stopPropagation();
        window.__andosGuestLogin();
      }
    }, true);
    waitUser(onAuth);
    var auth = getAuth();
    if (auth && auth.onAuthStateChanged) {
      try { auth.onAuthStateChanged(onAuth); } catch (e) {}
    } else {
      var i = 0, tm = setInterval(function () {
        var a = getAuth();
        if (a || ++i > 50) {
          clearInterval(tm);
          if (a) try { a.onAuthStateChanged(onAuth); } catch (e) {}
        }
      }, 200);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
