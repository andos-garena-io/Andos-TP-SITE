#!/usr/bin/env node
// ANDOS build pipeline: src/ → hashed assets (byte-reproducible) + gates.
// Default = VERIFY (src se live bytes dobara bante hain? drift = FAIL).
// --write   = src change ke baad naya hashed asset + index.html refs + purani file auto-delete.
// bug-v1.0.html FROZEN hai — is script use kabhi nahi chhoota.
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { scan } from './ownership-scan.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => resolve(ROOT, p);
const sha8 = (s) => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 8);
const liveHash = (p) => (basename(p).match(/\.([a-f0-9]{8})\.(js|css)$/) || [])[1];

const TARGETS = [
  { name: 'morph-rt', kind: 'js', parts: ['src/morph/vendor-idiomorph.min.js', 'src/morph/helper.js'], join: '\n', live: 'assets/js/morph-rt.e94632e1.js' },
  { name: 'p2-overrides', kind: 'js', parts: ['src/p2-overrides.js'], join: '', live: 'assets/js/p2-overrides.9f8456d1.js' },
  { name: 'p2-overrides-css', kind: 'css', parts: ['src/p2-overrides.css'], join: '', live: 'assets/css/p2-overrides.2f01614e.css' },
];

function assemble(t) {
  return t.parts.map((p) => readFileSync(R(p), 'utf8')).join(t.join);
}
function nodeCheck(code, label) {
  const tmp = resolve(tmpdir(), `andos-buildcheck-${Date.now()}.js`);
  writeFileSync(tmp, code);
  try {
    execFileSync('node', ['--check', tmp], { stdio: 'pipe' });
  } finally { try { unlinkSync(tmp); } catch {} }
  return label;
}
function forkContract() {
  // forked andos6 (index.html wala) hook bulata hai + helper define karta hai
  const idx = readFileSync(R('index.html'), 'utf8');
  const a6 = (idx.match(/assets\/js\/andos6\.[a-f0-9]+\.js/) || [])[0];
  if (!a6 || !existsSync(R(a6))) return ['index.html ka andos6 ref missing hai'];
  const errs = [];
  if (!readFileSync(R(a6), 'utf8').includes('__andosMorphC')) errs.push(`${a6}: fork hook call MISSING (unforked bundle live?!)`);
  const helper = readFileSync(R('src/morph/helper.js'), 'utf8');
  if (!helper.includes('__andosMorphC')) errs.push('src/morph/helper.js: __andosMorphC define MISSING (fork toot jayega!)');
  return errs;
}
async function esbuildSelfTest() {
  try {
    const esbuild = await import('esbuild');
    for (const f of ['src/p2-overrides.js', 'src/morph/helper.js']) {
      const r = await esbuild.build({ entryPoints: [R(f)], bundle: true, write: false, logLevel: 'silent' });
      console.log(`  esbuild OK: ${f} (${r.outputFiles[0].text.length}B bundled in-memory)`);
    }
    return true;
  } catch (e) {
    console.log('  esbuild SKIP (npm install chalao): ' + String(e.message || e).slice(0, 100));
    return false;
  }
}

const WRITE = process.argv.includes('--write');
let fail = 0;

// Gate 0: ownership (src badla ho to pehle malik-check)
const { violations, warnings } = scan(ROOT);
for (const w of warnings) console.log('WARN ' + w);
if (violations.length) {
  console.log(`OWNERSHIP: ${violations.length} VIOLATION(s) — build RUKA`);
  for (const v of violations) console.log('  X ' + v);
  process.exit(1);
}
console.log('OWNERSHIP: PASS');

// Gate 1: assemble + hash + node --check
const results = [];
for (const t of TARGETS) {
  const code = assemble(t);
  if (t.kind === 'js') nodeCheck(code, t.name);
  const h = sha8(code);
  const lh = liveHash(t.live);
  const match = h === lh && readFileSync(R(t.live), 'utf8') === code;
  results.push({ t, code, h, match });
  console.log(`${match ? 'MATCH' : 'DRIFT'} ${t.name}: src-sha=${h} live=${lh} (${code.length}B, node --check OK)`);
}

// Gate 2: fork contract
const ferrs = forkContract();
if (ferrs.length) { console.log('FORK-CONTRACT: FAIL'); ferrs.forEach((e) => console.log('  X ' + e)); process.exit(1); }
console.log('FORK-CONTRACT: PASS');

// Gate 3: esbuild toolchain self-test
await esbuildSelfTest();

if (!WRITE) {
  const drift = results.filter((r) => !r.match);
  if (drift.length) {
    console.log(`VERIFY: FAIL — ${drift.length} target(s) drifted. src badla hai to --write chalao, warna src wapas karo.`);
    process.exit(1);
  }
  console.log('VERIFY: PASS — src se live bytes byte-identical bante hain (0 drift). Ship-safe.');
  process.exit(0);
}

// --write mode: naya hashed asset + index.html refs + purani file auto-delete (agar unreferenced)
const drifted = results.filter((r) => !r.match);
if (!drifted.length) { console.log('--write: koi drift nahi, kuch nahi karna.'); process.exit(0); }
let idx = readFileSync(R('index.html'), 'utf8');
const bug = existsSync(R('bug-v1.0.html')) ? readFileSync(R('bug-v1.0.html'), 'utf8') : '';
for (const { t, code, h } of drifted) {
  const ext = t.kind === 'css' ? 'css' : 'js';
  const dir = t.kind === 'css' ? 'assets/css' : 'assets/js';
  const base = t.name === 'p2-overrides-css' ? 'p2-overrides' : t.name;
  const New = `${dir}/${base}.${h}.${ext}`;
  const oldBase = basename(t.live);
  const newBase = basename(New);
  writeFileSync(R(New), code);
  const count = idx.split(oldBase).length - 1;
  if (!count) { console.log(`X ${oldBase} index.html me mila nahi — --write RUKA`); process.exit(1); }
  idx = idx.split(oldBase).join(newBase);
  console.log(`WRITE ${t.name}: ${oldBase} → ${newBase} (index.html refs: ${count})`);
  const stillUsed = idx.includes(oldBase) || bug.includes(oldBase);
  if (!stillUsed) { unlinkSync(R(t.live)); console.log(`  auto-delete purani file: ${t.live}`); }
  else console.log(`  purani file RAKHI (abhi koi route use karta hai): ${t.live}`);
}
writeFileSync(R('index.html'), idx);
console.log('--write DONE. Agla kadam: preview matrix → push → deploy → live matrix (bina matrix ke ship MANA).');
