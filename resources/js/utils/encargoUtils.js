import { isOroDiamanteSeller } from './sellerVolumeDiscount';

/** Rebaja de catálogo externo (desc_promo > 0). No aplica a ofertas personalizadas del admin. */
export function productHasExternalRebaja(productOrDescPromo) {
  if (productOrDescPromo == null) {
    return false;
  }
  if (typeof productOrDescPromo === 'number' || typeof productOrDescPromo === 'string') {
    return parseFloat(productOrDescPromo) > 0.00001;
  }
  const raw = productOrDescPromo.desc_promo ?? productOrDescPromo.descPromo ?? 0;

  return parseFloat(raw) > 0.00001;
}

/** Línea de carrito: Próximamente o Agotado (encargo Oro/Diamante). */
export function isEncargoCartLine(item) {
  if (!item) return false;
  return item.isComingSoon === true || item.isOutOfStockEncargo === true;
}

/** Oro/Diamante puede encargar sin stock a nivel producto (Próximamente o Agotado). */
export function canEncargoSinStock(user, inventoryStatusKind, productOrDescPromo = null) {
  if (!user || !isOroDiamanteSeller(user)) return false;
  if (inventoryStatusKind === 'out-of-stock' && productHasExternalRebaja(productOrDescPromo)) {
    return false;
  }
  return inventoryStatusKind === 'coming-soon' || inventoryStatusKind === 'out-of-stock';
}

/**
 * Oro/Diamante puede encargar esta talla/color: producto próximamente/agotado
 * o producto en stock pero esa variante sin inventario.
 * Rebaja (desc_promo > 0) agotada: no encargo.
 */
export function canEncargoForSize(user, inventoryStatusKind, sizeStock, productOrDescPromo = null) {
  if (!user || !isOroDiamanteSeller(user)) return false;

  const sizeEmpty = Number(sizeStock) <= 0;
  if (productHasExternalRebaja(productOrDescPromo) && (inventoryStatusKind === 'out-of-stock' || sizeEmpty)) {
    return false;
  }

  if (inventoryStatusKind === 'coming-soon' || inventoryStatusKind === 'out-of-stock') {
    return true;
  }
  return sizeEmpty;
}

/** Flag isOutOfStockEncargo para la línea (no aplica a Próximamente). */
export function isOutOfStockEncargoForSize(user, inventoryStatusKind, sizeStock, productOrDescPromo = null) {
  if (!user || !isOroDiamanteSeller(user)) return false;
  if (inventoryStatusKind === 'coming-soon') return false;
  if (!canEncargoForSize(user, inventoryStatusKind, sizeStock, productOrDescPromo)) return false;
  if (inventoryStatusKind === 'out-of-stock') return true;
  return Number(sizeStock) <= 0;
}

/** Flags para API de pedidos. */
export function cartLineToApiEncargoFlags(item) {
  return {
    is_coming_soon: item?.isComingSoon === true,
    is_out_of_stock_encargo: item?.isOutOfStockEncargo === true,
  };
}

/** Omite validateStock en checkout si es línea de encargo y usuario premium. */
export function itemSkipsStockValidation(item, user) {
  return isEncargoCartLine(item) && isOroDiamanteSeller(user);
}
