/* Fail/refund from Telegram → Firestore requests.status=failed (refund:true). */
(function () {
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
            var amt = Number(e.amount || 0);
            var doRefund = e.refund !== false && amt > 0;
            if (doRefund && typeof saveWallet === 'function' && typeof wallet !== 'undefined') {
              saveWallet((Number(wallet) || 0) + amt);
              try { showToast('₹' + amt + ' wallet me refund ho gaya.', 'success'); } catch (err) {}
            } else {
              try { showToast('Request ' + (e.id || '') + ' failed.', 'error'); } catch (err) {}
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
