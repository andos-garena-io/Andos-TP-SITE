#!/usr/bin/env python3
"""Admin lock/unlock. Does not change wallet balance.
Usage:
  TRACKER_TOKEN=... python3 scripts/wallet-lock.py lock FIREBASE_UID
  TRACKER_TOKEN=... python3 scripts/wallet-lock.py unlock FIREBASE_UID
"""
import json, os, sys, urllib.request, urllib.error

API = os.environ.get('ANDOS_TRACKER_URL', 'https://andos-tracker.andos-support.workers.dev').rstrip('/')
TOKEN = os.environ.get('TRACKER_TOKEN', '')

def main():
    if len(sys.argv) != 3 or sys.argv[1] not in ('lock', 'unlock'):
        print('Usage: TRACKER_TOKEN=... python3 scripts/wallet-lock.py lock|unlock UID')
        return 2
    if not TOKEN:
        print('Set TRACKER_TOKEN in the environment. Token is not stored in this file.')
        return 2
    action, uid = sys.argv[1], sys.argv[2].strip()
    body = json.dumps({'targetUid': uid, 'unlocked': action == 'unlock'}).encode()
    req = urllib.request.Request(
        API + '/api/wallet/lock',
        data=body,
        method='POST',
        headers={
            'Content-Type': 'application/json',
            'X-Tracker-Token': TOKEN,
            'User-Agent': 'andos-wallet-lock',
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(r.read().decode())
            return 0
    except urllib.error.HTTPError as e:
        print(e.code, e.read().decode('utf-8', 'replace'))
        return 1

if __name__ == '__main__':
    raise SystemExit(main())
