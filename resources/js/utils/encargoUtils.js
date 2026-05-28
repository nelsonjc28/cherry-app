import { isOroDiamanteSeller } from './sellerVolumeDiscount';

/** Línea de carrito: Próximamente o Agotado (encargo Oro/Diamante). */
export function isEncargoCartLine(item) {
  if (!item) return false;
  return item.isComingSoon === true || item.isOutOfStockEncargo === true;
}

/** Oro/Diamante puede encargar sin stock (Próximamente o Agotado). */
export function canEncargoSinStock(user, inventoryStatusKind) {
  if (!user || !isOroDiamanteSeller(user)) return false;
  return inventoryStatusKind === 'coming-soon' || inventoryStatusKind === 'out-of-stock';
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
