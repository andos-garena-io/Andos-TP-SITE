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

    if (isHome) {
      ROOT.setAttribute('data-andos-scrolled', scrolled ? '1' : '0');
      return write(scrolled ? SCROLLED : HERO);
    }
    ROOT.removeAttribute('data-andos-scrolled');
    var navBg = parse(getComputedStyle(nav).backgroundColor);
    if (navBg && navBg.a > 0.98) return write(toHex(navBg));
    if (navBg && navBg.a > 0.02) return write(toHex(over(navBg, ambient())));
    return write(toHex(ambient()));
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
