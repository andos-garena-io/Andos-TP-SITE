#!/usr/bin/env python3
"""
ANDOS optimizer — index.html ko split + minify karta hai.

Kya karta hai:
  1. Inline <style> blocks -> assets/css/*.css (cascade order 100% preserved)
  2. Inline <script> blocks -> assets/js/*.js (execution order 100% preserved:
     har group ke pehle external script/link par group break hota hai)
  3. Chhote blocks (<1200 B) aur id-wale shim inline rehte hain
  4. esbuild se minify (fail ho to unminified fallback)
  5. <head> me CSS + bade JS ke liye preload hints
  6. Dev/duplicate files ko output se bahar rakhta hai

Usage: python3 tools/optimize.py <src-repo> <out-dir>
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys

SKIP_FILES = {'DD.html', 'index.txt', 'index🗿.html', 'garena.html',
              'README.md', '.gitignore', 'vercel.json'}
SKIP_DIRS = {'.git', 'docs', 'scripts', 'workers', 'node_modules'}
MIN_BLOCK = 1200            # isse chhote blocks inline hi rehte hain
KEEP_INLINE_IDS = {'andos-sb13-storage-shim'}

TOKEN = re.compile(
    r'<style\b[^>]*>.*?</style>|<script\b[^>]*>.*?</script>|<link\b[^>]*rel=["\']?stylesheet[^>]*>',
    re.S | re.I)


def esbuild_minify(path, kind):
    """outfile == infile allowed nahi hota, isliye temp file -> replace."""
    tmp = path + '.min'
    # NOTE: --loader=... sirf stdin ke liye hota hai; extension se esbuild khud infer karta hai
    cmd = ['npx', '-y', 'esbuild', path, '--minify', f'--outfile={tmp}', '--log-level=error']
    if kind == 'js':
        cmd.append('--target=es2018')
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=300)
        if os.path.exists(tmp) and os.path.getsize(tmp) > 0:
            os.replace(tmp, path)
            return True
        return False
    except Exception as e:
        detail = ''
        if hasattr(e, 'stderr') and e.stderr:
            detail = e.stderr.decode('utf-8', 'ignore')[:200]
        print(f'   ! minify failed ({kind}) {path}: {detail or e.__class__.__name__} -> keeping unminified')
        if os.path.exists(tmp):
            os.remove(tmp)
        return False


def opening_tag(tag):
    """Sirf <style ...> / <script ...> wala hissa — poore body me 'src=' dhoondhna bug tha."""
    i = tag.find('>')
    return tag[:i + 1] if i != -1 else tag


def is_keep_inline(tag, inner):
    open_tag = opening_tag(tag)
    if len(inner) < MIN_BLOCK:
        return True
    m = re.search(r'id=["\']([^"\']+)["\']', open_tag)
    if m and m.group(1) in KEEP_INLINE_IDS:
        return True
    if re.search(r'type=["\'](application/(ld\+)?json|importmap|text/template)["\']', open_tag, re.I):
        return True
    if re.search(r'\bsrc\s*=', open_tag, re.I):
        return True
    return False


def main(src, out):
    html = open(os.path.join(src, 'index.html'), encoding='utf-8').read()
    orig_len = len(html)

    # ---- copy static files ----
    if os.path.isdir(out):
        shutil.rmtree(out)
    os.makedirs(out)
    for name in os.listdir(src):
        p = os.path.join(src, name)
        if name in SKIP_FILES or name.startswith('.git'):
            continue
        if os.path.isdir(p):
            if name in SKIP_DIRS:
                continue
            shutil.copytree(p, os.path.join(out, name))
        elif name != 'index.html':
            shutil.copy2(p, os.path.join(out, name))
    os.makedirs(os.path.join(out, 'assets', 'css'), exist_ok=True)
    os.makedirs(os.path.join(out, 'assets', 'js'), exist_ok=True)

    # ---- group blocks ----
    css_groups, js_groups = [], []      # list of dicts {files:[patch_fn], placeholder_tokens:[...]}
    cur_css, cur_js = None, None
    edits = []                          # (start, end, replacement)

    for m in TOKEN.finditer(html):
        tag_full = m.group(0)
        kind = re.match(r'<(\w+)', tag_full).group(1).lower()

        if kind == 'link':                    # stylesheet link -> break css group, keep
            cur_css = None
            continue
        if kind == 'style':
            inner_m = re.search(r'<style\b[^>]*>(.*?)</style>', tag_full, re.S | re.I)
            inner = inner_m.group(1) if inner_m else ''
            if is_keep_inline(tag_full, inner):
                cur_css = None
                continue
            if cur_css is None:
                cur_css = {'parts': [], 'first': m}
                css_groups.append(cur_css)
            cur_css['parts'].append(inner)
            edits.append([m.start(), m.end(), None])   # filled later
            cur_css.setdefault('spans', []).append([m.start(), m.end()])
            continue
        if kind == 'script':
            has_src = bool(re.search(r'\bsrc\s*=', opening_tag(tag_full), re.I))
            inner_m = re.search(r'<script\b[^>]*>(.*?)</script>', tag_full, re.S | re.I)
            inner = inner_m.group(1) if inner_m else ''
            if has_src or is_keep_inline(tag_full, inner):
                if has_src:
                    cur_js = None
                    continue
                cur_js = None
                continue
            if cur_js is None:
                cur_js = {'parts': [], 'first': m, 'spans': []}
                js_groups.append(cur_js)
            cur_js['parts'].append(inner)
            cur_js.setdefault('spans', []).append([m.start(), m.end()])
            edits.append([m.start(), m.end(), None])

    # ---- write css/js files ----
    written = []
    plan = {}
    for i, g in enumerate(css_groups, 1):
        name = f'assets/css/andos{i}.css'
        path = os.path.join(out, name)
        body = '\n'.join(g['parts'])
        open(path, 'w', encoding='utf-8').write(body)
        before = len(body)
        esbuild_minify(path, 'css')
        hashed = f'assets/css/andos{i}.{hashlib.sha1(open(path, "rb").read()).hexdigest()[:8]}.css'
        os.replace(path, os.path.join(out, hashed))
        name, after = hashed, os.path.getsize(os.path.join(out, hashed))
        g['name'] = name
        written.append((name, before, after))
        plan[name] = g['spans']
    for i, g in enumerate(js_groups, 1):
        name = f'assets/js/andos{i}.js'
        path = os.path.join(out, name)
        body = '\n'.join(g['parts'])
        open(path, 'w', encoding='utf-8').write(body)
        before = len(body)
        esbuild_minify(path, 'js')
        hashed = f'assets/js/andos{i}.{hashlib.sha1(open(path, "rb").read()).hexdigest()[:8]}.js'
        os.replace(path, os.path.join(out, hashed))
        name, after = hashed, os.path.getsize(os.path.join(out, hashed))
        g['name'] = name
        written.append((name, before, after))
        plan[name] = g['spans']

    # ---- rebuild html ----
    repl = []
    for g in css_groups + js_groups:
        spans = sorted(g['spans'])
        first = spans[0]
        if g['name'].endswith('.css'):
            tag = f'<link rel="stylesheet" href="/{g["name"]}">'
        else:
            tag = f'<script src="/{g["name"]}"></script>'
        repl.append((first[0], first[1], tag))
        for a, b in spans[1:]:
            repl.append((a, b, ''))
    for a, b, t in sorted(repl, reverse=True):
        html = html[:a] + t + html[b:]

    # ---- head hints: preload biggest JS (sabse bada group) ----
    biggest = max(js_groups, key=lambda g: os.path.getsize(os.path.join(out, g['name'])), default=None)
    hints = ''
    if css_groups:
        hints += f'<link rel="preload" as="style" href="/{css_groups[0]["name"]}">'
    if biggest:
        hints += f'<link rel="preload" as="script" href="/{biggest["name"]}">'
    if hints:
        html = html.replace('</head>', hints + '</head>', 1)

    open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(html)

    rep = {
        'html_before': orig_len,
        'html_after': len(html),
        'files': [{'file': n, 'before': b, 'after': a} for n, b, a in written],
        'css_groups': len(css_groups),
        'js_groups': len(js_groups),
    }
    print(json.dumps(rep, indent=2))
    return rep


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
