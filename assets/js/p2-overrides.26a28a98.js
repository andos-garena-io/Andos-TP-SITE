/* ANDOS Phase-2 workspace overrides — Round1 (P10* +P11+P2+P3+P4+P5+P6+P8+P9+P15) + Round2 (P7+P12+P13*+P17+P18+E3*+E4*).
   * = bundle string-patch ke saath milkar kaam karta hai. LIVE PAR NAHI — sirf workspace preview. */
(function () {
"use strict";
var W = window;
W.__p2 = { t0: Date.now(), log: [] };
function p2log(m) { try { W.__p2.log.push((Date.now() - W.__p2.t0) + ":" + m); } catch (e) {} }
function cur() { try { return String(typeof currentPage !== "undefined" ? currentPage : ""); } catch (e) { return ""; } }

/* ================= P17: storage safety ================= */
try {
  var proto = Object.getPrototypeOf(localStorage);
  var _set = proto.setItem, _get = proto.getItem;
  proto.setItem = function (k, v) { try { return _set.call(this, k, v); } catch (e) { p2log("quota:" + k); return false; } };
  proto.getItem = function (k) { try { return _get.call(this, k); } catch (e) { return null; } };
} catch (e) {}
W.safeGet = function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
W.safeSet = function (k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };

/* ================= P11: support-bot fallback ================= */
W.scAutoReply = function (msg) {
  var a = String(msg || "").toLowerCase();
  if (!a.trim()) return "Kuch likho to sahi — order ID, ya 'refund', 'topup', 'login' jaisa shabd bhejo, main turant jawab dunga.";
  var R = [
    [/refund|return|paise wapas/, "Refund ke liye: Orders page par apna order kholo, wahan support/refund option milega. UTR ya payment screenshot ready rakho — support 24x7 hai."],
    [/order|deliver|payment|utr|transaction/, "Order/payment sawal ke liye apna Order ID (jaise #VSMXXXXXX) bhejo, main status check me madad karunga."],
    [/diamond|topup|top-up|recharge|free ?fire|bgmi/, "Top-up: Categories > game > plan chuno. Payment ke baad items 5-30 min me credit hote hain. Der ho to Order ID bhejo."],
    [/login|password|otp|account/, "Login issue? 'Continue as Guest' se turant andar aa sakte ho, ya Google login dobara try karo."],
    [/fraud|scam|fake|hack/, "Suraksha: ANDOS kabhi OTP/password nahi maangta. Kisi ne paise maange hon to turant Support par report karo."],
    [/refer/, "Refer & Earn: Account page par apna referral code share karo — har safal referral par reward milta hai."],
    [/member|weekly|monthly/, "Membership plans Categories me milenge — Weekly/Monthly par aksar extra discount chalta hai."],
    [/namaste|^hi$|hello|^hey|hey |^yo/, "Namaste! Main ANDOS assistant hoon. Order, refund, top-up ya account — kya madad chahiye?"],
    [/thank|shukriya|dhanyavad/, "Khush raho! Aur kuch chahiye to bas likh do."],
    [/human|agent|support|ticket|call/, "Human support ke liye Support page par ticket banao — team jald jawab degi. Sath me Order ID zaroor likho."]
  ];
  for (var i = 0; i < R.length; i++) { if (R[i][0].test(a)) return R[i][1]; }
  return "Samajh gaya. Behtar madad ke liye apna Order ID ya service ka naam bhejo — ya Support page par ticket banao.";
};

/* ================= P9: section scroll-top + save/restore ================= */
W.__p2Saved = {};
W.__p2LastWasBack = false;
W.__p2ScrollTop = function (smooth) {
  try {
    var p = cur();
    var sec = p && document.querySelector('.page-section[data-sec="' + p + '"]');
    var m = document.querySelector("main.andos-main");
    var el = null;
    if (sec && sec.scrollHeight > sec.clientHeight + 2) el = sec;
    else if (m && m.scrollHeight > m.clientHeight + 2) el = m;
    if (el) { try { el.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" }); } catch (_) { el.scrollTop = 0; } }
    else { try { window.scrollTo(0, 0); } catch (_) {} }
  } catch (e) { try { window.scrollTo(0, 0); } catch (_) {} }
};
function __p2SaveScroll() {
  try {
    var p = cur(); if (!p) return;
    var sec = document.querySelector('.page-section[data-sec="' + p + '"]');
    var m = document.querySelector("main.andos-main");
    W.__p2Saved[p] = (sec && sec.scrollTop) || (m && m.scrollTop) || window.scrollY || 0;
  } catch (e) {}
}
try {
  __andosRestoreScroll = function () {
    try {
      var back = W.__p2LastWasBack; W.__p2LastWasBack = false;
      try { if (typeof W.__andosApplyStatus === "function") W.__andosApplyStatus(); } catch (_) {}
      if (!back) return;
      var p = cur(), y = W.__p2Saved[p] || 0;
      if (!(y > 0)) return;
      var apply = function () {
        try {
          var sec = document.querySelector('.page-section[data-sec="' + p + '"]');
          var m = document.querySelector("main.andos-main");
          if (sec && sec.scrollHeight > sec.clientHeight + 2) sec.scrollTop = y;
          else if (m && m.scrollHeight > m.clientHeight + 2) m.scrollTop = y;
          var n = document.querySelector("nav.glass-nav");
          if (n && y > 10) n.classList.add("is-scrolled");
          if (typeof W.syncHomeHeroNav === "function") { try { W.syncHomeHeroNav(y); } catch (_) {} }
          if (typeof W.__andosApplyStatus === "function") { try { W.__andosApplyStatus(); } catch (_) {} }
        } catch (_) {}
      };
      apply(); requestAnimationFrame(apply); setTimeout(apply, 250);
    } catch (_) {}
  };
} catch (e) { p2log("restore-wrap-fail"); }

/* ================= P6: single identity ================= */
try { if (typeof NAV_ROOT_TABS !== "undefined" && NAV_ROOT_TABS.indexOf("account") === -1) NAV_ROOT_TABS.push("account"); } catch (e) {}
/* P6: notif card (bundle version currentPage==="profile" + missing .page-enter ki wajah se dead) */
function __p2EnsureNotifCard() {
  try {
    if (document.getElementById("notifToggleCard")) return;
    var sec = document.querySelector('.page-section[data-sec="account"]');
    if (!sec) return;
    var c = "1"; try { c = localStorage.getItem("andos_notif_on") || "1"; } catch (_) {}
    var f = document.createElement("div");
    f.id = "notifToggleCard";
    f.style.cssText = "margin:14px 16px 0;padding:14px;border-radius:16px;background:#fff;border:1px solid rgba(0,0,0,.08);display:flex;align-items:center;gap:10px;box-shadow:0 8px 20px -12px rgba(15,23,42,.2);";
    f.innerHTML = '<span style="width:36px;height:36px;border-radius:12px;background:#eef2ff;color:#4338ca;display:flex;align-items:center;justify-content:center;font-size:14px;"><i class="fa-solid fa-bell"></i></span>' +
      '<div style="flex:1;min-width:0;"><b style="font-size:12px;font-weight:900;color:#111827;display:block;">Notifications</b><span style="font-size:9px;color:#6b7280;font-weight:700;">Flash deals & alerts push \u2014 on/off</span></div>' +
      '<label style="position:relative;width:46px;height:26px;flex:0 0 auto;display:inline-block;"><input id="notifOnChk" type="checkbox" style="opacity:0;width:100%;height:100%;margin:0;cursor:pointer;"' + (c === "1" ? " checked" : "") + '><span id="notifTrack" style="position:absolute;top:0;left:0;right:0;bottom:0;border-radius:999px;background:' + (c === "1" ? "#22c55e" : "#cbd5e1") + ';transition:.2s;"></span><span id="notifKnob" style="position:absolute;top:3px;left:' + (c === "1" ? "23px" : "3px") + ';width:20px;height:20px;border-radius:50%;background:#fff;transition:.2s;box-shadow:0 2px 6px rgba(0,0,0,.25);"></span></label>';
    if (sec.firstChild) sec.insertBefore(f, sec.firstChild); else sec.appendChild(f);
    f.querySelector("#notifOnChk").addEventListener("change", function () {
      var k = this.checked ? "1" : "0";
      try { localStorage.setItem("andos_notif_on", k); } catch (P) {}
      f.querySelector("#notifKnob").style.left = this.checked ? "23px" : "3px";
      f.querySelector("#notifTrack").style.background = this.checked ? "#22c55e" : "#cbd5e1";
      try { showToast(this.checked ? "\u{1F514} Notifications ON" : "\u{1F515} Notifications OFF", "success"); } catch (P) {}
    });
    p2log("notif-card-injected");
  } catch (_) {}
}

/* ================= P2: neutralise dead slider binder (CSS lock alag file me) ================= */
try { W.__andosBindSlider = function () {}; } catch (e) {}

/* ================= P4: versioned section invalidation ================= */
var P2_SEC_KEYS = {
  orders: ["andos_orders"],
  wallet: ["andos_wallet", "andos_transactions", "andos_loyalty"],
  account: ["andos_user", "andos_guest_profile", "andos_user_profile", "andos_notifications", "andos_notifs"]
};
function __p2FNV(s) {
  var h = 0x811c9dc5;
  s = String(s == null ? "~" : s);
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return ("0000000" + h.toString(16)).slice(-8);
}
function __p2Sig(sec) {
  try {
    return (P2_SEC_KEYS[sec] || []).map(function (k) {
      var v = null;
      try { v = localStorage.getItem(k); } catch (_) { v = null; }
      return k + "=" + __p2FNV(k + "\n" + (v == null ? "~" : v));
    }).join("|");
  } catch (e) { return "err"; }
}
try {
  var __fillOrig = __fillMainSection;
  __fillMainSection = function (e) {
    try {
      var sec = document.querySelector('.page-section[data-sec="' + e + '"]');
      if (sec && sec.getAttribute("data-filled") === "1" && P2_SEC_KEYS[e]) {
        if (sec.dataset.p2v && sec.dataset.p2v !== __p2Sig(e)) { sec.removeAttribute("data-filled"); p2log("invalidate:" + e); }
      }
    } catch (_) {}
    var r = __fillOrig(e);
    try {
      var s2 = document.querySelector('.page-section[data-sec="' + e + '"]');
      if (s2 && P2_SEC_KEYS[e]) s2.dataset.p2v = __p2Sig(e);
      if (e === "account") __p2EnsureNotifCard();
    } catch (_) {}
    return r;
  };
} catch (e) { p2log("fill-wrap-fail"); }

/* ================= P5: trailing render replay ================= */
try {
  var __renderOrig = render, __p2Armed = false, __p2Pending = false;
  render = function () {
    try {
      if (W.__andosRenderQueued) {
        __p2Pending = true; p2log("render-drop");
        if (!__p2Armed) {
          __p2Armed = true;
          var arm = function () {
            try {
              if (!W.__andosRenderQueued) {
                __p2Armed = false;
                if (__p2Pending) { __p2Pending = false; p2log("render-replay"); __renderOrig(); try { __p3MediaVideos(cur()); } catch (_) {} }
              } else requestAnimationFrame(arm);
            } catch (_) { __p2Armed = false; }
          };
          requestAnimationFrame(arm);
        }
        return;
      }
    } catch (_) {}
    var __p3rr = __renderOrig();
    try { __p3MediaVideos(cur()); } catch (_) {}
    return __p3rr;
  };
} catch (e) { p2log("render-wrap-fail"); }

/* ================= P8 history bridge + P15 hash router ================= */
W.__p2Seq = 0; W.__p2Popping = false; W.__p2LastSeq = 0;
var P2_HASH = { home: "home", categories: "categories", orders: "orders", wallet: "wallet", account: "account", profile: "account", support: "support", search: "search", freefire: "plans:freefire", bgmi: "plans:bgmi" };
function __p2RouteHash() {
  try {
    var h = String(location.hash || "").replace(/^#\/?/, "").split("?")[0];
    var t = P2_HASH[h];
    if (!t) return false;
    if (t.indexOf("plans:") === 0) { navigate("plans", { service: t.slice(6) }); return true; }
    navigate(t); return true;
  } catch (e) { return false; }
}
W.__p2HistPush = function () {
  try {
    var p = cur() || "home", svc = null, cat = null;
    try { svc = (typeof selectedService !== "undefined") ? selectedService : null; } catch (_) {}
    try { cat = (typeof selectedCategory !== "undefined") ? selectedCategory : null; } catch (_) {}
    W.__p2Seq++; W.__p2LastSeq = W.__p2Seq;
    history.pushState({ p2: W.__p2Seq, page: p, service: svc, category: cat }, "", "#" + p);
  } catch (e) {}
};
W.addEventListener("popstate", function (ev) {
  try {
    var st = (ev && ev.state) || {};
    var seq = (typeof st.p2 === "number") ? st.p2 : 0;
    W.__p2Popping = true; setTimeout(function () { W.__p2Popping = false; }, 400);
    if (st.page && seq >= W.__p2LastSeq && seq > 0) { W.__p2LastSeq = seq; navigate(st.page, { _back: true, service: st.service, category: st.category }); }
    else { W.__p2LastSeq = seq; goBack(); }
  } catch (e) { try { goBack(); } catch (_) {} }
});
W.addEventListener("hashchange", function () {
  try {
    if (W.__p2Popping) return;
    var h = String(location.hash || "").replace(/^#\/?/, "").split("?")[0];
    var p = cur();
    if (!h || h === p || (h === "profile" && p === "account")) return;
    __p2RouteHash();
  } catch (e) {}
});
var __p2BootHash = false, __p2BootTarget = null;
function __p2BootHashRun() {
  if (__p2BootHash) return; __p2BootHash = true;
  try {
    var h = String(location.hash || "").replace(/^#\/?/, "").split("?")[0];
    if (h.length > 1 && P2_HASH[h]) { __p2BootTarget = h; __p2RouteHash(); }
  } catch (_) {}
  /* boot/splash override se deep-link bachao: user-touch na ho to 3 retry */
  try { document.addEventListener("pointerdown", function () { __p2BootTarget = null; }, { capture: true, passive: true }); } catch (_) {}
  var n = 0;
  var retry = function () {
    try {
      if (!__p2BootTarget) return;
      var want = P2_HASH[__p2BootTarget];
      var wantPage = want.indexOf("plans:") === 0 ? "plans" : want;
      if (cur() !== wantPage && cur() === "home") { __p2RouteHash(); p2log("hash-retry:" + __p2BootTarget); }
      else { __p2BootTarget = null; return; }
    } catch (_) {}
    if (++n < 3) setTimeout(retry, 2200);
  };
  setTimeout(retry, 2200);
}
try { document.addEventListener("andos:auth:resolved", function () { setTimeout(__p2BootHashRun, 500); }); } catch (_) {}
function __p2Authed() {
  try { if (typeof user !== "undefined" && user && (user.loggedIn || user.uid)) return true; } catch (_) {}
  return false;
}
var __p2FbN = 0;
var __p2Fallback = function () {
  try {
    if (__p2BootHash) return;
    if (__p2Authed() && cur() === "home") { __p2BootHashRun(); return; }
  } catch (_) {}
  if (__p2Authed() && ++__p2FbN < 4) setTimeout(__p2Fallback, 5000);
};
setTimeout(__p2Fallback, 7000);

/* ================= P7: overlay pages ================= */
W.__p2OverlayOpen = null;
function __p2OverlayClose() { try { var o = document.getElementById("p2Overlay"); if (o) o.remove(); } catch (_) {} W.__p2OverlayOpen = null; }
W.__p2OverlayClose = __p2OverlayClose;
function __p2Esc(s) {
  try { if (typeof escapeHtml === "function") return escapeHtml(String(s == null ? "" : s)); } catch (_) {}
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function __p3BuildTag() {
  try { if (W.__ANDOS_BUILD_ID) return String(W.__ANDOS_BUILD_ID); } catch (_) {}
  try { var m = document.querySelector('meta[name="andos-build"]'); if (m && m.content) return String(m.content); } catch (_) {}
  return "dev";
}
function __p2Overlay(kind) {
  try {
    __p2OverlayClose(); W.__p2OverlayOpen = kind;
    var title = "", body = "";
    if (kind === "about") {
      title = "About ANDOS";
      body = '<p><b>ANDOS</b> — gaming top-up & digital services panel.</p>' +
        '<p class="p2-muted">Build ' + __p2Esc(__p3BuildTag()) + '</p>' +
        '<h4>Is update me</h4><p><span class="p2-badge">Back-button sync</span><span class="p2-badge">Fresh orders</span><span class="p2-badge">Support bot</span></p>' +
        '<button class="p2-btn" id="p2GoSupport">Support se baat karo</button>';
    } else if (kind === "favorites") {
      title = "My Favorites";
      var favs = [];
      try { favs = JSON.parse(localStorage.getItem("andos_favorites") || "[]") || []; } catch (_) { favs = []; }
      if (!favs.length) body = '<p class="p2-muted">Abhi koi favorite nahi hai. Services par dil (♥) dabakar yahan jodo.</p><button class="p2-btn" id="p2GoCat">Services dekho</button>';
      else body = favs.slice(0, 50).map(function (f) {
        var nm = (f && (f.title || f.name || f.id)) || "Saved item";
        return '<div class="p2-row"><div><b>' + __p2Esc(nm) + '</b></div></div>';
      }).join("");
    } else if (kind === "refer") {
      title = "Refer & Earn";
      var code = "";
      try { code = localStorage.getItem("andos_referrer_code") || ""; } catch (_) {}
      if (!code) { try { var u = JSON.parse(localStorage.getItem("andos_user") || "null"); code = (u && (u.publicId || u.username)) || ""; } catch (_) {} }
      if (!code) code = "ANDOS-HQ";
      body = '<p>Doston ko invite karo, har safal referral par reward pao.</p><div class="p2-code">' + __p2Esc(code) + '</div>' +
        '<button class="p2-btn" id="p2CopyRef">Code copy karo</button>' +
        '<button class="p2-btn light" id="p2ShareRef">WhatsApp par bhejo</button>';
    } else {
      title = "ANDOS Trust";
      body = '<p><span class="p2-badge">Secure payments</span><span class="p2-badge">Instant delivery</span><span class="p2-badge">24x7 support</span></p>' +
        '<p class="p2-muted">Trust video jald aa raha hai. Tab tak ratings aur support yahan hai.</p>' +
        '<button class="p2-btn" id="p2GoSupport2">Support kholo</button>';
    }
    var d = document.createElement("div");
    d.id = "p2Overlay"; d.className = "p2-overlay";
    d.innerHTML = '<div class="p2-sheet" role="dialog" aria-label="' + __p2Esc(title) + '"><div class="p2-head"><b>' + __p2Esc(title) + '</b><button id="p2X" aria-label="Band karo">✕</button></div><div class="p2-body">' + body + '</div></div>';
    document.body.appendChild(d);
    d.addEventListener("click", function (ev) { if (ev.target === d || (ev.target && ev.target.id === "p2X")) __p2OverlayClose(); });
    var q = function (id) { return document.getElementById(id); };
    if (q("p2GoSupport")) q("p2GoSupport").onclick = function () { __p2OverlayClose(); navigate("support"); };
    if (q("p2GoSupport2")) q("p2GoSupport2").onclick = function () { __p2OverlayClose(); navigate("support"); };
    if (q("p2GoCat")) q("p2GoCat").onclick = function () { __p2OverlayClose(); navigate("categories"); };
    if (q("p2CopyRef")) q("p2CopyRef").onclick = function () {
      var c = code;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(c).then(function () { try { showToast("Referral code copy ho gaya", "success"); } catch (_) {} });
        else throw 0;
      } catch (_) { try { showToast("Code: " + c, "info"); } catch (__) {} }
    };
    if (q("p2ShareRef")) q("p2ShareRef").onclick = function () {
      try { window.open("https://wa.me/?text=" + encodeURIComponent("ANDOS par aao! Mera referral code: " + code + " — https://andostosites.vercel.app"), "_blank"); } catch (_) {}
    };
  } catch (e) { p2log("overlay-fail:" + kind); }
}
W.__p2Overlay = __p2Overlay;
try { W.openTrustVideo = function () { __p2Overlay("trustvideo"); }; } catch (_) {}

/* ================= navigate wrapper: P3 + P7 + P8-push + P9-save ================= */
try {
  var __navOrig = navigate;
  navigate = function (e, t) {
    t = t || {};
    var prev = cur();
    if (!t._back && ["about", "favorites", "refer", "trustvideo"].indexOf(e) !== -1) { __p2Overlay(e); return; }
    if (e === "category" && t.category && !t._back && prev !== "categories") {
      __p2SaveScroll();
      __navOrig("categories", {});
      try {
        navStack.push({ page: prev, category: (typeof selectedCategory !== "undefined" ? selectedCategory : null), service: (typeof selectedService !== "undefined" ? selectedService : null) });
        if (navStack.length > 16) navStack.shift();
      } catch (_) {}
      try { window.openExploreCat(t.category); } catch (_) {}
      W.__p2LastWasBack = false; W.__p2HistPush();
      try { W.__p3TabSync(prev, false); } catch (_) {}
      return;
    }
    if (!t._back) __p2SaveScroll(); else W.__p2LastWasBack = true;
    var r = __navOrig(e, t);
    try { W.__p3TabSync(prev, !!t._back); } catch (_) {}
    if (!t._back) { try { W.__p2HistPush(); } catch (_) {} }
    try { if (cur() === "account") __p2EnsureNotifCard(); } catch (_) {}
    return r;
  };
} catch (e) { p2log("nav-wrap-fail"); }

/* ---- P3 defence-in-depth: direct openExploreCat calls ---- */
try {
  if (typeof window.openExploreCat === "function") {
    var __oxOrig = window.openExploreCat;
    window.openExploreCat = function (cat) {
      try { if (cur() !== "categories") { navigate("category", { category: cat }); return true; } } catch (_) {}
      return __oxOrig(cat);
    };
  }
} catch (_) {}

/* ---- goBack: close P7 overlay first ---- */
try {
  var __gbOrig = goBack;
  goBack = function (x) {
    try { if (W.__p2OverlayOpen) { __p2OverlayClose(); return; } } catch (_) {}
    return __gbOrig(x);
  };
} catch (_) {}

/* ================= P12: search clear + focus race ================= */
try {
  if (typeof openSearchPage === "function") {
    var __osOrig = openSearchPage;
    openSearchPage = function () {
      __osOrig();
      var n = 0;
      var f = function () {
        try {
          var el = document.getElementById("globalSearchInput");
          if (el) {
            try { el.focus({ preventScroll: true }); } catch (_) { try { el.focus(); } catch (__) {} }
            var L = (el.value || "").length;
            try { el.setSelectionRange(L, L); } catch (_) {}
            if (document.activeElement === el) return;
          }
        } catch (_) {}
        if (++n < 10) setTimeout(f, 80);
      };
      requestAnimationFrame(function () { requestAnimationFrame(f); });
    };
  }
} catch (_) {}
try {
  W.clearSearch = function () {
    try {
      var el = document.getElementById("globalSearchInput") || document.getElementById("serviceSearch");
      try { searchQuery = ""; } catch (_) {}
      try { _searchSelection = { start: 0, end: 0 }; } catch (_) {}
      if (el) {
        el.value = "";
        try { el.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) {}
        try { el.focus(); } catch (_) {}
      }
      try { if (typeof refreshSearchPageDOM === "function") refreshSearchPageDOM(); } catch (_) {}
      try { if (typeof updateServicesList === "function") updateServicesList(); } catch (_) {}
    } catch (_) {}
  };
} catch (_) {}

/* ================= P18: third-party image fallback ================= */
try {
  document.addEventListener("error", function (ev) {
    try {
      var t = ev.target;
      if (!t || t.tagName !== "IMG" || t.dataset.p2fb) return;
      var s = t.currentSrc || t.src || "";
      if (!s || s.indexOf("data:") === 0) return;
      t.dataset.p2fb = "1";
      t.src = new URL("assets/app-icon/logo-192.png", location.href).href;
    } catch (_) {}
  }, true);
} catch (_) {}

/* ================= P3: tab-switch scroll restore + media/vfx lifecycle ================= */
var P3_MAINS = ["home", "categories", "orders", "wallet", "account"];
function __p3RestoreTab(p) {
  try {
    var y = W.__p2Saved[p] || 0;
    if (!(y > 0)) return;
    var apply = function () {
      try {
        var sec = document.querySelector('.page-section[data-sec="' + p + '"]');
        var m = document.querySelector("main.andos-main");
        if (sec && sec.scrollHeight > sec.clientHeight + 2) sec.scrollTop = y;
        else if (m && m.scrollHeight > m.clientHeight + 2) m.scrollTop = y;
        var n = document.querySelector("nav.glass-nav");
        if (n && y > 10) n.classList.add("is-scrolled");
      } catch (_) {}
      try { if (typeof W.__andosApplyStatus === "function") W.__andosApplyStatus(); } catch (_) {}
    };
    apply(); requestAnimationFrame(apply); setTimeout(apply, 250);
  } catch (_) {}
}
function __p3MediaVideos(now) {
  try {
    var vids = document.querySelectorAll("#pageSlider .page-section video");
    for (var i = 0; i < vids.length; i++) {
      try {
        var v = vids[i];
        var sec = v.closest ? v.closest(".page-section") : null;
        if (sec && sec.getAttribute("data-sec") === now) {
          if (v.paused && (v.autoplay || v.classList.contains("v-a") || v.classList.contains("v-on"))) {
            try { var pr = v.play(); if (pr && typeof pr.catch === "function") pr.catch(function () {}); } catch (_) {}
          }
        } else { try { v.pause(); } catch (_) {} }
      } catch (_) {}
    }
  } catch (_) {}
}
function __p3MediaSync(now) {
  try { __p3MediaVideos(now); } catch (_) {}
  try { if (typeof restartHomeCarouselAutoplay === "function") restartHomeCarouselAutoplay(); } catch (_) {}
  try { if (typeof restartPromoBannerAutoplay === "function") restartPromoBannerAutoplay(); } catch (_) {}
}
function __p3VfxSync(now) {
  try {
    var list = document.querySelectorAll(".mmvfx-canvas"), want = false;
    for (var i = 0; i < list.length; i++) {
      var sec = list[i].closest ? list[i].closest(".page-section") : null;
      if (!sec || sec.getAttribute("data-sec") === now) { want = true; break; }
    }
    if (want) { if (typeof W.__p3ResumeVfx === "function") W.__p3ResumeVfx(); }
    else if (typeof W.__p3StopVfx === "function") W.__p3StopVfx();
  } catch (_) {}
}
W.__p3TabSync = function (prev, isBack) {
  try {
    var now = cur();
    __p3MediaSync(now);
    __p3VfxSync(now);
    if (P3_MAINS.indexOf(now) !== -1 && !(prev === now && !isBack)) __p3RestoreTab(now);
  } catch (_) {}
};

p2log("boot-ok");
})();
