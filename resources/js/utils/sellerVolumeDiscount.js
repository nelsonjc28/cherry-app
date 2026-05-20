/**
 * Descuentos por volumen ($7k / $15k).
 * Con `volume_descuento1`/`volume_descuento2` desde la API (login/me): se usan esos %.
 * Sin descuento1 en el usuario: mismas reglas de elegibilidad que bronce para todos (≥ $7k o ventana 45 días)
 * y porcentajes 30 % + 10 % segundo tramo (sin usar categoría oro/diamante).
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

/** Oro o Diamante: pedido directo, anticipados y crédito (reglas premium). */
export function isOroDiamanteSeller(user) {
  const c = getSellerCategoryFromUser(user);
  return c === 'oro' || c === 'diamante';
}

/** La API / login expuso un descuento1 usable (> 0). */
export function hasApiVolumeMainPercent(user) {
  if (!user || typeof user !== 'object') return false;
  const raw = user.volume_descuento1 ?? user.volumeDescuento1;
  if (raw == null || raw === '') return false;
  const n = parseFloat(raw);
  return !Number.isNaN(n) && n > 0;
}

/**
 * Ventana temporal (45 días): bronze_benefit_active + benefit_expires_at, sin exigir categoría bronce.
 * Usada cuando no hay descuento1 en API: todos usan el mismo umbral que bronce.
 */
export function isVolumeBenefitWindowActive(user, now = new Date()) {
  if (!user?.bronze_benefit_active) return false;
  if (!user?.benefit_expires_at) return false;

  const expiresAt = new Date(user.benefit_expires_at);
  if (Number.isNaN(expiresAt.getTime())) return false;

  return now < expiresAt;
}

/**
 * @returns {{ mainRate: number, mainPercent: number }}
 */
export function getVolumeDiscountMainTier(user) {
  if (user && typeof user === 'object') {
    const raw = user.volume_descuento1 ?? user.volumeDescuento1;
    const n = parseFloat(raw);
    if (raw != null && raw !== '' && !Number.isNaN(n) && n > 0) {
      return { mainRate: n / 100, mainPercent: Math.round(n) };
    }
  }
  return { mainRate: 0.3, mainPercent: 30 };
}

/** Segundo tramo (% sobre neto tras el primero). API o 10 si no viene descuento2. */
export function getVolumeDiscountExtraPercent(user) {
  if (user && typeof user === 'object') {
    const raw = user.volume_descuento2 ?? user.volumeDescuento2;
    const n = parseFloat(raw);
    if (raw != null && raw !== '' && !Number.isNaN(n) && n >= 0) {
      return n;
    }
  }
  return 10;
}

export function isBronzeBenefitActive(user, now = new Date()) {
  const cat = getSellerCategoryFromUser(user);
  if (cat !== 'bronce') return false;
  return isVolumeBenefitWindowActive(user, now);
}

export function canApplyMainDiscount(user, eligibleTotal) {
  const total = Number(eligibleTotal || 0);
  if (total <= 0) return false;

  if (hasApiVolumeMainPercent(user)) {
    const cat = getSellerCategoryFromUser(user);
    if (cat !== 'bronce') return true;
    if (isBronzeBenefitActive(user)) return true;
    return total >= 7000;
  }

  if (isVolumeBenefitWindowActive(user)) return true;
  return total >= 7000;
}

export function getBronzeBenefitRemainingDays(user, now = new Date()) {
  if (!isBronzeBenefitActive(user, now)) return 0;
  const expiresAt = new Date(user.benefit_expires_at);
  const msLeft = expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
}
