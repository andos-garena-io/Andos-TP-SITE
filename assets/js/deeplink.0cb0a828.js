/* ANDOS DEEPLINK — PWA shortcut (#wallet / #orders / #categories / #history) ko
   app ke asli navigate() par map karta hai. App ke paas hash router nahi hai,
   isliye shortcut sirf app kholta tha, page nahi. Ye shim wo gap bharta hai. */
(function () {
  var MAP = { categories: 'categories', deals: 'categories', events: 'categories',
              wallet: 'wallet', orders: 'orders', history: 'wallet', account: 'account',
              support: 'support', profile: 'account' };
  var done = false;

  function hashKey() {
    var h = (location.hash || '').replace(/^#\/?/, '').split(/[?&]/)[0].toLowerCase();
    return h && MAP[h] ? h : null;
  }
  function scrollToHistory() {
    var nodes = document.querySelectorAll('.card, section, div');
    for (var i = 0; i < nodes.length; i++) {
      var t = (nodes[i].textContent || '');
      if (t.indexOf('Transaction History') === 0 || (t.length < 400 && t.indexOf('Transaction History') > -1 && nodes[i].children.length < 6)) {
        try { nodes[i].scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { nodes[i].scrollIntoView(); }
        return true;
      }
    }
    return false;
  }
  function fire() {
    if (done) return true;
    var key = hashKey();
    if (!key) { done = true; return true; }
    var ready = typeof window.navigate === 'function' &&
                document.documentElement.getAttribute('data-auth') === 'ok' &&
                !document.getElementById('appSplashOverlay');
    if (!ready) return false;
    try { window.navigate(MAP[key]); } catch (e) { return false; }
    done = true;
    if (key === 'history') {
      setTimeout(function () { scrollToHistory(); }, 700);
      setTimeout(function () { scrollToHistory(); }, 1600);
    }
    return true;
  }
  var n = 0;
  var t = setInterval(function () { n++; if (fire() || n > 60) clearInterval(t); }, 250);
  ['andos:splash:done', 'hashchange', 'click'].forEach(function (ev) {
    document.addEventListener(ev, function () { done = ev === 'hashchange' ? false : done; setTimeout(fire, 300); }, true);
  });
})();
