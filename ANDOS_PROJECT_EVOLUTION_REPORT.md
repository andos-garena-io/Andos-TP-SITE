# ANDOS — Technical Retrospective & Audit Report

**Scope:** jo base mila (single monolith HTML: no-login + login structure) se lekar HEAD `f918d12` / live origin `andostosites.vercel.app` (meta `andos-v3-20261101c1`, SW `v18`) tak.  
**Date of audit:** 2026-11-01.  
**Rule:** hawa nahi — file, layer, commit. Do hisse: **(1) solid & active** · **(2) negative / reverted**.

---

## Kaise padhein

| Layer | Ab kahan hai |
|---|---|
| Boot / splash / auth lock / SW register | `index.html` (~791 lines) |
| App UI + Firebase client + pages | `assets/js/andos6.15ddda7d.js` (~747 KB hashed) |
| Layout / header / slider / wallet CSS | `assets/css/andos5.1c269aa0.css` |
| PWA cache | `sw.js` (`CACHE_VERSION=v18`, `APP_BUILD_ID=andos-v3-20261101c1`) |
| SIM lookup proxy | `workers/andos-sim` → `https://andos-sim.andos-support.workers.dev` |
| Money-lock rules (local only) | `/home/user/firestore.rules` — **prod par publish nahi** |
| Firebase project | `andos-49b6a` (Auth + Firestore) |

Hashed CSS/JS filenames content-hash hain (1y `immutable`). `index.html` `max-age=0, must-revalidate`. Phone PWA alag trap: neeche Part 2.

---

# Hissa 1 — Solid & active

## 1.1 Base se frontend split

**Jo mila:** ~1.6 MB **single HTML monolith** — login gate + dashboard ek hi document, inline CSS/JS, CDN Tailwind/runtime.

**Kya kiya (commit `5233d5d`, backup `6a0b1fb`):**

- HTML se CSS/JS **hashed files** me nikaala. Claim: HTML ~**−97%**, pixel-identical.
- Ab load graph:
  - CSS: `andos1`…`andos5` + local Tailwind `tw.2d52300d.css` + Font Awesome + self-hosted Google Fonts (`gf.local.css`, `gf2.local.css`).
  - JS: `andos2` (small), `andos3` (SW register), `andos4`, **`andos6` (app)**, `deeplink`.
  - `andos5.ed260336.js` splash bundle tha — current `index.html` **load nahi karta** (single-owner splash inline).
- CDN Tailwind hata (`4c1bc43`): `cdn.tailwindcss.com` runtime JIT nahi; local prebuilt utilities.
- Assets: jsDelivr/GitHub CDN se **`/assets/mirror/...`** local copy + 404 pe inline SVG tile (`index.html` IMAGE SAFETY NET). Path contract: root-relative `/assets/...`.

**Boot jo monolith se `index.html` head me reh gaya (ye hashed nahi, pehle paint ke liye zaroori):**

1. `localStorage` guard (private mode fallback).
2. **Auth lock v2** — persisted session ho to `#yuvaGate` / `#loginScreen` `display:none` **first paint se pehle**.
3. Storage shim (`andos_user` / `andos_orders` / `andos_wallet` shape).
4. Splash first-paint black (`html.andos-splash`).
5. Firebase compat scripts (app/auth/firestore 10.8.0).

App shell runtime me `andos6` banata hai: `.andos-shell` → `main.andos-main` → `#pageSlider` → `.page-section[data-sec=home|categories|orders|wallet|account]`. Pages `HomePage()` / `WalletPage()` / … functions se fill.

---

## 1.2 Frontend → backend data-flow (jo wired hai)

### Firebase Auth + Firestore

- Client config **hashed `andos6`** me `firebaseConfig` — `projectId: "andos-49b6a"`, `authDomain: andos-49b6a.firebaseapp.com`.
- Compat SDK: `firebase-app` / `auth` / `firestore` 10.8.0, `index.html` se.
- Flows jo app use karti hai: Google sign-in, optional phone OTP, guest, `localStorage` `andos_user` + `andos_auth_state` (`in`/`out`). Logout `andos_logged_out=1` marker (gate flash na aaye).
- Firestore collections jo client **padh/likh** try karti hai: `users/{uid}`, orders, wallet-related docs. **Likha** unauth par REST se **403** verify hua (`orders`, `wallet_ledger`).
- `andos-fs.andos-support.workers.dev` is session me **Cloudflare 1042 (dead)** — us par depend mat karo.

### Cloudflare Workers + proxy

