# andos6 morph-fork — splice record + reapply procedure

Live `andos6` forked hai: uska main `#app.innerHTML` write `window.__andosMorphC` hook se
guzarta hai (morph-patch + innerHTML fallback). Naya andos6 aaye to fork **mechanical reapply** —
haath se surgery MANA.

## Splice table (exact anchors)

**R1 — fork call** (1 jagah, `count==1` mandatory):
- OLD: `C.innerHTML=\``
- NEW: `(window.__andosMorphC||function(e,h){e.innerHTML=h;return h})(C,\``
- PLUS: template-literal ke closing backtick ke turant baad `)` insert
  (comma-expr `if(C.innerHTML=\`...\`,renderToasts(),...)` ko call-expr banana hai).
- Template-end scan: `` \` `` escapes + `${}` nesting (quotes-aware) — `tools/reapply-fork.py`.

**R3 — mcV guard** (1 jagah, `count==1` mandatory):
- OLD: `window.initHomeEvtMorph=function(){`
- NEW: `window.initHomeEvtMorph=function(){try{var __mv=document.querySelector(".page-section video");if(__mv){if(__mv.dataset.mcV)return;__mv.dataset.mcV="1"}}catch(_){}`

## Reapply

```bash
python3 tools/reapply-fork.py nayi-andos6.js andos6.forked.js
# → ALREADY-APPLIED (kuch nahi karta) ya fork + node --check + bytes/delta/sha print
# → phir: hash-rename + index.html refs + preview matrix + ship (normal flow)
```

## Contract (build gate check karta hai)

- Forked andos6 me `__andosMorphC` call MOJOOD + `src/morph/helper.js` me define MOJOOD.
- Anchor `count != 1` ya partial-fork mile → **STOP, human review** (bundle internals badle hain).

## Byte-proof

`andos6.9d97471e.js` (pre-fork, archive wali) + reapply = `+180B` → live `andos6.e9869812.js`
**byte-identical** (20 Nov ko verified: `sha=e9869812, node=OK`).
