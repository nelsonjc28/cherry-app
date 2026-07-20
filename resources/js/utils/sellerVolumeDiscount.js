/**
 * Descuentos por volumen.
 *
 * Bronce (regla acordada por piezas, NO por monto):
 *   - Primera compra: 12 piezas sin `desc_promo` y sin oferta de usuario → 30 % + 10 %.
 *   - Compras posteriores: 6 piezas sin `desc_promo` y sin oferta de usuario → 30 %.
 *   - Bajo el umbral: 0 % y retiro en tienda obligatorio (frontend bloquea envío).
 *   - Bronce NO consulta la API de descuentos del cliente.
 *
 * Oro / Diamante: siguen usando la API externa del cliente (descuento1 / descuento2)
 *   o el fallback de 30 % + 10 % por monto.
 */

export const BRONZE_PIECES_FIRST_PURCHASE = 12;
export const BRONZE_PIECES_AFTER_FIRST = 6;
export const BRONZE_FIRST_TIER_PERCENT = 30;
export const BRONZE_SECOND_TIER_PERCENT = 10;

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

/** Oro o Diamante: rebaja catálogo completa, pedido directo, anticipados y crédito. */
export function isOroDiamanteSeller(user) {
  const c = getSellerCategoryFromUser(user);
  return c === 'oro' || c === 'diamante';
}

/** Alias semántico de isOroDiamanteSeller (Oro + Diamante = premium). */
export const isPremiumSeller = isOroDiamanteSeller;

export function isBronzeSeller(user) {
  return getSellerCategoryFromUser(user) === 'bronce';
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
 * Solo se usa para oro/diamante sin descuento1 desde API.
 */
export function isVolumeBenefitWindowActive(user, now = new Date()) {
  if (!user?.bronze_benefit_active) return false;
  if (!user?.benefit_expires_at) return false;

  const expiresAt = new Date(user.benefit_expires_at);
  if (Number.isNaN(expiresAt.getTime())) return false;

  return now < expiresAt;
}

export function hasCompletedFirstPurchase(user) {
  return Boolean(user?.first_purchase_completed_at);
}

/** Bronce: umbral de piezas requerido (primera compra o posterior). */
export function bronzeShippingPiecesThreshold(user) {
  return hasCompletedFirstPurchase(user)
    ? BRONZE_PIECES_AFTER_FIRST
    : BRONZE_PIECES_FIRST_PURCHASE;
}

/**
 * Indica si el cliente bronce cumple el mínimo de piezas para envío a domicilio.
 * Si retorna false, la UI debe ocultar la opción de "Envío a domicilio".
 */
export function bronzeCanShip(user, eligiblePieces) {
  if (!isBronzeSeller(user)) return true;
  const pieces = Number(eligiblePieces || 0);
  if (pieces <= 0) return false;
  return pieces >= bronzeShippingPiecesThreshold(user);
}

/**
 * Bronce: aplica el primer tramo (30 %) solo si alcanza el umbral de piezas.
 */
export function shouldApplyBronzeMainDiscount(user, eligiblePieces) {
  if (!isBronzeSeller(user)) return false;
  const pieces = Number(eligiblePieces || 0);
  if (pieces <= 0) return false;
  return pieces >= bronzeShippingPiecesThreshold(user);
}

/**
 * Bronce: aplica el segundo tramo (10 %) solo en la primera compra con 12+ piezas.
 */
export function shouldApplyBronzeSecondTier(user, eligiblePieces) {
  if (!isBronzeSeller(user)) return false;
  if (hasCompletedFirstPurchase(user)) return false;
  const pieces = Number(eligiblePieces || 0);
  return pieces >= BRONZE_PIECES_FIRST_PURCHASE;
}

/**
 * Porcentaje del primer tramo:
 * - Bronce: 30 si alcanza el umbral; 0 si no.
 * - Oro/Diamante: API si viene; 30 por defecto.
 */
export function getVolumeDiscountMainTier(user) {
  if (isBronzeSeller(user)) {
    return { mainRate: 0.3, mainPercent: BRONZE_FIRST_TIER_PERCENT };
  }
  if (user && typeof user === 'object') {
    const raw = user.volume_descuento1 ?? user.volumeDescuento1;
    const n = parseFloat(raw);
    if (raw != null && raw !== '' && !Number.isNaN(n) && n > 0) {
      return { mainRate: n / 100, mainPercent: Math.round(n) };
    }
  }
  return { mainRate: 0.3, mainPercent: 30 };
}

/**
 * Segundo tramo (% sobre neto tras el primero):
 * - Bronce: 10 solo en primera compra; 0 después.
 * - Oro/Diamante: API si viene; 10 por defecto.
 */
export function getVolumeDiscountExtraPercent(user, eligiblePieces) {
  if (isBronzeSeller(user)) {
    return shouldApplyBronzeSecondTier(user, eligiblePieces) ? BRONZE_SECOND_TIER_PERCENT : 0;
  }
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

/**
 * Aplica el primer tramo (30 %)?
 * - Bronce: por piezas (no monto).
 * - Oro/Diamante: por monto elegible; si la API trae descuento1, se aplica; sin API, ≥ $7k o 45 días.
 *
 * `eligibleTotal` se mantiene por compatibilidad, pero para bronce se ignora.
 */
export function canApplyMainDiscount(user, eligibleTotal, eligiblePieces) {
  if (isBronzeSeller(user)) {
    return shouldApplyBronzeMainDiscount(user, eligiblePieces);
  }

  const total = Number(eligibleTotal || 0);
  if (total <= 0) return false;

  if (hasApiVolumeMainPercent(user)) {
    return true;
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
