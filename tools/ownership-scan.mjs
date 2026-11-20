#!/usr/bin/env node
// Ek function ka ek malik — cross-namespace DEFINE scanner (build gate).
// Rule: __andos* sirf andos6 define kare; src me sirf EXCEPTIONS wale naam.
// Reads/calls (W.__andosX(), typeof-checks) allowed — sirf DEFINES scan hote hain.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXCEPTIONS = [
  { name: '__andosBindSlider', file: 'src/p2-overrides.js', reason: 'P2 slider hard-lock' },
  { name: '__andosRestoreScroll', file: 'src/p2-overrides.js', reason: 'F1 deepfix fixed version (P9 line — change = full matrix)' },
  { name: '__andosRS', file: 'src/p2-overrides.js', reason: 'F1 consume-after-honor (malik: app)' },
  { name: '__andosVidFix', file: 'src/p2-overrides.js', reason: 'vidfix flag (grandfathered)' },
  { name: '__andosMorphC', file: 'src/morph/helper.js', reason: 'fork contract hook (REQUIRED)' },
];
const FILES = ['src/p2-overrides.js', 'src/morph/helper.js'];
// [family-regex-source, owner-files]: ye family sirf owner file me define ho sakti hai
const FAMILIES = [
  ['__p2', ['src/p2-overrides.js']],
  ['__morph', ['src/morph/helper.js']],
];

function definesOf(text, fam, aliasW) {
  const out = [];
  const self = aliasW ? '(?:window|W)' : 'window';
  const res = [
    new RegExp(`${self}\\s*\\.\\s*(${fam}[A-Za-z0-9_]*)\\s*=(?![=>])`, 'g'),
    new RegExp(`(?<![\\w$.:])(${fam}[A-Za-z0-9_]*)\\s*=(?![=>])`, 'g'),
    new RegExp(`function\\s+(${fam}[A-Za-z0-9_]*)\\s*\\(`, 'g'),
  ];
  for (const re of res) {
    let m;
    while ((m = re.exec(text))) {
      const line = text.slice(0, m.index).split('\n').length;
      out.push({ name: m[1], line });
    }
  }
  return out;
}

export function scan(root = ROOT) {
  const violations = [];
  const warnings = [];
  for (const f of FILES) {
    const p = resolve(root, f);
    if (!existsSync(p)) { violations.push(`${f}: FILE MISSING`); continue; }
    const t = readFileSync(p, 'utf8');
    const aliasW = f === 'src/p2-overrides.js'; // P2 me `var W = window` convention
    for (const { name, line } of definesOf(t, '__andos', aliasW)) {
      const ok = EXCEPTIONS.find((e) => e.name === name && e.file === f);
      if (!ok) violations.push(`${f}:${line}: '${name}' define karta hai — __andos* ka malik andos6 hai (src/OWNERSHIP.md dekho)`);
    }
    for (const [fam, owners] of FAMILIES) {
      if (owners.includes(f)) continue;
      for (const { name, line } of definesOf(t, fam, aliasW)) {
        violations.push(`${f}:${line}: '${name}' define karta hai — is family ka malik: ${owners.join(', ')}`);
      }
    }
  }
  for (const e of EXCEPTIONS) {
    const p = resolve(root, e.file);
    if (existsSync(p) && definesOf(readFileSync(p, 'utf8'), '__andos', e.file === 'src/p2-overrides.js').every((d) => d.name !== e.name)) {
      warnings.push(`${e.file}: exception '${e.name}' ab define nahi hota — registry saaf karo`);
    }
  }
  return { violations, warnings };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const { violations, warnings } = scan();
  for (const w of warnings) console.log('WARN ' + w);
  if (violations.length) {
    console.log(`OWNERSHIP-SCAN: ${violations.length} VIOLATION(s) — build RUKA`);
    for (const v of violations) console.log('  X ' + v);
    process.exit(1);
  }
  console.log(`OWNERSHIP-SCAN: PASS (${EXCEPTIONS.length} registered exceptions, 0 unknown defines)`);
}
