/**
 * Campos de línea de pedido para API (precios, rebaja catálogo y oferta de usuario).
 */
export function buildOrderLinePayload(item) {
  const offer = item?.userOffer;
  const applies = !!(offer && offer.discount_category);

  return {
    product_id: String(item.id_articulo || item.product_id || item.id),
    name: item.title || item.name,
    quantity: parseInt(item.quantity, 10),
    price: parseFloat(item.precio || item.price),
    size: item.selectedSize || null,
    color: item.selectedColor || null,
    barcode: item.barcode || null,
    detalle_id: item.detalle_id != null ? Number(item.detalle_id) : null,
    precio1: item.precio1 ?? item.originalPrice ?? null,
    desc_promo: item.desc_promo != null ? item.desc_promo : null,
    user_offer_applies: applies,
    offer_discount_percentage: applies ? (parseFloat(offer.discount_percentage) || 0) : null,
    offer_discount_type: applies ? (offer.discount_type || offer.type || 'percentage') : null,
    offer_discount_category: applies ? offer.discount_category : null,
  };
}
