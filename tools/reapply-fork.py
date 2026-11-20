#!/usr/bin/env python3
"""andos6 par morph-fork (re)apply — mechanical, idempotent. Haath se surgery MANA.
Usage: python3 tools/reapply-fork.py IN-andos6.js OUT.js
- ALREADY-APPLIED: kuch nahi karta, exit 0. Partial-fork: FAIL exit 2 (human review).
- Success: fork + node --check + bytes/delta/sha print. (Splices: src/andos6.fork.md)
"""
import sys, subprocess, hashlib

ANCHOR = "if(C.innerHTML=`"
R1_OLD = "C.innerHTML=`"
R1_NEW = '(window.__andosMorphC||function(e,h){e.innerHTML=h;return h})(C,`'
R3_OLD = "window.initHomeEvtMorph=function(){"
R3_NEW = ('window.initHomeEvtMorph=function(){try{var __mv=document.querySelector(".page-section video");'
          'if(__mv){if(__mv.dataset.mcV)return;__mv.dataset.mcV="1"}}catch(_){}')


def template_end(t, j):
    depth, n = 0, len(t)
    while j < n:
        c = t[j]
        if depth == 0:
            if c == "\\":
                j += 2
                continue
            if c == "`":
                return j
            if c == "$" and j + 1 < n and t[j + 1] == "{":
                depth = 1
                j += 2
                continue
            j += 1
            continue
        if c in "\"'`":
            q = c
            j += 1
            while j < n:
                if t[j] == "\\":
                    j += 2
                    continue
                if t[j] == q:
                    j += 1
                    break
                if q == "`" and t[j] == "$" and j + 1 < n and t[j + 1] == "{":
                    k, d2 = j + 2, 1
                    while k < n and d2:
                        if t[k] == "\\":
                            k += 2
                            continue
                        if t[k] in "\"'":
                            q2 = t[k]
                            k += 1
                            while k < n:
                                if t[k] == "\\":
                                    k += 2
                                    continue
                                if t[k] == q2:
                                    k += 1
                                    break
                                k += 1
                            continue
                        if t[k] == "{":
                            d2 += 1
                        elif t[k] == "}":
                            d2 -= 1
                        k += 1
                    j = k
                    continue
                j += 1
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
        j += 1
    raise AssertionError("template end not found")


def main():
    src, dst = sys.argv[1], sys.argv[2]
    t = open(src).read()
    has_r1 = "__andosMorphC" in t
    has_r3 = "__mv.dataset.mcV" in t
    if has_r1 and has_r3:
        print("ALREADY-APPLIED (kuch nahi kiya)")
        return
    if has_r1 != has_r3:
        print("FAIL: PARTIAL fork (R1=%s R3=%s) — human review, haath mat lagao" % (has_r1, has_r3))
        sys.exit(2)
    assert t.count(ANCHOR) == 1, f"R1 anchor count={t.count(ANCHOR)} — bundle badla, STOP"
    i = t.find(ANCHOR) + len("if(")
    assert t[i:i + 13] == R1_OLD, "R1 anchor drifted — STOP"
    j = template_end(t, i + len(R1_OLD))
    new = t[:i] + R1_NEW + t[i + len(R1_OLD):]
    j2 = j + (len(R1_NEW) - len(R1_OLD))
    assert new[j2] == "`", "end anchor drifted — STOP"
    new = new[:j2 + 1] + ")" + new[j2 + 1:]
    assert new.count(R3_OLD) == 1, f"R3 anchor count={new.count(R3_OLD)} — STOP"
    new = new.replace(R3_OLD, R3_NEW)
    open(dst, "w").write(new)
    r = subprocess.run(["node", "--check", dst], capture_output=True, text=True)
    assert r.returncode == 0, "node --check FAIL: " + r.stderr[:300]
    print(f"FORK-OK bytes={len(new.encode())} delta={len(new.encode()) - len(t.encode())} sha={hashlib.sha256(new.encode()).hexdigest()[:8]} node=OK")


main()
