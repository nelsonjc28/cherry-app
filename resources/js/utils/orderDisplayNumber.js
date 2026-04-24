/**
 * Número de pedido: PD si anticipo, oro/diamante (misma regla que backend) o order_number_prefix del API. CD en otro caso.
 * @param {object} order
 * @param {{ isViewerOroDiamante?: boolean }} [opts] Si el comprador de la vista es oro/diamante (p. ej. "mis pedidos") y falta `order_number_prefix` en caché.
 * @returns {string} 'PD' | 'CD'
 */
export function getOrderNumberPrefixForDisplay(order, opts = {}) {
  if (order?.order_number_prefix != null && order.order_number_prefix !== '') {
    const p = String(order.order_number_prefix).toUpperCase();
    return p === 'PD' ? 'PD' : 'CD';
  }
  if (order?.is_advance_order) {
    return 'PD';
  }
  if (opts.isViewerOroDiamante) {
    return 'PD';
  }
  return 'CD';
}

/**
 * Mismo número que la API de ventas (prefijo de 2 letras + id con ceros, 4 dígitos).
 * @param {object} order
 * @param {{ isViewerOroDiamante?: boolean }} [opts]
 */
export function formatOrderNumberDisplay(order, opts) {
  const prefix = getOrderNumberPrefixForDisplay(order, opts);
  const orderId = order.id || parseInt(order.orderNumber, 10) || 0;
  return prefix + String(orderId).padStart(4, '0');
}
