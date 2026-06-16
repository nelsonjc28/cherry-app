import { formatBuyXGetYOfferLabel } from './buyXGetYUtils';

const BADGE_CATEGORIES = ['buy_x_get_y', 'order_discount', 'free_shipping'];

/**
 * Indica si el producto debe mostrar badge de oferta (prioridad sobre Nuevo/Agotado).
 */
export function hasCatalogOfferBadge({ discountPercentage = 0, hasUserOffer = false, userOffer = null } = {}) {
  if (discountPercentage > 0) {
    return true;
  }
  if (!hasUserOffer || !userOffer) {
    return false;
  }
  return BADGE_CATEGORIES.includes(userOffer.discount_category);
}

/**
 * Texto del badge de oferta en tarjetas y ficha de producto.
 */
export function getCatalogOfferBadgeLabel(userOffer, { discountPercentage = 0, isMobile = false } = {}) {
  if (userOffer?.discount_category === 'buy_x_get_y') {
    return formatBuyXGetYOfferLabel(userOffer.buy_quantity, userOffer.get_quantity);
  }
  if (userOffer?.discount_category === 'order_discount') {
    return `💰 Descuento en pedido ${Math.round(userOffer.discount_percentage)}%`;
  }
  if (userOffer?.discount_category === 'free_shipping') {
    return '🚚 Envío gratis';
  }
  if (userOffer?.discount_percentage > 0) {
    return `${!isMobile ? 'Rebaja ' : ''}${Math.round(userOffer.discount_percentage)}%`;
  }
  return `${!isMobile ? 'Rebaja ' : ''}${discountPercentage}%`;
}