| Worker | Role | Client |
|---|---|---|
| `andos-sim` (`workers/andos-sim`) | Origin-locked **POST `/lookup`** — SIM/number lookup. API key **worker secret**, HTML/JS me nahi | `CONFIG.simLookupWorker` URL only |
| Guest `/health` | 200 | n/a |
| `tg-proxy` | Telegram proxy; GET **405** (POST-only pattern) | `andos6` me `tg-proxy` string 1 |

**SIM key strip (commit `138734d`):** client se `simLookupKey` hataaya; lookup worker ke through. Current `andos6.15ddda7d.js` me **`simLookupKey` count = 0**. Rewrite (`git reset` / split) ke baad worker **URL** client me hai, key nahi. `index.html` worker ko import nahi karta.

### Telegram admin / tracker bots

- Automation **`andos6`** me (`telegram` ~53 hits): payment/order events, tracker cards, image-bot vs tracker split (commit `16d3247`).
- Tokens **client bundle me nahi daalne ka standing rule**. Proxy worker origin-lock. Is audit me bot token dump nahi.

---

## 1.3 Security & UID (solid, with caveats)

### Unauth 403 write protection

- Unauthenticated Firestore REST GET/POST listed collections → **403**.
- Matlab browser se bina Auth ke `orders` / `wallet_ledger` create nahi.

### Admin UID lock + client money fields

- Standing product rule: **admin koi UID lock** kare; locked UID **naya spend nahi**.
- Client **`walletUnlocked` / balances write nahi kare**.
- Local `firestore.rules`: `users/{userId}` create/update par `wallet`, `walletUnlocked`, `walletBalance`, `loyalty`, `walletPin` **hasAny → deny**. `wallets/{id}` client write **false**. `transactions` write **false**.
- **Caveat:** ye rules file **local** hai. Standing instruction: **prod par publish mat karo** jab tak alag se na kaha jaye. Prod lock isliye **Admin SDK / worker** + client discipline par hai, public rules snapshot par nahi.

### SIM / secrets

- `138734d`: key client se strip.
- Drive zip / guessed hashes / PAT print — reject list. Firebase authorized-domain wildcards nahi. Prod login disable nahi.

---

## 1.4 UI deliverables — production me jo **user-accepted** rahe

Sirf woh jo constraints me **rakhe gaye**, baad me “mat chhedo” / revert list se bahar.

### Cinematic splash (Netflix-style — original accepted logic)

- Overlay `#appSplashOverlay` + `#appSplashVideo` (`/assets/videos/splash-loading.mp4`), poster = frame 0 webp.
- Hashed splash controller (`andos5.ed260336.js`) ka **original contract:** clip frame 0 se ~2.70s, dismiss `ended` par, exit **`scale(2.2)` zoom-out** + opacity, phir `window.__andosPlayCinematicEntry()` → `main.andos-main` par `andosCineIn` (opacity 0→1, scale 0.95→1, **no blur**).
- `0df6a3f` / `e39622b` / `b4d2bb0`: splash black lock + Netflix zoom + video poora chale.
- **Ab live:** zoom bundle **load nahi**; inline single owner (video `ended` **ya 2.5s cap**, opacity fade, cine). Zoom-out **current HEAD me active nahi** — neeche Part 2.

### Header + status-bar stretch

- Home header **absolute overlay** (banner ke upar), rest pages par transparent; **scrolled:** `rgba(255,255,255,.58)` + `blur(16px) saturate(160%)`.
- Pull-down **PINK Home only** (`b702eba`, `26829de`) — stretch pe status/header ke beech **white blink band** ko pink root + `::before` se mara. Doosre pages par stretch pink nahi.
- `theme-color` watchdog (`index.html` v11.1): splash `#000`; home `#F9A8D4`; wallet `#2e1065`; account `#eef2ff`; payment `#221b50`.
- Header **banner mat chhedo** — standing. `l35` binary white / hysteresis white **rejected**.

### Profile DP ring (header)

- Original `.dp-ring` / avatar btn: conic `from 220deg #0785ff,#168bff,#a5a4ff,#168bff,#0785ff`, padding **3.5px**.
- Gap = pehle wala white space, **transparent** (header dikhe). Nested `%` nahi. Photo `cover` / `center` / `border-radius:50%`.
- `::before` 40px chrome, inner 3rd ring, GH-clone 128/512 canvas — **reject**. Hashed `andos5` me `nav.home-topbar .andos-avatar-ring` yahi conic + mask.

### Tabs / navigation

