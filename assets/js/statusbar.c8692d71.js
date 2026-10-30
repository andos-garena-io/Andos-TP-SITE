/* ANDOS STATUSBAR SYNC v2 — status bar / safe-area band ka colour header ke saath 1:1
   Rule: jo bhi header ke peeche render ho raha hai, wahi colour browser chrome (theme-color)
   aur html/body background me daala jaata hai -> koi "separate solid strip" nahi bachti.
   1) header opaque            -> usi ka colour
   2) header translucent/glass -> header bg ko peeche waale content par composite karo
   3) header transparent + hero -> hero image ke top-strip ka average
   Plus: real scroller (.page-section) ko bhi sunta hai, window scroll par bharosa nahi. */
(function () {
  var ROOT = document.documentElement;
  var NAV = 'nav.home-topbar, nav.glass-nav.enterprise-nav';
  var FALLBACK = '#F9A8D4';
  var cache = {};

  function parse(c) {
    if (!c) return null;
    if (c === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    var m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return c.charAt(0) === '#' ? hexToRgb(c) : null;
    var p = m[1].split(/[,\/\s]+/).filter(function (v) { return v !== ''; }).map(parseFloat);
    if (p.length < 3) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function hexToRgb(h) {
    h = (h || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length < 6) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  }
  function toHex(c) {
    function p(v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }
    return '#' + p(c.r) + p(c.g) + p(c.b);
  }
  function over(top, base) {
    var a = top.a == null ? 1 : top.a;
    return { r: top.r * a + base.r * (1 - a), g: top.g * a + base.g * (1 - a), b: top.b * a + base.b * (1 - a), a: 1 };
  }
  /* element ka apna paint colour: solid bg, warna gradient ka pehla stop */
  function ownColor(el) {
    var cs = getComputedStyle(el);
    var c = parse(cs.backgroundColor);
    if (c && c.a > 0.02) return c;
    var bgi = cs.backgroundImage;
    if (bgi && bgi !== 'none') {
      var m = bgi.match(/(rgba?\([^)]*\)|#[0-9a-f]{3,8})/i);
      var g = m && parse(m[1]);
      if (g && g.a > 0.02) return g;
    }
    return null;
  }
  function pageBg() {
    /* jo screen ke top band par asli me paint ho raha hai (gate = white, home = hero/pink) */
    try {
      var stack = document.elementsFromPoint(Math.round(window.innerWidth / 2), 6) || [];
      for (var i = 0; i < stack.length; i++) {
        var node = stack[i];
        while (node && node !== ROOT) { var cc = ownColor(node); if (cc) return cc; node = node.parentElement; }
      }
    } catch (e) {}
    var c = parse(getComputedStyle(document.body).backgroundColor);
    if (c && c.a > 0.02) return c;
    c = parse(getComputedStyle(ROOT).backgroundColor);
    return (c && c.a > 0.02) ? c : { r: 255, g: 255, b: 255, a: 1 };
  }
  function navRect(nav) { return nav.getBoundingClientRect(); }

  /* header ke peeche asli me kya paint ho raha hai */
  function behindColor(nav) {
    var r = navRect(nav);
    var x = Math.round(Math.min(window.innerWidth - 2, window.innerWidth / 2));
    var y = Math.round(Math.max(1, (r.top + Math.min(r.height, 48)) / 2));
    var stack = [];
    try { stack = document.elementsFromPoint(x, y) || []; } catch (e) { stack = []; }
    for (var i = 0; i < stack.length; i++) {
      var e = stack[i];
      if (!e || e === nav || nav.contains(e) || e.contains(nav)) continue;
      var node = e;
      while (node && node !== ROOT) {           /* painter chain upar tak */
        var c = ownColor(node);
        if (c) return c;
        node = node.parentElement;
      }
      var img = e.tagName === 'IMG' ? e : e.querySelector && e.querySelector('img');
      if (img && img.currentSrc) return null;   /* image -> caller hero sample karega */
    }
    return pageBg();
  }

  function heroEl() {
    return document.querySelector('.home-hero-bleed img') ||
           document.querySelector('.home-hero-bleed') ||
           document.querySelector('.home-hero-stage');
  }
  function heroCoversBand(nav) {
    var h = heroEl(); if (!h) return false;
    var hr = h.getBoundingClientRect(), nr = navRect(nav);
    return hr.top <= 2 && hr.bottom > Math.min(nr.bottom, window.innerHeight * 0.5);
  }
  function sampleHero(cb) {
    var el = heroEl();
    var img = el && (el.tagName === 'IMG' ? el : el.querySelector && el.querySelector('img'));
    var src = img && (img.currentSrc || img.src);
    if (!src) {
      var hr = el && el.getBoundingClientRect();
      var g = el && ownColor(el);
      if (g && hr && hr.width > 0) return cb(toHex(g));
      return cb(FALLBACK);
    }
    if (cache[src]) return cb(cache[src]);
    var im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = function () {
      try {
        var cv = document.createElement('canvas'); cv.width = 8; cv.height = 8;
        var ctx = cv.getContext('2d', { willReadFrequently: true });
        var sh = Math.max(1, Math.round(im.height * 0.06));   /* image ka top 6% = status-bar zone */
        ctx.drawImage(im, 0, 0, im.width, sh, 0, 0, 8, 8);
        var d = ctx.getImageData(0, 0, 8, 8).data, r = 0, g = 0, b = 0, n = 0;
        for (var i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
        var c = toHex({ r: r / n, g: g / n, b: b / n });
        cache[src] = c; cb(c);
      } catch (e) { cb(FALLBACK); }
    };
    im.onerror = function () { cb(FALLBACK); };
    im.src = src;
  }

  function apply() {
    if (window.__andosSplashActive || document.getElementById('appSplashOverlay')) return; /* splash apna black rakhta hai */
    var nav = document.querySelector(NAV);
    /* hidden nav (login gate / dusra page) -> home rules mat lagao */
    if (!nav || nav.getBoundingClientRect().height < 5) {
      ROOT.removeAttribute('data-andos-topbar');
      return write(toHex(pageBg()), false);
    }
    ROOT.setAttribute('data-andos-topbar', '1');

    var navBg = parse(getComputedStyle(nav).backgroundColor);
    if (navBg && navBg.a > 0.02) {                    /* opaque ya glass */
      var behind = behindColor(nav) || pageBg();
      return write(toHex(navBg.a > 0.98 ? navBg : over(navBg, behind)), true);
    }
    if (heroCoversBand(nav)) return sampleHero(function (c) { write(c || FALLBACK, true); });
    return write(toHex(behindColor(nav) || pageBg()), true);
  }

  function write(color, syncBody) {
    try { ROOT.style.setProperty('--andos-top-color', color); } catch (e) {}
    if (syncBody) {
      try { ROOT.style.setProperty('--andos-top-color-body', color); } catch (e) {}
    }
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
  /* capture phase: andar ke scrollers (.page-section) ke scroll bhi pakde jaate hain */
  ['scroll', 'resize', 'hashchange', 'orientationchange'].forEach(function (ev) {
    window.addEventListener(ev, schedule, { passive: true, capture: true });
    document.addEventListener(ev, schedule, { passive: true, capture: true });
  });
  document.addEventListener('andos:splash:done', function () { setTimeout(apply, 40); });
  document.addEventListener('click', schedule, true);
  window.addEventListener('load', function () { setTimeout(apply, 120); });
  /* dynamically milne wale scroll containers par bhi direct listener */
  var bound = [];
  function bindScrollers() {
    var els = document.querySelectorAll('.page-section, .app, .andos-shell');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      if (bound.indexOf(e) >= 0) continue;
      if (/auto|scroll/.test(getComputedStyle(e).overflowY) || e.scrollHeight > e.clientHeight + 20) {
        e.addEventListener('scroll', schedule, { passive: true });
        bound.push(e);
      }
    }
  }
  setTimeout(bindScrollers, 800);
  setTimeout(bindScrollers, 2500);
  setInterval(function () { apply(); bindScrollers(); }, 1500);   /* safety net */
  schedule();
})();
