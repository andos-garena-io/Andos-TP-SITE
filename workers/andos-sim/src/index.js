/* ANDOS SIM lookup proxy. API key = env NUMLOOKUP_API_KEY only. */
const ALLOW = new Set([
  'https://andostosites.vercel.app',
  'https://andostosites-andos1.vercel.app',
  'https://andostosites-git-main-andos1.vercel.app',
]);

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowOrigin = ALLOW.has(origin) ? origin : 'https://andostosites.vercel.app';
    const cors = {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405, cors);
    const path = new URL(req.url).pathname.replace(/\/+$/, '') || '/';
    if (path !== '/lookup') return json({ error: 'not found' }, 404, cors);
    if (!ALLOW.has(origin)) return json({ error: 'origin' }, 403, cors);
    if (!env.NUMLOOKUP_API_KEY) return json({ error: 'not configured' }, 503, cors);

    let n = '';
    try {
      const b = await req.json();
      n = String((b && (b.n || b.num)) || '').replace(/\D/g, '').slice(-10);
    } catch (e) {}
    if (!/^[6-9]\d{9}$/.test(n)) return json({ valid: false }, 200, cors);

    const up = await fetch(
      'https://api.numlookupapi.com/v1/validate/+91' + n + '?apikey=' + env.NUMLOOKUP_API_KEY
    );
    const d = await up.json().catch(function () { return {}; });
    return json({
      valid: !!d.valid,
      carrier: String(d.carrier || ''),
      location: String(d.location || ''),
    }, 200, cors);
  },
};