- Bottom nav: Home / Explore / Orders / Wallet / Profile ↔ `data-sec` `home|categories|orders|wallet|account`.
- Tab switch: `scrollLeft = index * width` (`__andosTabSwitch` in `andos6`), **horizontal swipe/snap user-facing OFF** (FIX-T: JS swipe IIFE hata; `#pageSlider{scroll-snap-type:none}` kai rounds).
- `1c50900`: FIX-R **CSS comments** jo parser ne rules bana diye the — **Home+Profile stack**. Comments hataaye, stack band. Ye **accepted** ship tha.

### Auth UX (accepted)

- Hard auth lock before paint (`4c1bc43`).
- Google CTA freeze / last-used / guest TTL — builds h/i.

### Assets (accepted)

- Local logos/banners mirror; 0×404 sweep (`2892ecb`, `b23bc7a`).
- Image error → branded SVG tile, koi blank box nahi.

---

# Hissa 2 — Negative / reverted experiments

Bina chhupaye. Layout toota, user ne reject kiya, ya phone par “kuch nahi badla”.

## 2.1 `height: auto` nested-scroll unlock — **layout todd, revert `f83652f`**

**Irada:** phone par Home/Wallet/Payment/QR freeze = nested prison:

`html,body{height:100%;overscroll-behavior-y:none}` → `#app`/`.andos-shell` 100% / `100dvh` → `.page-slider{overflow-y:hidden}` → `.page-section{height:100%;overflow-y:auto}`.

**Galat ilaaj (commit `c753263`):** last-wins se `html/body/#app/.andos-shell/.andos-main/#pageSlider/.page-section` sab **`height:auto !important`**, shell background **transparent**, document ko scroller.

**Asar:**

- Header **absolute overlay** document ke saath scroll — chipka nahi.
- Bottom nav viewport lock toota.
- Inactive sections `visibility:hidden` phir bhi height leti → sabse lambi page ka blank scroll.
- “Doosri app toot gayi” feel.

**Revert `f83652f`:** shell wapas hashed `100% / 100dvh`. Freeze ka root CSS me **ab bhi hai**; us round ne sirf chrome maara.

## 2.2 800ms Heal interval — **hataaya (`43de346`)**

**File:** `index.html` inline **SCROLL SELF-HEAL v11.3** (`52ae8dd` se).

**Kya karta tha:** har **800ms** + click/touch/navigate par `.andos-shell`, `#pageSlider`, har `.page-section`, payment/QR se inline `overflow:hidden` / kabhi `height:100%` saaf ya `overflowY=auto` **force**.

**Nuksaan:** hashed layout se **ladai**. Nested auto scrollers, jank/flicker, QR open hote heal skip/unlock galat. Comment baad me “document scroller” keh raha tha jab CSS revert ho chuki thi.

**Ab:** heal **index me nahi**. Chhota **unlock-on-navigate** (body `overflow:hidden` clear after payment) ab bhi pada hai — 800ms loop nahi.

## 2.3 Teen-malik splash + `opacity: 1 !important`

**Teen controllers ek overlay par:**

1. Head splash-paint (`andos-splash` class / unpaint / 5s safety).
2. Inline HARD_CAP `bye()` (3s, phir 4.2s).
3. Hashed `andos5.ed260336.js` (watchdog ~2.6s, `ended`, **zoom `scale(2.2)`**).

**Plus CSS:** `#appSplashOverlay{animation: andosSplashFailSafe 2.90s forwards}` overlay ko pehle fade.

**Clash:** CSS 2.9s pe overlay transparent → app header/status **white layer**; zoom = “doosri route”. `opacity:1 !important` ne fade **maar** di — dismiss sirf `remove()` se. Agar remove na ho → **kaali screen atak**. `done()` overlay dekh kar class nahi giraata tha → stuck black possible.

**Ab HEAD:** `andos5` script **nahi**; ek inline owner; cap **2500ms**; fade opacity (bina `!important` lock). Original Netflix **zoom-out current live par nahi chal raha**.

## 2.4 Blank / white tabs (Wallet, Orders, Profile, Explore)

**User screenshots (2026-11-01 ~18:06):** Home content OK; Explore/Orders/Wallet/Profile = **sirf bottom nav + white**. Payment/Plans (slider ke bahar / `page-enter`) OK.

**Do asli wajah (APEX `638d8fc` + is session):**

1. `#pageSlider` par **`display:flex` row missing** + hardening `overflow-x:hidden` + `scroll-snap:none !important` → paanch `.page-section` **vertical stack** (y = 0 / 844 / 1688…). Tab `data-page=wallet` par home `visibility:hidden`, wallet 844px+ neeche → viewport **khaali**.
2. `index.html` `#andos-ui-restore` ne inactive `[data-sec]` **visibility:hidden**. `scrollLeft` 0 pe atke to same white.

