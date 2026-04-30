/**
 * Calle + números exterior/interior para UI (carrito, checkout, listados).
 * @param {Record<string, unknown>|null|undefined} addr
 * @returns {string}
 */
export function buildStreetWithNumbers(addr) {
  if (!addr) return '';
  const base = String(addr.street_address ?? '').trim();
  const extRaw = addr.street_number_ext != null ? String(addr.street_number_ext).trim() : '';
  const intRaw = addr.street_number_int != null ? String(addr.street_number_int).trim() : '';
  const ext = extRaw ? `Ext. ${extRaw}` : '';
  const intl = intRaw ? `Int. ${intRaw}` : '';
  const nums = [ext, intl].filter(Boolean).join(' · ');
  return nums ? `${base} ${nums}`.trim() : base;
}

/** Núm. exterior / interior: solo dígitos, máx. 20 (alineado a validación API). */
export function sanitizeStreetNumberDigits(value, maxLen = 20) {
  return String(value ?? '').replace(/\D/g, '').slice(0, maxLen);
}
