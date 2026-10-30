# archive_legacy — LEGACY LIVE BACKUP

Ye folder **30 Oct 2026** ka woh code hai jo production par live tha (single 1.64 MB `index.html` + inline CSS/JS),
`perf/split-and-harden` merge hone se **pehle**.

- **Git tag:** `v1-legacy-live-2026-10-30` (complete snapshot — `git tag` se push hua hai)
- **Commit (main):** `138734da619920b88fe6a629073c1737b61f6055`
- **Deploy:** `dpl_4bTJU1BBr6wuXX7NgrbDEEJRxwXA` (Vercel par abhi bhi Promote-able, `isRollbackCandidate: true`)

## Contents

| File | Size | Purpose |
|---|---|---|
| `index.html` | 1,634,750 B | **Live legacy app** — pura CSS + JS inline, verbatim copy |
| `legacy-site-full.tar.gz` | 2,642,260 B | Us waqt ke **saare** non-binary files (DD.html, index.txt, index🗿.html, garena.html, sw.js, manifest.json, vercel.json, workers/, scripts/, docs/) |
| `SHA256SUMS.txt` | small | Har file ka hash — integrity check ke liye |

## Restore kaise karein (2 tarike)

**A) Sirf legacy HTML wapas (assets same rehte hain):**
```bash
git checkout v1-legacy-live-2026-10-30 -- index.html
git commit -m 'revert: legacy single-file index.html'
```

**B) Poora legacy tree wapas:**
```bash
git checkout v1-legacy-live-2026-10-30 -- .
git commit -m 'revert: full legacy tree'
```

**C) Turant (bina git ke):** Vercel dashboard → Deployments → `dpl_4bTJU1BBr6wuXX7NgrbDEEJRxwXA` → **Promote to Production**.

## ⚠️ Security
Ye folder `.vercelignore` me hai — **public URL se serve NAHI hota**. Verify:
`curl -o /dev/null -w '%{http_code}' https://andostosites.vercel.app/archive_legacy/index.html` → **404** hona chahiye.

## Note
`assets/` (images, videos, icons) yahan duplicate nahi kiya — wo files merge ke baad bhi bilkul wahi hain, aur tag me poori tarah maujood hain. Isse repo 4 MB halka rehta hai.

## File hashes (main @ 138734da6199)

| File | Bytes | sha256[0:16] |
|---|---|---|
| `.git` | 49 | `0388e38d8c8f1036` |
| `DD.html` | 1,713,328 | `9363425553ec493a` |
| `garena.html` | 72,101 | `748c3ddc3336ea1c` |
| `index.html` | 1,638,519 | `fa060bb7542199b0` |
| `index.txt` | 1,713,328 | `9363425553ec493a` |
| `index🗿.html` | 2,061,325 | `eb7a48255c0a58db` |
| `manifest.json` | 2,632 | `569fc3a89179c49b` |
| `sw.js` | 4,759 | `5262eb55340d64f6` |
| `vercel.json` | 960 | `8d64cfcd61f130f0` |
| `workers/andos-sim/.gitignore` | 11 | `850536a2f7f6b865` |
| `workers/andos-sim/wrangler.toml` | 142 | `814077231a6f04b7` |
| `workers/andos-sim/src/index.js` | 1,897 | `115f87595c51e56b` |
| `scripts/wallet-lock.py` | 1,451 | `1504db278df51170` |
| `docs/refer-system-fix-documentation.md` | 19,113 | `b38dea04b6690649` |
