/* ANDOS STATUSBAR SYNC v4 — "no separate solid strip", deterministic
   1) SCROLLED (header hero ke upar nahi raha):
        header ko solid #ffffff karte hain aur theme-color/html/body bhi #ffffff
        -> browser chrome, status-bar band aur header = teeno bilkul ek rang. Koi sampling nahi.
   2) TOP (header transparent, hero image ke upar):
        theme-color = brand hero colour (--andos-hero-color / manifest #F9A8D4)
        -> band bhi wahi pink dikhta hai, isliye seam nahi dikhta.
   3) NON-HOME pages: header ka apna bg (opaque) ya usko ambient page colour par composite.
   Wahi colour: --andos-top-color + saare meta[theme-color] + html/body background. */
(function () {
  var ROOT = document.documentElement;
  var NAV = 'nav.home-topbar, nav.glass-nav.enterprise-nav';
  var HERO = '#F9A8D4';
  var SCROLLED = '#ffffff';
  var baseBody = null;

  function parse(c) {
    if (!c || c === 'transparent') return null;
    var m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var p = m[1].split(/[,\/\s]+/).filter(function (v) { return v !== ''; }).map(parseFloat);
    if (p.length < 3) return null;
    var a = p.length > 3 ? p[3] : 1;
    return { r: p[0], g: p[1], b: p[2], a: isNaN(a) ? 1 : a };
  }
  function toHex(c) {
    function p(v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }
    return '#' + p(c.r) + p(c.g) + p(c.b);
  }
  function over(top, base) {
    var a = top.a == null ? 1 : top.a;
    if (a >= 1) return { r: top.r, g: top.g, b: top.b, a: 1 };
    return { r: top.r * a + base.r * (1 - a), g: top.g * a + base.g * (1 - a), b: top.b * a + base.b * (1 - a), a: 1 };
  }
  /* app ka ambient page colour — pehli baar me capture, phir wo hi use hota hai
     (apne hi override se feedback loop na bane) */
  function ambient() {
    if (baseBody) return baseBody;
    var c = parse(getComputedStyle(document.body).backgroundColor);
    if (!(c && c.a > 0.02)) c = parse(getComputedStyle(ROOT).backgroundColor);
    if (!(c && c.a > 0.02)) c = { r: 255, g: 255, b: 255, a: 1 };
    baseBody = c;
    return c;
  }
  function scroller() {
    var ps = document.querySelector('.page-section');
    if (ps && ps.scrollHeight > ps.clientHeight + 4) return ps;
    return null;
  }
  function scrollTop() {
    var s = scroller();
    return Math.max(s ? s.scrollTop : 0, window.scrollY || document.documentElement.scrollTop || 0);
  }


  /* ---- header ke peeche asli painted layer ka rang (glass ke liye) ---- */
  var mediaCache = {};
  function gradFirst(bgi) {
    if (!bgi || bgi === 'none' || bgi.indexOf('gradient') < 0) return null;
    var re = /(rgba?\([^)]*\)|#[0-9a-f]{3,8})/i, m = bgi.match(re);
    return m ? (parse(m[1]) || hexToRgb(m[1])) : null;
  }
  function ownPaint(el) {
    var cs = getComputedStyle(el);
    var c = parse(cs.backgroundColor);
    if (c && c.a > 0.02) return c;
    return gradFirst(cs.backgroundImage);
  }
  function drawFrom(srcEl, rect, x, y) {
    try {
      var cv = document.createElement('canvas'); cv.width = 1; cv.height = 1;
      var ctx = cv.getContext('2d', { willReadFrequently: true });
      var w = srcEl.naturalWidth || srcEl.videoWidth || rect.width;
      var h = srcEl.naturalHeight || srcEl.videoHeight || rect.height;
      var sx = (x - rect.left) / rect.width * w, sy = (y - rect.top) / rect.height * h;
      ctx.drawImage(srcEl, Math.max(0, sx - 2), Math.max(0, sy - 2), 5, 5, 0, 0, 1, 1);
      var d = ctx.getImageData(0, 0, 1, 1).data;
      return { r: d[0], g: d[1], b: d[2], a: 1 };
    } catch (e) { return null; }
  }
  function mediaPaint(el, x, y) {
    var list = [];
    if (el.tagName === 'VIDEO' || el.tagName === 'IMG') list.push(el);
    if (el.querySelectorAll) { var q = el.querySelectorAll('video,img'); for (var i = 0; i < q.length; i++) list.push(q[i]); }
    for (var i = 0; i < list.length; i++) {
      var m = list[i], r = m.getBoundingClientRect();
      if (!(r.width > 2 && r.height > 2)) continue;
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
      if (m.tagName === 'VIDEO') { if (m.readyState < 2) continue; var c = drawFrom(m, r, x, y); if (c) return c; continue; }
      var c2 = drawFrom(m, r, x, y);
      if (c2) return c2;                                   /* same-origin img */
      var src = m.currentSrc || m.src;                      /* cross-origin: CORS copy */
      if (!src) continue;
      var cached = mediaCache[src];
      if (cached && cached.__ready) { var c3 = drawFrom(cached, r, x, y); if (c3) return c3; }
      else if (!cached) {
        var im = new Image(); im.crossOrigin = 'anonymous';
        im.onload = function () { im.__ready = true; schedule(); };
        im.src = src; mediaCache[src] = im;
      }
    }
    return null;
  }
  function behindColor(nav) {
    var nr = nav.getBoundingClientRect();
    var x = Math.round(Math.min(window.innerWidth - 2, window.innerWidth / 2));
    var y = Math.round(nr.top + Math.min(nr.height, 52) / 2);
    var navKids = [], navAnc = [];
    var kids = nav.querySelectorAll('*');
    for (var i = 0; i < kids.length; i++) navKids.push(kids[i]);
    for (var p = nav.parentElement; p; p = p.parentElement) navAnc.push(p);
    var stack = [];
    try { stack = document.elementsFromPoint(x, y) || []; } catch (e) {}
    for (var s = 0; s < stack.length; s++) {
      var el = stack[s];
      if (!el || el === nav || navKids.indexOf(el) >= 0 || navAnc.indexOf(el) >= 0 || el === ROOT) continue;
      var mp = mediaPaint(el, x, y);
      if (mp) return mp;
      var node = el, hit = null;
      while (node && navAnc.indexOf(node) < 0 && node !== ROOT) {
        hit = ownPaint(node);
        if (hit) break;
        node = node.parentElement;
      }
      if (hit) return hit;
    }
    return null;
  }

  function apply() {
    if (window.__andosSplashActive || document.getElementById('appSplashOverlay')) return;
    var nav = document.querySelector(NAV);
    if (!nav || nav.getBoundingClientRect().height < 5) {
      ROOT.removeAttribute('data-andos-topbar');
      ROOT.removeAttribute('data-andos-scrolled');
      return write(toHex(ambient()));
    }
    var isHome = /home-topbar|hero-over-image/.test(nav.className || '');
    /* app khud .is-scrolled class lagata hai — usi ko sach maano, warna scrollTop fallback */
    var scrolled = /(^|\s)is-scrolled(\s|$)/.test(nav.className || '') || scrollTop() > 8;
    ROOT.setAttribute('data-andos-topbar', '1');

    var navBg0 = parse(getComputedStyle(nav).backgroundColor) || { r: 0, g: 0, b: 0, a: 0 };
    function glassColor() {
      var behind = behindColor(nav) || ambient();
      return toHex(navBg0.a > 0.02 ? over(navBg0, behind) : behind);
    }
    if (isHome) {
      ROOT.setAttribute('data-andos-scrolled', scrolled ? '1' : '0');
      /* header top par transparent hai (hero) — pink; scroll par glass — usi ka composite */
      return write(scrolled ? glassColor() : HERO);
    }
    ROOT.removeAttribute('data-andos-scrolled');
    if (navBg0.a > 0.98) return write(toHex(navBg0));
    return write(glassColor());
  }

  function write(color) {
    try { ROOT.style.setProperty('--andos-top-color', color); } catch (e) {}
    try {
      if (typeof window.__andosWriteMetaTheme === 'function') window.__andosWriteMetaTheme(color);
      var ms = document.querySelectorAll('meta[name="theme-color"]');
      for (var i = 0; i < ms.length; i++) if (ms[i]) ms[i].setAttribute('content', color);
    } catch (e) {}
    window.__andosTopColor = color;
  }

  var raf = 0;
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; apply(); });
  }
  ['scroll', 'resize', 'hashchange', 'orientationchange'].forEach(function (ev) {
    window.addEventListener(ev, schedule, { passive: true, capture: true });
    document.addEventListener(ev, schedule, { passive: true, capture: true });
  });
  document.addEventListener('andos:splash:done', function () { setTimeout(apply, 40); });
  document.addEventListener('click', schedule, true);
  window.addEventListener('load', function () { setTimeout(apply, 120); });
  var bound = [];
  function bindScrollers() {
    var els = document.querySelectorAll('.page-section, .app, .andos-shell');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (bound.indexOf(e) >= 0) continue;
      if (/auto|scroll/.test(getComputedStyle(e).overflowY) || e.scrollHeight > e.clientHeight + 20) {
        e.addEventListener('scroll', schedule, { passive: true }); bound.push(e);
      }
    }
  }
  setTimeout(bindScrollers, 700); setTimeout(bindScrollers, 2400);
  setInterval(function () { apply(); bindScrollers(); }, 1200);
  schedule();
})();
