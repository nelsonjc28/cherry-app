/**
 * Compra mínima para ofertas product_discount y buy_x_get_y (subtotal de líneas elegibles).
 * Envío gratis usa su propio mínimo aparte — no pasa por aquí.
 */

export function getOfferMinPurchaseAmount(userOffer) {
  if (!userOffer?.min_purchase_amount) {
    return 0;
  }
  const amount = parseFloat(userOffer.min_purchase_amount);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

/** Clave de agrupación para líneas de la misma promoción. */
export function getOfferGroupKey(item) {
  const offer = item?.userOffer;
  if (!offer) {
    return null;
  }

  const offerId = offer.offer_id;
  if (offerId != null && offerId !== '') {
    return String(offerId);
  }

  const title = offer.title;
  const category = offer.discount_category;
  if (title && category) {
    return `${category}:${String(title).trim()}`;
  }

  return null;
}

export function getOfferGroupKeyFromOffer(userOffer) {
  if (!userOffer) {
    return null;
  }
  return getOfferGroupKey({ userOffer });
}

export function getListUnitPrice(item) {
  const listUnit = Number(item?.precio1 ?? item?.originalPrice ?? item?.price ?? item?.precio ?? 0);
  return Number.isFinite(listUnit) && listUnit > 0 ? listUnit : 0;
}

export function getListLineTotal(item) {
  const qty = Number(item?.quantity ?? 0) || 0;
  return getListUnitPrice(item) * qty;
}

export function getOfferUnitPrice(item) {
  const offerUnit = Number(item?.price ?? item?.precio ?? 0);
  return Number.isFinite(offerUnit) && offerUnit >= 0 ? offerUnit : 0;
}

/** Subtotal a precio lista de líneas que comparten la misma oferta. */
export function computeOfferSubtotals(items) {
  const totals = {};

  for (const item of items || []) {
    const key = getOfferGroupKey(item);
    if (!key) {
      continue;
    }

    const lineTotal = getListLineTotal(item);
    if (lineTotal <= 0) {
      continue;
    }

    totals[key] = (totals[key] || 0) + lineTotal;
  }

  return totals;
}

export function computeEligiblePromoSubtotal(items, userOffer) {
  const key = getOfferGroupKeyFromOffer(userOffer);
  if (!key) {
    return 0;
  }
  const totals = computeOfferSubtotals(items);
  return totals[key] || 0;
}

export function isOfferMinPurchaseMet(item, offerSubtotals) {
  const min = getOfferMinPurchaseAmount(item?.userOffer);
  if (min <= 0) {
    return true;
  }

  const key = getOfferGroupKey(item);
  if (!key) {
    return false;
  }

  return (offerSubtotals[key] || 0) >= min;
}

export function isPromoMinPurchaseMet(userOffer, items = []) {
  const min = getOfferMinPurchaseAmount(userOffer);
  if (min <= 0) {
    return true;
  }
  return computeEligiblePromoSubtotal(items, userOffer) >= min;
}

export function requiresMinPurchase(userOffer) {
  const category = userOffer?.discount_category;
  if (category === 'free_shipping' || category === 'order_discount') {
    return false;
  }
  return getOfferMinPurchaseAmount(userOffer) > 0;
}

/**
 * Precio unitario con descuento de producto (sin validar mínimo).
 */
export function calculateProductDiscountUnitPrice(originalPrice, userOffer) {
  const base = Number(originalPrice) || 0;
  if (base <= 0 || userOffer?.discount_category !== 'product_discount') {
    return base;
  }

  const discountValue = parseFloat(userOffer.discount_percentage) || 0;
  if (discountValue <= 0) {
    return base;
  }

  const discountType = userOffer.discount_type || userOffer.type || 'percentage';

  if (discountType === 'percentage') {
    const discount = (base * discountValue) / 100;
    let finalPrice = Math.max(0, base - discount);

    const maxDiscount = parseFloat(userOffer.max_discount_amount);
    if (Number.isFinite(maxDiscount) && maxDiscount > 0 && discount > maxDiscount) {
      finalPrice = Math.max(0, base - maxDiscount);
    }

    return finalPrice;
  }

  if (discountType === 'fixed') {
    return Math.max(0, base - discountValue);
  }

  return base;
}

/**
 * Precio unitario efectivo: aplica descuento solo si el subtotal elegible alcanza la compra mínima.
 */
export function resolveProductDiscountUnitPrice(originalPrice, userOffer, contextItems = []) {
  const base = Number(originalPrice) || 0;
  if (base <= 0 || userOffer?.discount_category !== 'product_discount') {
    return base;
  }

  if (!isPromoMinPurchaseMet(userOffer, contextItems)) {
    return base;
  }

  return calculateProductDiscountUnitPrice(base, userOffer);
}

/**
 * Porcentaje visual del descuento (0 si no aplica por compra mínima).
 */
export function resolveProductDiscountPercent(userOffer, contextItems = []) {
  if (userOffer?.discount_category !== 'product_discount') {
    return 0;
  }

  const raw = parseFloat(userOffer.discount_percentage) || 0;
  if (raw <= 0) {
    return 0;
  }

  if (!isPromoMinPurchaseMet(userOffer, contextItems)) {
    return 0;
  }

  const discountType = userOffer.discount_type || userOffer.type || 'percentage';
  if (discountType === 'percentage') {
    return Math.round(raw);
  }

  return raw;
}

/**
 * Precio de línea considerando compra mínima de la oferta (product_discount / buy_x_get_y).
 */
export function calculateItemPriceWithMinPurchase(item, allItems = []) {
  const items = Array.isArray(allItems) && allItems.length > 0 ? allItems : [item];
  const offerSubtotals = computeOfferSubtotals(items);
  const qty = Number(item?.quantity ?? 0) || 0;

  if (qty <= 0) {
    return 0;
  }

  const category = item?.userOffer?.discount_category;
  const minApplies = category === 'product_discount' || category === 'buy_x_get_y';
  const minMet = !minApplies || isOfferMinPurchaseMet(item, offerSubtotals);
  const listUnit = getListUnitPrice(item);

  if (item.isFreeItem) {
    if (!minMet) {
      return listUnit * qty;
    }
    return 0;
  }

  if (!minMet) {
    return listUnit * qty;
  }

  if (category === 'product_discount') {
    const discountedUnit = calculateProductDiscountUnitPrice(listUnit, item.userOffer);
    return discountedUnit * qty;
  }

  return getOfferUnitPrice(item) * qty;
}

export function formatMinPurchaseLabel(amount) {
  const n = parseFloat(amount);
  if (!Number.isFinite(n) || n <= 0) {
    return '';
  }
  return n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function formatMinPurchaseHint(userOffer) {
  const min = getOfferMinPurchaseAmount(userOffer);
  if (min <= 0 || userOffer?.discount_category === 'free_shipping') {
    return '';
  }
  return `Compra mínima $${formatMinPurchaseLabel(min)} en productos de esta promoción`;
}

/**
 * Líneas hipotéticas para evaluar mínimo en ficha de producto (carrito + selección actual).
 */
export function buildPromoContextItems(cartItems, userOffer, pendingLines = []) {
  const key = getOfferGroupKeyFromOffer(userOffer);
  if (!key) {
    return [...(pendingLines || [])];
  }

  const fromCart = (cartItems || []).filter((item) => getOfferGroupKey(item) === key);
  return [...fromCart, ...(pendingLines || [])];
}

/**
 * Alertas de carrito cuando falta monto para activar la promoción.
 */
export function buildOfferMinPurchaseAlerts(cartItems) {
  const alerts = [];
  const seen = new Set();
  const offerSubtotals = computeOfferSubtotals(cartItems);

  for (const item of cartItems || []) {
    const offer = item?.userOffer;
    const groupKey = getOfferGroupKey(item);
    const category = offer?.discount_category;

    if (!groupKey || seen.has(groupKey)) {
      continue;
    }
    if (category !== 'product_discount' && category !== 'buy_x_get_y') {
      continue;
    }

    const min = getOfferMinPurchaseAmount(offer);
    if (min <= 0) {
      continue;
    }

    seen.add(groupKey);
    const current = offerSubtotals[groupKey] || 0;

    if (current >= min) {
      continue;
    }

    const faltan = min - current;
    const title = offer?.title || 'Promoción';

    if (category === 'buy_x_get_y') {
      alerts.push({
        type: 'warning',
        icon: '🎁',
        color: '#EA2630',
        message: `${title}: agrega $${formatMinPurchaseLabel(faltan)} más en productos de esta promo para activar la oferta Buy X Get Y.`,
      });
    } else {
      alerts.push({
        type: 'warning',
        icon: '🏷️',
        color: '#EA2630',
        message: `${title}: agrega $${formatMinPurchaseLabel(faltan)} más en productos de esta promo para aplicar el descuento.`,
      });
    }
  }

  return alerts;
}