`638d8fc`: CSS `andos5.1c269aa0.css` — `#pageSlider{display:flex; flex-direction:row}` + `scrollLeft` track. Explore stub vs full page alag decision (user ne baad me **blank canvas** maanga — `CategoriesPage()` `#exploreCanvas` empty).

**`43de346`:** index se hide-restore hataaya; hashed CSS me hide **ab bhi** hai. `f918d12`: last-wins `#pageSlider > .page-section{visibility:visible !important}`.

## 2.5 Wallet purple left-cut / baingani strip

- **Strip leak:** pehle slider ne **agle page ka purple** Home/Wallet edge par dikhaya (`l47` live note). Page colors paint karke “fix” **l45 reject**.
- **Left cut:** `.wal-hero` edge-to-edge nahi (`margin` / section padding). `2892ecb` + hashed:

  `.wal-hero, .wal-body, .page-section[data-sec="wallet"]{ width:100%; margin-left:0; box-sizing:border-box }` + `::before` left/right −2px.

- Blank-tab screenshots me wallet **poora missing** tha — cut nahi, **hide/stack**. `f918d12` dobara `padding-left:0; left:0`.

## 2.6 PWA cache — origin theek, phone purana (`f918d12` se pehle)

**Proof (curl 2026-11-01):** origin `l63` / `43de346` serve ho raha tha; `sw.js` **v17 same bytes** — naya worker **install nahi**.

HTML fetch **stale-while-revalidate:** cached `index.html` **turant**, fresh background. PWA **l62** (heal + hide) dikhati, origin l63.

`andos3.719baac1.js` hardcode `__ANDOS_BUILD_ID=andos-v3-20261030l58`; SW `b2` tha → ACK mismatch.

**`f918d12`:** SW **v18**, `APP_BUILD_ID=c1`, HTML **network-first 1.2s**, `skipWaiting` + `clients.claim` pehle se. Phone tab tak purana dikhega jab tak PWA SW update na le (kill/reopen ya site data clear).

## 2.7 Aur reject / mat-wapis list (UI)

Inhe dobara mat lagaana (user corrections):

- Extra overflow stacks; 128/512 fake DP; AI fake UI shots.
- Flat 100% transparent header hamesha; l7 hamesha-opaque pink 0.75; l10 shell `#F9A8D4`; l11 in-flow bar.
- l13 `#eaf0ff`; l15 pastel no-login; l23 mask+bottom 0; l24 full-header blur at rest; l26 `::after` blur(18px).
- l27 hysteresis WHITE; l28 8-step color-mix; **l35 binary WHITE**.
- Gemini/e27180d 44px glow; l30 filled-ring blob; l31 SVG inset-6; l53 metal chrome; l54 `#ffffff` gap.
- Page background paint (l45); 14px SURGICAL; monolith 1.64MB restore **unless asked**.
- `scripts/wallet-lock.py` **commit nahi**. `andos-com` unpause **unless asked**.

## 2.8 Dead / incomplete backend

| Item | Haal |
|---|---|
| `andos-fs` worker | Cloudflare **1042**, dead |
| Phase 2 | Plan diya, **code nahi** |
| Prod Firestore rules publish | **Nahi** (local file only) |
| Sim worker re-wire after HTML rewrite | URL client me; key nahi; full quota path audit pending |
| Guest `/health` | 200 |
| Hashed `andos6` me `walletUnlocked` string | 3 hits — **client write path audit** baaki; rules local deny |

---

## Current HEAD snapshot (active, not marketing)

| | |
|---|---|
| Git | `f918d12` |
| HTML meta | `andos-v3-20261101c1` |
| App JS | `andos6.15ddda7d.js` |
| App CSS | `andos5.1c269aa0.css` |
| SW | `v18` / network-first HTML |
| Splash | inline single owner, 2.5s cap, **no zoom bundle** |
| Heal 800ms | **off** |
| Explore | blank `#exploreCanvas` (redesign slot) |
| Slider | hashed flex row + last-wins sections visible |

---

## Ek line

**Solid:** monolith→hashed split, Auth lock, Firebase `andos-49b6a`, unauth 403, SIM key strip, accepted header/DP/tabs/stack fix, local money-lock rules (unpublished).  
**Toota-phir-revert:** `height:auto` shell, heal timer, 3-owner splash, visibility-hidden blank tabs, SW v17 stale HTML.  
**Phone vs origin:** origin `c1` serve karta hai; installed PWA **v18 adopt** kare bina purani screen dikh sakti hai — ye product bug nahi, cache contract tha.
