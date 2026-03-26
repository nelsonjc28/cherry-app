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

export function isBronzeBenefitActive(user, now = new Date()) {
  const cat = getSellerCategoryFromUser(user);
  if (cat !== 'bronce') return false;
  if (!user?.bronze_benefit_active) return false;
  if (!user?.benefit_expires_at) return false;

  const expiresAt = new Date(user.benefit_expires_at);
  if (Number.isNaN(expiresAt.getTime())) return false;

  return now < expiresAt;
}

export function canApplyMainDiscount(user, eligibleTotal) {
  const cat = getSellerCategoryFromUser(user);
  const total = Number(eligibleTotal || 0);
  if (total <= 0) return false;

  if (cat === 'bronce') {
    if (isBronzeBenefitActive(user)) return true;
    return total >= 7000;
  }

  return true;
}

export function getBronzeBenefitRemainingDays(user, now = new Date()) {
  if (!isBronzeBenefitActive(user, now)) return 0;
  const expiresAt = new Date(user.benefit_expires_at);
  const msLeft = expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
}
