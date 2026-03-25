/**
 * Descuentos por volumen ($7k / $15k): diamante 33% + 10% sobre remanente; oro y demás no-diamante 30% + 10%.
 */

export function normalizeSellerCategory(raw) {
  if (raw == null || raw === '') return null;
  let s = String(raw).trim().toLowerCase();
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, '');
  if (s === 'diamante' || s === 'diamond') return 'diamante';
  if (s === 'oro' || s === 'gold') return 'oro';
  if (s === 'bronce' || s === 'bronze') return 'bronce';
  return s;
}

/** Obtiene seller_category desde el objeto usuario (snake o camelCase). */
export function getSellerCategoryFromUser(user) {
  if (!user || typeof user !== 'object') return null;
  const v = user.seller_category ?? user.sellerCategory;
  return normalizeSellerCategory(v);
}

/**
 * @returns {{ mainRate: number, mainPercent: number }}
 */
export function getVolumeDiscountMainTier(user) {
  const cat = getSellerCategoryFromUser(user);
  if (cat === 'diamante') {
    return { mainRate: 0.33, mainPercent: 33 };
  }
  // oro, bronce, invitado u otros: primer tramo 30% (API externa: descuento1 = 30 o 33; 0 si no aplica)
  return { mainRate: 0.3, mainPercent: 30 };
}
