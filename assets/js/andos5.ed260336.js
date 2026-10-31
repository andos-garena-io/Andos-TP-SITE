/* ============================================================================
   ANDOS — splash controller (v3, frame-accurate)
   ----------------------------------------------------------------------------
   Contract:
   1. NEVER writes video.currentTime  -> clip apni frame 0 se 2.70s tak poora chalta hai.
   2. Dismiss sirf `ended` par hota hai. Watchdog = duration + 1500ms (safety only).
   3. Pehla frame aate hi poster hata do (poster == frame 0, byte-identical) ->
      koi black flash, koi scale jump, koi fade nahi.
   ----------------------------------------------------------------------------
   Globals (unchanged contract for the rest of the app):
     window.__andosIsStandalonePWA, __andosSplashActive, __andosSplashDone
     event: andos:splash:done      (splash-paint layer + app listen karte hain)
     event: andos:auth:resolved    (andos6 dispatch karta hai)
   ========================================================================== */
(function () {
  'use strict';

  var ov = document.getElementById('appSplashOverlay');
  if (!ov) return;

  var video = document.getElementById('appSplashVideo');

  var ZOOM_MS = 470;            /* exit animation length (unchanged) */
  var WATCHDOG_MS = 2600;       /* HARD CAP: 2.6s — koi event na aaye to bhi splash band */
  var WATCHDOG_EXTRA_MS = 250;  /* duration ke baad ka margin (total 3.0s ke andar) */
  var AUTH_GRACE_AFTER_ENDED = 250; /* video khatam hone ke baad auth ka max intezaar */
  var BG_REPLAY_MS = 1800000;   /* 30 min background -> splash dobara */

  var ended = false;            /* video ne apna aakhri frame dikha diya */
  var authResolved = !!window.__andosAuthResolved;
  var removed = false;          /* overlay DOM se ja chuka */
  var firstFrameSeen = false;
  var watchdog = null;
  var authGrace = null;

  /* ---------- standalone detection (kept) ---------- */
  var standalone = false;
  try {
    standalone = !!(
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true
    );
  } catch (e) {}
  window.__andosIsStandalonePWA = standalone;

  /* ---------- background bookkeeping (kept) ---------- */
  var bgSince = 0;
  try { bgSince = Number(localStorage.getItem('andos_bg_since') || 0); } catch (e) {}
  document.addEventListener('visibilitychange', function () {
    try {
      if (document.hidden) localStorage.setItem('andos_bg_since', String(Date.now()));
      else localStorage.removeItem('andos_bg_since');
    } catch (e) {}
  }, { passive: true });

  /* ---------- once-per-session short circuit (kept) ---------- */
  var skip = false;
  try { skip = sessionStorage.getItem('andos_splash_done') === '1'; } catch (e) {}
  if (bgSince > 0 && Date.now() - bgSince >= BG_REPLAY_MS) {
    try { sessionStorage.removeItem('andos_splash_done'); } catch (e) {}
    skip = false;
    try { document.documentElement.classList.remove('andos-skip-splash'); } catch (e) {}
  }
  try { localStorage.removeItem('andos_bg_since'); } catch (e) {}

  if (skip || document.visibilityState === 'hidden') {
    hardSkip();
    return;
  }

  /* ================= active splash ================= */
  window.__andosSplashActive = true;
  writeTheme('#000000');
  armWatchdog(WATCHDOG_MS);

  if (!video) { finishNow(); return; }

  /* --- 2. watchdog settles once we know the real duration (safety only) --- */
  video.addEventListener('loadedmetadata', function () {
    var d = (isFinite(video.duration) && video.duration > 0) ? video.duration : 2.7;
    armWatchdog(Math.round(d * 1000) + WATCHDOG_EXTRA_MS);
  }, { once: true });

  /* --- 3. the ONLY normal exit --- */
  video.addEventListener('ended', onEnded, { once: true });

  /* --- 4. failure paths (never hang, never trim a playing clip) --- */
  video.addEventListener('error', failFast, { once: true });

  /* --- 5. kick playback (autoplay attribute bhi hai, yeh safety hai) --- */
  try {
    var pr = video.play();
    if (pr && typeof pr.catch === 'function') pr.catch(function () {
      setTimeout(function () {                 /* ek retry, phir gracefully exit */
        try { video.play().catch(failFast); } catch (e) { failFast(); }
      }, 120);
    });
  } catch (e) { failFast(); }

  /* ================================================================ */

  function onEnded() {
    if (ended) return;
    ended = true;
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }

    /* Aakhri frame ko present hone do, phir zoom-out shuru karo.
       (Video ko kabhi nahi kaatta — `ended` pehle hi aa chuka hai.) */
    /* rVFC/frame-seek hata diya — seededha, natural: video khatam -> exit */
    if (authResolved) dismiss();
    else authGrace = setTimeout(function () { authResolved = true; dismiss(); }, AUTH_GRACE_AFTER_ENDED);
  }

  function failFast() {
    if (ended) return;
    ended = true;
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    setTimeout(function () { authResolved = true; dismiss(); }, 400);
  }

  function armWatchdog(ms) {
    if (watchdog) clearTimeout(watchdog);
    watchdog = setTimeout(function () {        /* sirf safety — normal path nahi */
      ended = true;
      authResolved = true;
      dismiss();
    }, ms);
  }

  document.addEventListener('andos:auth:resolved', function () {
    if (authResolved) return;
    authResolved = true;
    if (authGrace) { clearTimeout(authGrace); authGrace = null; }
    if (ended) dismiss();                      /* exit tab hi jab video khatam ho */
  });

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { authResolved = true; ended = true; dismiss(); }
  });

  /* ---------- exit ---------- */
  function dismiss() {
    if (removed) return;
    removed = true;
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    if (authGrace) { clearTimeout(authGrace); authGrace = null; }
    try { sessionStorage.setItem('andos_splash_done', '1'); } catch (e) {}

    try {
      ov.id = ov.id || 'andosSplashOv';
      ov.classList.add('andos-zoom-out');
      ov.style.transition = 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease';
      ov.style.transformOrigin = 'center center';
      ov.style.willChange = 'transform, opacity';
      ov.style.transform = 'scale(2.2)';
      ov.style.opacity = '0';
    } catch (e) { ov.style.opacity = '0'; }
    ov.style.pointerEvents = 'none';
    try { window.__andosPlayCinematicEntry(); } catch (e) {}

    setTimeout(function () {
      try { if (video) video.pause(); } catch (e) {}
      try { ov.remove(); } catch (e) {}
      window.__andosSplashActive = false;
      window.__andosSplashDone = true;
      try { document.dispatchEvent(new CustomEvent('andos:splash:done')); } catch (e) {}
      try {
        if (typeof window.__andosApplyStatus === 'function') window.__andosApplyStatus();
        else window.dispatchEvent(new Event('scroll'));
      } catch (e) {}
    }, ZOOM_MS);
  }

  function hardSkip() {
    /* doosra load same session me: splash dobara na dikhe, ek frame bhi na paint ho */
    removed = true;
    ended = true;
    try { document.documentElement.classList.add('andos-skip-splash'); } catch (e) {}
    if (video) {
      try { video.pause(); video.removeAttribute('poster'); video.removeAttribute('src'); video.load(); } catch (e) {}
    }
    try { ov.remove(); } catch (e) {}
    window.__andosSplashActive = false;
    window.__andosSplashDone = true;
    try { sessionStorage.setItem('andos_splash_done', '1'); } catch (e) {}
    try { window.__andosPlayCinematicEntry(); } catch (e) {}
    try { document.dispatchEvent(new CustomEvent('andos:splash:done')); } catch (e) {}
  }

  function finishNow() { authResolved = true; ended = true; dismiss(); }

  function writeTheme(color) {
    try {
      if (typeof window.__andosWriteMetaTheme === 'function') { window.__andosWriteMetaTheme(color); return; }
    } catch (e) {}
    try {
      var metas = document.querySelectorAll('meta[name="theme-color"]');
      for (var i = 0; i < metas.length; i++) metas[i].setAttribute('content', color);
    } catch (e) {}
  }
})();
