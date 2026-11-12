/**
 * Telegram webhook — payment buttons.
 * POST https://andostosites.vercel.app/api/telegram
 *
 * Env (Vercel, production):
 *   TELEGRAM_BOT_TOKEN
 *   FIREBASE_SERVICE_ACCOUNT  (JSON string of service account)
 *   TELEGRAM_ADMIN_CHAT_ID    (optional, default 6775379996)
 */
const PROJECT = 'andos-49b6a';
const FS = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents';
const DEFAULT_CHAT = '6775379996';

function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

function envToken() {
  return String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
}
function adminChat() {
  return String(process.env.TELEGRAM_ADMIN_CHAT_ID || DEFAULT_CHAT).trim();
}

async function tg(method, body) {
  const token = envToken();
  if (!token) throw new Error('no bot token');
  const r = await fetch('https://api.telegram.org/bot' + token + '/' + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json().catch(function () { return {}; });
}

function sa() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  const s = String(raw).trim();
  try { return JSON.parse(s); } catch (e) {}
  try { return JSON.parse(Buffer.from(s, 'base64').toString('utf8')); } catch (e) { return null; }
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function googleAccessToken() {
  const acc = sa();
  if (!acc || !acc.private_key || !acc.client_email) throw new Error('no service account');
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: acc.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const crypto = require('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(header + '.' + claim);
  const sig = sign.sign(acc.private_key, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  const jwt = header + '.' + claim + '.' + sig;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + jwt,
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('google token failed');
  return d.access_token;
}

function fsVal(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  return { stringValue: String(v) };
}

function fromFs(fields) {
  const o = {};
  if (!fields) return o;
  Object.keys(fields).forEach(function (k) {
    const f = fields[k];
    if (!f) return;
    if (f.stringValue !== undefined) o[k] = f.stringValue;
    else if (f.integerValue !== undefined) o[k] = Number(f.integerValue);
    else if (f.doubleValue !== undefined) o[k] = Number(f.doubleValue);
    else if (f.booleanValue !== undefined) o[k] = f.booleanValue;
    else if (f.nullValue !== undefined) o[k] = null;
  });
  return o;
}

async function fsGet(token, path) {
  const r = await fetch(FS + '/' + path, { headers: { Authorization: 'Bearer ' + token } });
  if (r.status === 404) return null;
  const d = await r.json();
  if (!d || !d.fields) return null;
  return Object.assign({ _id: path.split('/').pop() }, fromFs(d.fields));
}

async function fsQueryEqual(token, collection, field, value) {
  const body = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      where: {
        fieldFilter: {
          field: { fieldPath: field },
          op: 'EQUAL',
          value: { stringValue: String(value) },
        },
      },
      limit: 1,
    },
  };
  const r = await fetch(FS + ':runQuery', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const arr = await r.json().catch(function () { return []; });
  if (!Array.isArray(arr)) return null;
  for (var i = 0; i < arr.length; i++) {
    const doc = arr[i] && arr[i].document;
    if (!doc || !doc.fields) continue;
    const id = String(doc.name || '').split('/').pop();
    return Object.assign({ _id: id }, fromFs(doc.fields));
  }
  return null;
}

async function fsPatch(token, path, data) {
  const fields = {};
  Object.keys(data).forEach(function (k) { fields[k] = fsVal(data[k]); });
  const mask = Object.keys(data).map(function (k) { return 'updateMask.fieldPaths=' + encodeURIComponent(k); }).join('&');
  const r = await fetch(FS + '/' + path + '?' + mask, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: fields }),
  });
  return r.json();
}

async function findRequest(token, rawId) {
  const id = String(rawId || '').trim();
  if (!id) return null;
  const variants = [id];
  if (id.indexOf('-') === -1 && /^(DEP|ORD|CHK)/i.test(id)) {
    variants.push(id.slice(0, 3) + '-' + id.slice(3));
  }
  for (var i = 0; i < variants.length; i++) {
    const doc = await fsGet(token, 'requests/' + variants[i]);
    if (doc) return doc;
  }
  const fields = ['reference', 'id', 'paymentCheckReference'];
  for (var f = 0; f < fields.length; f++) {
    for (var j = 0; j < variants.length; j++) {
      const found = await fsQueryEqual(token, 'requests', fields[f], variants[j]);
      if (found) return found;
    }
  }
  return null;
}

