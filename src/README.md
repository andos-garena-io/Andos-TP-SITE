# src/ — readable source (single source of truth)

Ye folder live `assets/` ka **readable source** hai. Golden rules:

1. **Badlav hamesha `src/` me.** `assets/*.*.js` me haath se edit MANA hai.
2. Har build = `src` → assemble → `sha256[:8]` hash → `assets/<naam>.<hash>.js` + `index.html` ref update.
3. `bug-v1.0.html` **FROZEN archive** hai — build script use chhoota bhi nahi.
4. Har change ke baad **ownership scan + matrix** mandatory.

## Commands

```bash
npm install                 # ek baar (esbuild toolchain)
npm run build               # VERIFY: src == live bytes? (drift = FAIL)
npm run scan                # ownership scan standalone
node tools/build.mjs --write  # src badalne ke baad: naya hashed asset + index.html refs + purani file auto-delete
python3 tools/reapply-fork.py IN.js OUT.js  # naye andos6 par morph fork dobara lagao
```

## Files

| src file | banta hai | live |
|---|---|---|
| `morph/vendor-idiomorph.min.js` + `morph/helper.js` (join `\n`) | `morph-rt.<hash>.js` | `assets/js/morph-rt.e94632e1.js` |
| `p2-overrides.js` (as-is) | `p2-overrides.<hash>.js` | `assets/js/p2-overrides.9f8456d1.js` |
| `p2-overrides.css` (as-is) | `p2-overrides.<hash>.css` | `assets/css/p2-overrides.2f01614e.css` |

`andos1–6` abhi **vendor bundles** hain (readable source nahi hai) — unka future: page-by-page `src/` migration.
Un par fork dobara lagane ka documented tareeka: `src/andos6.fork.md`.
