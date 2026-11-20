# Ek function ka ek malik (ownership niyam)

**Niyam (1 line):** Jis file/layer ne global/DOM banaya, sirf wahi use likhega.
Doosri layer sirf **padh** sakti hai (`typeof`-guard ke saath) — **likh nahi sakti.**

## Namespace map

| Namespace | Malik (define karta hai) | Doosre kya kar sakte hain |
|---|---|---|
| `__andos*` | `andos6` (app bundle) | sirf padh/call — EXCEPTIONS neeche |
| `__p2*` | `src/p2-overrides.js` | sirf padh |
| `__morph*` | `src/morph/helper.js` | sirf padh |
| `Idiomorph`, `__idiomorph*` | `src/morph/vendor-idiomorph.min.js` (vendor — EDIT MANA) | sirf call |

## Registered exceptions (5) — registry ke bahar koi `__andos*` define = BUILD FAIL

| Global | File | Kyon (reason) |
|---|---|---|
| `__andosBindSlider` | p2-overrides.js | P2 slider hard-lock: app binder ko no-op karta hai |
| `__andosRestoreScroll` | p2-overrides.js | F1 deepfix: render-save honor karta FIXED version. **YAHI line P9 me broken thi (9-day regression) — yahan change = full matrix mandatory** |
| `__andosRS` | p2-overrides.js | F1: render-save consume-after-honor (`read + null`). Save ka malik APP hai, P2 sirf consume karta hai |
| `__andosVidFix` | p2-overrides.js | vidfix idempotence flag (grandfathered — naya flag `__p2*` me banao) |
| `__andosMorphC` | morph/helper.js | **REQUIRED:** forked andos6 isi hook ko bulata hai (fork contract — `src/andos6.fork.md`) |

## P9 kahani (kyon ye niyam hai)

11 Nov ko P2 ne `__andosRestoreScroll` naam dobara define kar diya (pata nahi tha app me ye naam hai).
10-tarik wala scroll fix **9 din** tak mara raha. Naam-takraav = silent murder. Isliye scanner.

## Enforcement

- `npm run scan` / `npm run build` — `tools/ownership-scan.mjs` gate.
- Violation mile to 3 raste: (1) owner file me change karo, (2) exception propose karo + review + full matrix,
  (3) apne namespace me naya global banao (`__p2*` / `__morph*`).

## DOM rule (human, scanner se bahar)

Ek subtree ka ek writer: `#app` shell = andos6 · splash overlay = andos4/5 · toasts = `renderToasts()`
· P2 overlay pages = p2-overrides · video nodes = morph SKIP (koi morph nahi).
