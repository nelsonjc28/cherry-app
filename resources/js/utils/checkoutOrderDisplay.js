function num(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

/** Fecha local en formato dd/mm/yyyy */
export function formatOrderDate(isoOrString) {
  if (isoOrString == null || isoOrString === '') return '—';
  const d = new Date(isoOrString);
  if (Number.isNaN(d.getTime())) return String(isoOrString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Total mostrado al cliente (con descuentos y envío según la orden).
 */
export function getOrderDisplayTotal(order, orderInfoFallback) {
  if (!order && orderInfoFallback) {
    const t = num(orderInfoFallback.totalAmount ?? orderInfoFallback.total);
    if (t != null && t > 0) return t;
    return 0;
  }
  if (!order) return 0;

  let t = num(order.total_amount);
  if (t != null && t > 0) return t;

  const disc = num(order.discounted_total);
  const ship = num(order.shipping_amount) ?? 0;
  if (disc != null && disc >= 0) {
    const sum = disc + ship;
    if (sum > 0) return sum;
  }

  if (Array.isArray(order.items) && order.items.length > 0) {
    const sumItems = order.items.reduce((acc, it) => {
      const st = num(it.subtotal);
      if (st != null && st > 0) return acc + st;
      const p = num(it.price) ?? 0;
      const q = num(it.quantity) ?? 0;
      return acc + p * q;
    }, 0);
    if (sumItems > 0) return sumItems + ship;
  }

  const credit = num(order.credit_used);
  const pending = num(order.amount_pending) ?? 0;
  if (credit != null && credit > 0) {
    return credit + (pending > 0 ? pending : 0);
  }

  const sub = num(order.subtotal);
  if (sub != null && sub > 0) return sub + ship;

  if (orderInfoFallback) {
    const fb = num(orderInfoFallback.totalAmount ?? orderInfoFallback.total);
    if (fb != null && fb > 0) return fb;
  }

  return t ?? 0;
}
