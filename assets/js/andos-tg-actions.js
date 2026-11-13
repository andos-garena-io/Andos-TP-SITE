/* Fail from Telegram: mark order/txn FAILED. Wallet refund is server-side (tracker). */
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
        hit = true;
        l.status = 'failed';
        l.failReason = e.failReason || e.note || 'Failed';
        l.desc = String(l.desc || 'Payment').replace(/\s*·\s*FAILED$/i, '') + ' · FAILED';
      });
      if (hit) localStorage.setItem('andos_transactions', JSON.stringify(list.slice(0, 80)));
    } catch (err) {}
  }

  function wrap() {
    if (!window.ANDOS_FB || typeof ANDOS_FB.applyRequest !== 'function' || ANDOS_FB.applyRequest.__andosFailRefund) return false;
    var orig = ANDOS_FB.applyRequest.bind(ANDOS_FB);
    ANDOS_FB.applyRequest = function (e) {
      try {
        if (e && (e.status === 'failed' || e.status === 'refunded')) {
          var done = {};
          try { done = JSON.parse(localStorage.getItem('andos_requests_done') || '{}'); } catch (err) {}
          if (done[e.id] !== e.status) {
            done[e.id] = e.status;
            try { localStorage.setItem('andos_requests_done', JSON.stringify(done)); } catch (err) {}
            if (e.type === 'order' && e.orderId && typeof orders !== 'undefined' && orders && orders.length) {
              var ix = orders.findIndex(function (o) { return o.id === e.orderId; });
              if (ix !== -1) {
                orders[ix].status = 'failed';
                orders[ix].displayStatus = 'Failed';
                orders[ix].failReason = e.note || e.failReason || 'Failed';
                try { localStorage.setItem('andos_orders', JSON.stringify(orders)); } catch (err) {}
                try { ANDOS_FB.saveOrder(orders[ix]); } catch (err) {}
              }
            }
            markLocalTxnsFailed(e);
            var amt = Number(e.refundAmount || e.amount || 0);
            if (e.refund && amt > 0) {
              try { showToast('Order failed · ₹' + amt + ' wallet me refund ho raha hai.', 'success'); } catch (err) {}
            } else {
              try { showToast('Request ' + (e.id || '') + ' FAILED.', 'error'); } catch (err) {}
            }
            try { if (typeof render === 'function') render(); } catch (err) {}
          }
        }
      } catch (err) {}
      return orig(e);
    };
    ANDOS_FB.applyRequest.__andosFailRefund = true;
    return true;
  }
  var n = 0, t = setInterval(function () { if (wrap() || ++n > 80) clearInterval(t); }, 100);
})();
