# ANDOS architecture (as-shipped, 20 Nov 2026)

## Har file ka role

| File | Size | Role |
|---|---|---|
| `index.html` | 70KB | shell + script/css refs (order = load order, mat badlo) |
| `andos1` | 0.8KB | boot gate (last-account check) |
| `andos2` | 0.8KB | CDN asset config (jsdelivr base) |
| `andos3` | 1.5KB | Service-Worker registration |
| `andos4` | 8.3KB | splash + status-bar engine (`__andosSplashActive`) |
| `andos5` | 3.1KB | splash overlay + video |
| `andos6` | 764KB | **THE APP** — pages, `render()`, Firestore, listeners, timers |
| `andos-tg-actions` | 2.7KB | Telegram Fail → local wallet-refund marking |
| `morph-rt` | 11.7KB | render fork runtime (idiomorph + callbacks + stats) |
| `p2-overrides` | 33KB | P2/P3/deepfix/vidfix overrides (eses `src/` me) |
| `sw.js` | 4.7KB | SW v37 — HTML hamesha fresh (`no-store`), media versioned-cache |
| `api/telegram.js` | 14KB | Telegram webhook (serverless, CJS — `package.json` me `type:module` MAT lagao) |
| `bug-v1.0.html` | 70KB | **FROZEN** F1F2 archive (noindex) — kabhi mat badlo |

Boot order: andos1 → shims → andos2 → GSI → andos3 → andos4 → tailwind → andos5 →
firebase×3 → **andos6** → tg-actions → **morph-rt** → **p2-overrides (LAST — sabko wrap kar sakta hai)**.

## Update mechanism (jad — day 1 se hai)

```
Firestore onSnapshot (orders/requests/wallet/officer)
   → in-memory arrays update → render()
     → page template string → #app.innerHTML := ... (AB: morph-patch)
     → renderToasts() + init-tail (listeners/timers dobara)
```

- **9 Oct (pehla upload):** `function render()` + `app.innerHTML` + `renderToasts()` + init-tail,
  **110 `render()` callers**, 2 watchers → `render()`, ~68 `innerHTML` sites. Author ka khud ka
  comment: *"prevents stacked full renders (UI stutter / pseudo-refresh feel)"*.
- Pehle renders KAM the (kam users/ticks, chhota page) → nuksan invisible.
  Ab renders ZYADA + page BHARI → wahi formula = jump/wipe/freeze. **Formula same, scale badla.**
- `vercel.json`: `/assets/js|css/*` = `immutable 1yr`, `/` + `/index.html` = `must-revalidate`.
  Matlab: content-hash badlo = purani file kabhi maangi hi nahi jayegi (dead cleanup safe).

## Jad (5) + sthiti

1. Full rebuild = only update path → morph se harmless (state-loss 0), freeze-ms aadha. Poora ant = Store+updaters (future).
2. Koi data layer nahi → future: `src/store.js`.
3. Ek DOM, 2-3 malik → **SOLVED aaj:** `src/OWNERSHIP.md` + scanner gate.
4. Koi source/build nahi → **SOLVED aaj:** `src/` + `tools/build.mjs` (byte-reproducible) + 14.7MB dead cleanup.
5. Haath se cache-version → SW auto-purge + immutable hashes (stable).
