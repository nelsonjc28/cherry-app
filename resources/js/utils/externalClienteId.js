/**
 * Mismo formato que la API de ventas / clientes externos ({@see ExternalSalesService::prepareClienteData}).
 * @param {number|string|null|undefined} userId
 * @returns {string}
 */
export function formatExternalClienteId(userId) {
  if (userId === null || userId === undefined || userId === '') {
    return '';
  }
  return `DM${String(userId).padStart(5, '0')}`;
}