function orderDocId(req) {
  const raw = String((req && (req.orderId || req.order_id)) || '').trim();
  if (!raw) return '';
  return raw.replace(/^#/, '');
}

async function creditWallet(token, uid, amount, note) {
  uid = String(uid || '');
  amount = Number(amount || 0);
  if (!uid || !(amount > 0)) return null;
  const w = (await fsGet(token, 'wallets/' + uid)) || { uid: uid, balance: 0 };
  const next = Number(w.balance || 0) + amount;
  const now = Date.now();
  await fsPatch(token, 'wallets/' + uid, {
    uid: uid,
    balance: next,
    updatedAt: now,
  });
  return next;
}

function parseCallback(data) {
  const m = String(data || '').match(/^(deposit|order)_(approve|reject|fail|view):([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  return { kind: m[1], action: m[2], id: m[3] };
}

function parseFailReply(text) {
  const t = String(text || '');
  const m = t.match(/Request:\s*([A-Za-z0-9_-]+)/i) || t.match(/ID:\s*([A-Za-z0-9_-]+)/i);
  return m ? m[1] : '';
}

async function handleCallback(cq) {
  const chatId = String((cq.message && cq.message.chat && cq.message.chat.id) || '');
  if (chatId && chatId !== adminChat()) {
    await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Not allowed', show_alert: true });
    return;
  }
  const p = parseCallback(cq.data);
  if (!p) {
    await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Unknown button', show_alert: true });
    return;
  }
  const gtok = await googleAccessToken();
  const req = await findRequest(gtok, p.id);
  if (!req) {
    await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Request ' + p.id + ' nahi mili', show_alert: true });
    return;
  }

  if (p.action === 'view') {
    await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Details' });
    const lines = [
      '🔍 <b>VIEW DETAILS</b>',
      'ID: <code>' + (req.id || req._id) + '</code>',
      'Type: ' + (req.type || p.kind),
      'Status: ' + (req.status || ''),
      'Amount: ₹' + (req.amount || 0),
      'UID: <code>' + (req.uid || '') + '</code>',
      'Name: ' + (req.userName || ''),
      'Order: ' + (req.orderId || '—'),
      'Ref: ' + (req.reference || '—'),
    ];
    await tg('sendMessage', { chat_id: chatId, text: lines.join('\n'), parse_mode: 'HTML' });
    return;
  }

  if (p.action === 'fail') {
    await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Reason type karo' });
    await tg('sendMessage', {
      chat_id: chatId,
      text:
        '⚠️ <b>FAIL + WALLET REFUND</b>\n' +
        'Request: <code>' + (req.id || req._id) + '</code>\n' +
        'Amount: ₹' + (req.amount || 0) + '\n' +
        'UID: <code>' + (req.uid || '') + '</code>\n\n' +
        'Is message ka <b>Reply</b> karke fail reason type karo.\n' +
        'Reason aate hi request FAIL hogi aur ₹' + (req.amount || 0) + ' wallet me refund ho jayega.',
      parse_mode: 'HTML',
      reply_markup: { force_reply: true, selective: true },
    });
    return;
  }

  if (req.status === 'approved' || req.status === 'rejected' || req.status === 'failed') {
    await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Pehle se ' + req.status, show_alert: true });
    return;
  }

  const now = Date.now();
  if (p.action === 'approve') {
    const patch = {
      status: 'approved',
      approvedAt: now,
      processedAt: now,
      updatedAt: now,
      adminNote: 'Approved via Telegram',
    };
    await fsPatch(gtok, 'requests/' + (req.id || req._id), patch);
    if (req.type === 'deposit' && req.uid) {
      const bal = await creditWallet(gtok, req.uid, Number(req.amount || 0), 'deposit-approve');
      await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Approved + wallet credit' });
      await tg('sendMessage', {
        chat_id: chatId,
        text: '✅ Approved\nRequest <code>' + (req.id || req._id) + '</code>\n₹' + req.amount + ' wallet me.\nBalance: ₹' + (bal != null ? bal : '—'),
        parse_mode: 'HTML',
      });
    } else {
      await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Order approved' });
      await tg('sendMessage', {
        chat_id: chatId,
        text: '✅ Order approved\n<code>' + (req.id || req._id) + '</code> · ' + (req.orderId || ''),
        parse_mode: 'HTML',
      });
    }
    return;
  }

  if (p.action === 'reject') {
    await fsPatch(gtok, 'requests/' + (req.id || req._id), {
      status: 'rejected',
      rejectedAt: now,
      processedAt: now,
      updatedAt: now,
      rejectionReason: 'Rejected via Telegram',
    });
    await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Rejected' });
    await tg('sendMessage', {
      chat_id: chatId,
      text: '❌ Rejected (refund nahi)\n<code>' + (req.id || req._id) + '</code>',
      parse_mode: 'HTML',
    });
  }
}

async function handleFailReply(msg) {
  const chatId = String(msg.chat && msg.chat.id || '');
  if (chatId !== adminChat()) return;
  const quoted = msg.reply_to_message && msg.reply_to_message.text || '';
  if (!/FAIL \+ WALLET REFUND/i.test(quoted) && !/FAIL \+ WALLET/i.test(quoted)) return;
  const id = parseFailReply(quoted);
  const reason = String(msg.text || '').trim().slice(0, 300);
  if (!id) {
    await tg('sendMessage', { chat_id: chatId, text: 'Request ID nahi mili. Fail button dubara dabao.' });
    return;
  }
  if (!reason) {
    await tg('sendMessage', { chat_id: chatId, text: 'Reason khali hai. Type karke bhejo.' });
    return;
  }
  const gtok = await googleAccessToken();
  const req = await findRequest(gtok, id);
  if (!req) {
    await tg('sendMessage', { chat_id: chatId, text: 'Request ' + id + ' nahi mili.' });
    return;
  }
  if (req.status === 'failed' || req.status === 'approved') {
    await tg('sendMessage', { chat_id: chatId, text: 'Ye request pehle se ' + req.status + ' hai.' });
    return;
  }
  const now = Date.now();
  const amt = Number(req.amount || 0);
  await fsPatch(gtok, 'requests/' + (req.id || req._id), {
    status: 'failed',
    failedAt: now,
    processedAt: now,
    updatedAt: now,
    refund: true,
    note: reason,
    failReason: reason,
    adminNote: 'Failed via Telegram: ' + reason,
  });
  const oid = orderDocId(req);
  if (oid) {
    await fsPatch(gtok, 'orders/' + oid, {
      status: 'failed',
      displayStatus: 'Failed',
      failReason: reason,
      updatedAt: now,
    });
  }
  let bal = null;
  if (req.uid && amt > 0) {
    bal = await creditWallet(gtok, req.uid, amt, 'fail-refund');
  }
  await tg('sendMessage', {
    chat_id: chatId,
    parse_mode: 'HTML',
    text:
      '⚠️ <b>FAILED + REFUND</b>\n' +
      'Request: <code>' + (req.id || req._id) + '</code>\n' +
      'Reason: ' + reason.replace(/</g, '') + '\n' +
      'Refund: ₹' + amt + ' wallet me\n' +
      (bal != null ? 'New balance: ₹' + bal + '\n' : '') +
      'UID: <code>' + (req.uid || '') + '</code>',
  });
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (req.query && req.query.setup === '1') {
        const token = envToken();
        if (!token) return json(res, 500, { ok: false, error: 'TELEGRAM_BOT_TOKEN missing' });
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const url = 'https://' + host + '/api/telegram';
        const out = await tg('setWebhook', { url: url, allowed_updates: ['callback_query', 'message'] });
        return json(res, 200, { ok: true, url: url, telegram: out });
      }
      return json(res, 200, { ok: true, service: 'andos-telegram-buttons' });
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' });
    if (!envToken()) return json(res, 500, { ok: false, error: 'TELEGRAM_BOT_TOKEN missing' });
    const update = req.body || {};
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    } else if (update.message && update.message.reply_to_message) {
      await handleFailReply(update.message);
    }
    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 200, { ok: false, error: String(e && e.message || e) });
  }
};
