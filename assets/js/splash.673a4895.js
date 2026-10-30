/* ANDOS SPLASH CONTROLLER v3 — video/auth par depend nahi karta
   Rules:
   1) Dismiss HARD CAP 1300ms ke andar (slow net par bhi) — 4MB video ka intezaar nahi
   2) Sirf opacity fade (0.28s) => koi layout change / blink nahi
   3) Video optional: ho to 0.18s me fade-in, na ho to pure black splash
   4) Session memory + 30-min background reset (pehle jaisa behaviour)
*/
(function () {
  var ov = document.getElementById('appSplashOverlay');
  if (!ov) return;
  var video = document.getElementById('appSplashVideo');
  var CAP_MS = 1300;              /* hard cap — isse zyada splash kabhi nahi */
  var FADE_MS = 280;              /* fade-out */
  var BG_RESET_MS = 1800 * 1000;  /* 30 min background => splash dobara */
  var t0 = Date.now(), dismissed = false;

  var standalone = false;
  try { standalone = !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true); } catch (e) {}
  window.__andosIsStandalonePWA = standalone;

  var bgSince = 0;
  try { bgSince = Number(localStorage.getItem('andos_bg_since') || 0); } catch (e) {}
  try { localStorage.removeItem('andos_bg_since'); } catch (e) {}

  var seen = false;
  try { seen = sessionStorage.getItem('andos_splash_done') === '1'; } catch (e) {}
  if (bgSince > 0 && Date.now() - bgSince >= BG_RESET_MS) {
    seen = false;
    try { sessionStorage.removeItem('andos_splash_done'); } catch (e) {}
  }

  document.addEventListener('visibilitychange', function () {
    try {
      if (document.hidden) localStorage.setItem('andos_bg_since', String(Date.now()));
      else localStorage.removeItem('andos_bg_since');
    } catch (e) {}
  }, { passive: true });

  function killVideo() {
    if (!video) return;
    try { video.pause(); video.removeAttribute('src'); video.load(); video.remove(); } catch (e) {}
    video = null;
  }

  function finish(reason) {
    window.__andosSplashActive = false;
    window.__andosSplashDone = true;
    try { window.__andosPlayCinematicEntry && window.__andosPlayCinematicEntry(); } catch (e) {}
    try { document.dispatchEvent(new CustomEvent('andos:splash:done', { detail: { reason: reason, ms: Date.now() - t0 } })); } catch (e) {}
    try {
      if (typeof window.__andosApplyStatus === 'function') window.__andosApplyStatus();
      else window.dispatchEvent(new Event('scroll'));
    } catch (e) {}
  }

  function dismiss(reason) {
    if (dismissed) return;
    dismissed = true;
    try { sessionStorage.setItem('andos_splash_done', '1'); } catch (e) {}
    try {
      ov.style.transition = 'opacity ' + FADE_MS + 'ms cubic-bezier(.16,1,.3,1)';
      ov.style.willChange = 'opacity';
      ov.style.pointerEvents = 'none';
      ov.style.transform = 'none';
      ov.style.opacity = '0';            /* sirf opacity — koi scale/size change nahi => no blink */
    } catch (e) {}
    setTimeout(function () {
      killVideo();
      try { ov.remove(); } catch (e) {}
      finish(reason);
    }, FADE_MS + 20);
  }

  /* is session me dikh chuka ya tab hidden hai => turant hatao */
  if (seen || document.visibilityState === 'hidden') {
    killVideo();
    try { ov.remove(); } catch (e) {}
    finish('skipped');
    return;
  }

  window.__andosSplashActive = true;

  /* splash ke dauraan status bar black */
  try {
    if (typeof window.__andosWriteMetaTheme === 'function') window.__andosWriteMetaTheme('#000000');
    else Array.prototype.forEach.call(document.querySelectorAll('meta[name="theme-color"]'), function (m) { m.setAttribute('content', '#000000'); });
  } catch (e) {}

  if (video) {
    video.style.opacity = '0';
    video.style.transition = 'opacity .18s ease-out';
    video.addEventListener('loadedmetadata', function () {
      try { if (video && video.duration > 0.6) video.currentTime = 0.3; } catch (e) {}
    }, { once: true });
    video.addEventListener('playing', function () { try { video.style.opacity = '1'; } catch (e) {} }, { once: true });
    video.addEventListener('error', function () { try { video.style.opacity = '0'; } catch (e) {} }, { once: true });
    try {
      video.muted = true;
      video.setAttribute('muted', '');
      video.src = './assets/videos/splash-loading.mp4';
      var pr = video.play();
      if (pr && pr.catch) pr.catch(function () { /* autoplay blocked => black splash, phir bhi fine */ });
    } catch (e) {}
  }

  /* HARD CAP — video khatam hone ya auth resolve hone ka wait NAHI */
  setTimeout(function () { dismiss('cap'); }, CAP_MS);
})();
