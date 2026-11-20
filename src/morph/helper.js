
/* MORPH-RT: idiomorph render runtime (callbacks + stats). Live test-route only. */
(function () {
  window.__morphStats = { morph: 0, fallback: 0, err: null };
  var SKIP_TAGS = { VIDEO: 1, AUDIO: 1, IFRAME: 1 };
  var KEEP_DATA = ["bound", "promoBound", "swipeBound", "mcV", "p2fb"];
  function spkBefore(oldN, newN) {
    try {
      if (!oldN || oldN.nodeType !== 1 || !newN || newN.nodeType !== 1) return;
      if (SKIP_TAGS[oldN.tagName]) return false;
      try {
        var tg = oldN.tagName;
        if ((tg === "INPUT" || tg === "TEXTAREA" || tg === "SELECT") && "value" in oldN && "value" in newN) {
          if (newN.type !== "file") { try { newN.value = oldN.value; } catch (_) {} }
          if (tg === "INPUT" && (oldN.type === "checkbox" || oldN.type === "radio")) newN.checked = oldN.checked;
          if (tg === "SELECT") newN.selectedIndex = oldN.selectedIndex;
        }
      } catch (_) {}
      for (var i = 0; i < KEEP_DATA.length; i++) {
        var k = KEEP_DATA[i];
        if (oldN.dataset && oldN.dataset[k] !== undefined &&
            (!newN.dataset || newN.dataset[k] === undefined))
          newN.dataset[k] = oldN.dataset[k];
      }
      if (oldN.classList && oldN.classList.contains("mmvfx-canvas") &&
          oldN.dataset && oldN.dataset.on !== undefined &&
          (!newN.dataset || newN.dataset.on === undefined))
        newN.dataset.on = oldN.dataset.on;
    } catch (_) {}
  }
  window.__andosMorphC = function (el, html) {
    try {
      if (el && el.isConnected && window.Idiomorph && typeof Idiomorph.morph === "function") {
        Idiomorph.morph(el, html, { morphStyle: "innerHTML",
          callbacks: { beforeNodeMorphed: spkBefore } });
        window.__morphStats.morph++;
        return html;
      }
    } catch (e) { try { window.__morphStats.err = String(e).slice(0, 140); } catch (_) {} }
    try { window.__morphStats.fallback++; } catch (_) {}
    el.innerHTML = html; return html;
  };
})();
