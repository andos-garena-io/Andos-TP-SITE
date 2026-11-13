/* Fail from Telegram: red failed spend + local refund row. Wallet number comes from server. */
(function () {
  function markLocalTxnsFailed(e) {
    try {
      var list = JSON.parse(localStorage.getItem('andos_transactions') || '[]') || [];
      var refs = [e.reference, e.id, e.orderId, e.requestId].filter(Boolean).map(function (x) { return String(x); });
      var hit = false;
      list.forEach(function (l) {
        var keys = [l.reference, l.requestId, l.orderId].filter(Boolean).map(function (x) { return String(x); });
        var ok = refs.some(function (r) { return keys.indexOf(r) !== -1; });
        if (!ok) return;
        if (String(l.source || '') === 'refund' || l.type === 'credit') return;
        hit = true;
        l.status = 'failed';
        l.failReason = e.failReason || e.note || 'Failed';
        l.desc = String(l.desc || 'Payment').replace(/\s*·\s*FAILED$/i, '') + ' · FAILED';
      });
      if (hit) localStorage.setItem('andos_transactions', JSON.stringify(list.slice(0, 80)));
    } catch (err) {}
  }
  function addLocalRefund(e) {
    try {
      if (!(e.refund || e.refunded)) return;
      var amt = Number(e.refundAmount || e.amount || 0);
      if (!(amt > 0)) return;
      var list = JSON.parse(localStorage.getItem('andos_transactions') || '[]') || [];
      var rr = String(e.refundRef || ('RFD-' + e.id));
      var exists = list.some(function (l) {
        return String(l.reference) === rr || (String(l.source || '') === 'refund' && String(l.orderId || '') === String(e.orderId || ''));
      });
      if (exists) return;
      list.unshift({
        type: 'credit',
        amount: amt,
        desc: 'Wallet add · order failed',
        status: 'approved',
        source: 'refund',
        reference: rr,
        orderId: e.orderId || '',
        requestId: e.id,
        date: new Date().toLocaleDateString('en-IN')
      });
      localStorage.setItem('andos_transactions', JSON.stringify(list.slice(0, 80)));
    } catch (err) {}
  }
  function wrap() {
    if (!window.ANDOS_FB || typeof ANDOS_FB.applyRequest !== 'function' || ANDOS_FB.applyRequest.__andosFailRefund) return false;
    var orig = ANDOS_FB.applyRequest.bind(ANDOS_FB);
    ANDOS_FB.applyRequest = function (e) {
      var out = orig(e);
      try {
        if (e && (e.status === 'failed' || e.status === 'refunded')) {
          markLocalTxnsFailed(e);
          addLocalRefund(e);
          try { if (typeof render === 'function') render(); } catch (err) {}
        }
      } catch (err) {}
      return out;
    };
    ANDOS_FB.applyRequest.__andosFailRefund = true;
    return true;
  }
  var n = 0, t = setInterval(function () { if (wrap() || ++n > 80) clearInterval(t); }, 100);
})();
