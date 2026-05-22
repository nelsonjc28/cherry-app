/**
 * Misma regla que admin (reenvío API): pedido directo, anticipado, pagado
 * o ya registrado en la API externa. Excluye MP/crédito sin liquidar.
 */
export function orderQualifiesForExternalApi(order) {
  if (!order) return false;
  return Boolean(order.should_send_to_external_api || order.external_api_sent);
}

export function ordersQualifyForExternalApi(orders) {
  return Array.isArray(orders) && orders.some(orderQualifiesForExternalApi);
}
