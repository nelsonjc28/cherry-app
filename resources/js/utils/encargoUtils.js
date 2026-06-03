import { isOroDiamanteSeller } from './sellerVolumeDiscount';

/** Línea de carrito: Próximamente o Agotado (encargo Oro/Diamante). */
export function isEncargoCartLine(item) {
  if (!item) return false;
  return item.isComingSoon === true || item.isOutOfStockEncargo === true;
}

/** Oro/Diamante puede encargar sin stock a nivel producto (Próximamente o Agotado). */
export function canEncargoSinStock(user, inventoryStatusKind) {
  if (!user || !isOroDiamanteSeller(user)) return false;
  return inventoryStatusKind === 'coming-soon' || inventoryStatusKind === 'out-of-stock';
}

/**
 * Oro/Diamante puede encargar esta talla/color: producto próximamente/agotado
 * o producto en stock pero esa variante sin inventario.
 */
export function canEncargoForSize(user, inventoryStatusKind, sizeStock) {
  if (!user || !isOroDiamanteSeller(user)) return false;
  if (inventoryStatusKind === 'coming-soon' || inventoryStatusKind === 'out-of-stock') {
    return true;
  }
  return Number(sizeStock) <= 0;
}

/** Flag isOutOfStockEncargo para la línea (no aplica a Próximamente). */
export function isOutOfStockEncargoForSize(user, inventoryStatusKind, sizeStock) {
  if (!user || !isOroDiamanteSeller(user)) return false;
  if (inventoryStatusKind === 'coming-soon') return false;
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
