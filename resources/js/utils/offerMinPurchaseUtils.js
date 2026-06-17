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

/** Rebaja de catálogo (desc_promo) sobre precio lista; regla -10 pts de API externa. */
export function getCatalogRebajaPercent(item) {
  const descPromo = parseFloat(item?.desc_promo ?? item?.descPromo ?? 0);
  if (Number.isFinite(descPromo) && descPromo > 0.0001) {
    return Math.max(0, descPromo - 10);
  }
  return 0;
}

/** Precio unitario solo con rebaja de catálogo (sin oferta personalizada). */
export function getCatalogDiscountedUnitPrice(listUnit, item) {
  const base = Number(listUnit) || 0;
  if (base <= 0) {
    return 0;
  }
  const pct = getCatalogRebajaPercent(item);
  if (pct <= 0) {
    return base;
  }
  return Math.max(0, base * (1 - pct / 100));
}

/**
 * Monto del descuento de oferta product_discount sobre precio lista (adicional a rebaja catálogo).
 */
export function getOfferDiscountAmountOnList(listUnit, userOffer) {
  const base = Number(listUnit) || 0;
  if (base <= 0 || userOffer?.discount_category !== 'product_discount') {
    return 0;
  }

  const discountValue = parseFloat(userOffer.discount_percentage) || 0;
  if (discountValue <= 0) {
    return 0;
  }

  const discountType = userOffer.discount_type || userOffer.type || 'percentage';

  if (discountType === 'percentage') {
    let amount = (base * discountValue) / 100;
    const maxDiscount = parseFloat(userOffer.max_discount_amount);
    if (Number.isFinite(maxDiscount) && maxDiscount > 0) {
      amount = Math.min(amount, maxDiscount);
    }
    return amount;
  }

  if (discountType === 'fixed') {
    return Math.min(discountValue, base);
  }

  return 0;
}

/**
 * Precio unitario: rebaja catálogo + oferta product_discount (suma % o suma $ sobre lista).
 */
export function resolveStackedProductDiscountUnitPrice(listUnit, item, userOffer, contextItems = []) {
  const list = Number(listUnit) || 0;
  if (list <= 0) {
    return 0;
  }

  const catalogPct = getCatalogRebajaPercent(item);
  const catalogUnit = getCatalogDiscountedUnitPrice(list, item);

  if (!userOffer || userOffer.discount_category !== 'product_discount') {
    return catalogUnit;
  }

  if (!isPromoMinPurchaseMet(userOffer, contextItems)) {
    return catalogUnit;
  }

  const addon = getOfferDiscountAmountOnList(list, userOffer);
  return Math.max(0, list - (list * catalogPct) / 100 - addon);
}

/** % efectivo total sobre precio lista (rebaja + oferta si aplica). */
export function resolveStackedProductDiscountPercent(item, userOffer, contextItems = []) {
  const listUnit = getListUnitPrice(item);
  if (listUnit <= 0) {
    return 0;
  }
  const finalUnit = resolveStackedProductDiscountUnitPrice(listUnit, item, userOffer, contextItems);
  return Math.round((1 - finalUnit / listUnit) * 100);
}

/**
 * % para badge: suma literal si oferta es % (50+10=60); si es $, % efectivo.
 */
export function resolveStackedProductDiscountPercentLiteral(item, userOffer, contextItems = []) {
  const catalogPct = getCatalogRebajaPercent(item);

  if (!userOffer || userOffer.discount_category !== 'product_discount') {
    return Math.round(catalogPct);
  }

  if (!isPromoMinPurchaseMet(userOffer, contextItems)) {
    return Math.round(catalogPct);
  }

  const discountType = userOffer.discount_type || userOffer.type || 'percentage';
  if (discountType === 'percentage') {
    const offerPct = parseFloat(userOffer.discount_percentage) || 0;
    return Math.round(catalogPct + offerPct);
  }

  return resolveStackedProductDiscountPercent(item, userOffer, contextItems);
}

/**
 * Precios de catálogo/ficha con rebaja apilada (solo product_discount).
 */
export function applyStackedProductDiscountPricing(product, userOffer, contextItems = []) {
  const rawBase = product?.precio1 ?? product?.precio ?? product?.originalPrice ?? product?.price ?? 0;
  const listUnit = typeof rawBase === 'string'
    ? parseFloat(rawBase.replace(/[^\d.-]/g, '')) || 0
    : parseFloat(rawBase) || 0;

  const item = { ...product, precio1: listUnit };
  const catalogPct = getCatalogRebajaPercent(item);
  const minPurchase = getOfferMinPurchaseAmount(userOffer);

  let finalPrice = listUnit;
  let visualDiscount = Math.round(catalogPct);
  let showPriceDiscount = catalogPct > 0;

  if (userOffer?.discount_category === 'product_discount') {
    const promoApplies = minPurchase <= 0 || isPromoMinPurchaseMet(userOffer, contextItems);
    finalPrice = resolveStackedProductDiscountUnitPrice(listUnit, item, userOffer, contextItems);
    visualDiscount = promoApplies
      ? resolveStackedProductDiscountPercentLiteral(item, userOffer, contextItems)
      : Math.round(catalogPct);
    showPriceDiscount = finalPrice < listUnit;
  }

  return {
    listUnit,
    finalPrice,
    visualDiscount,
    showPriceDiscount,
    originalPrice: showPriceDiscount && finalPrice < listUnit ? listUnit : product?.originalPrice,
  };
}

/**
 * Precio unitario con descuento de oferta sola (sin rebaja catálogo; legacy / sin item).
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
 * Precio unitario efectivo: rebaja catálogo + oferta si cumple compra mínima.
 */
export function resolveProductDiscountUnitPrice(originalPrice, userOffer, contextItems = [], item = null) {
  const listUnit = Number(originalPrice) || 0;
  const stackItem = item ?? { precio1: listUnit, desc_promo: 0 };
  return resolveStackedProductDiscountUnitPrice(listUnit, stackItem, userOffer, contextItems);
}

/**
 * Porcentaje visual del descuento apilado (0 extra si no aplica por compra mínima).
 */
export function resolveProductDiscountPercent(userOffer, contextItems = [], item = null) {
  if (userOffer?.discount_category !== 'product_discount') {
    return 0;
  }

  const stackItem = item ?? { precio1: 0, desc_promo: 0 };
  return resolveStackedProductDiscountPercentLiteral(stackItem, userOffer, contextItems);
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
    if (category === 'product_discount') {
      return getCatalogDiscountedUnitPrice(listUnit, item) * qty;
    }
    return listUnit * qty;
  }

  if (category === 'product_discount') {
    const unit = resolveStackedProductDiscountUnitPrice(listUnit, item, item.userOffer, items);
    return unit * qty;
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

function formatOfferFixedAmount(amount) {
  const n = parseFloat(amount);
  if (!Number.isFinite(n) || n <= 0) {
    return '';
  }
  return `$${formatMinPurchaseLabel(n)}`;
}

/**
 * Texto del badge para product_discount con rebaja catálogo + oferta apilada.
 * Con compra mínima: desglosa (ej. "50% + 5%"). Sin mínimo: suma (ej. "55%").
 */
export function formatProductDiscountBadgeLabel(item, userOffer) {
  const catalogPct = Math.round(getCatalogRebajaPercent(item));
  const hasMin = getOfferMinPurchaseAmount(userOffer) > 0;
  const discountType = userOffer?.discount_type || userOffer?.type || 'percentage';
  const offerValue = parseFloat(userOffer?.discount_percentage) || 0;

  if (offerValue <= 0) {
    return catalogPct > 0 ? `${catalogPct}%` : '';
  }

  if (catalogPct <= 0) {
    if (discountType === 'fixed') {
      return formatOfferFixedAmount(offerValue);
    }
    return `${Math.round(offerValue)}%`;
  }

  if (discountType === 'fixed') {
    const fixedLabel = formatOfferFixedAmount(offerValue);
    if (hasMin) {
      return `${catalogPct}% + ${fixedLabel}`;
    }
    const listUnit = getListUnitPrice(item);
    const addonPct = listUnit > 0 ? Math.round((offerValue / listUnit) * 100) : 0;
    return `${catalogPct + addonPct}%`;
  }

  const offerPct = Math.round(offerValue);
  if (hasMin) {
    return `${catalogPct}% + ${offerPct}%`;
  }
  return `${catalogPct + offerPct}%`;
}

/**
 * Explicación en ficha cuando hay rebaja catálogo + oferta con compra mínima.
 */
export function formatProductDiscountOfferDetail(item, userOffer) {
  if (userOffer?.discount_category !== 'product_discount') {
    return '';
  }

  const catalogPct = Math.round(getCatalogRebajaPercent(item));
  const min = getOfferMinPurchaseAmount(userOffer);
  const offerValue = parseFloat(userOffer.discount_percentage) || 0;
  const discountType = userOffer.discount_type || userOffer.type || 'percentage';

  if (offerValue <= 0 && min <= 0) {
    return '';
  }

  const minPhrase = min > 0
    ? `al alcanzar la compra mínima de $${formatMinPurchaseLabel(min)} en productos de esta promoción`
    : '';

  if (catalogPct > 0 && offerValue > 0 && min > 0) {
    if (discountType === 'percentage') {
      const offerPct = Math.round(offerValue);
      return `Este producto ya incluye ${catalogPct}% de rebaja. El ${offerPct}% adicional de esta promoción se activa ${minPhrase} (total ${catalogPct + offerPct}%).`;
    }
    return `Este producto ya incluye ${catalogPct}% de rebaja. El descuento adicional de ${formatOfferFixedAmount(offerValue)} se activa ${minPhrase}.`;
  }

  if (min > 0) {
    return formatMinPurchaseHint(userOffer);
  }

  return '';
}

/**
 * % de descuento a mostrar en líneas del carrito (rebaja catálogo + oferta apilada).
 */
export function resolveCartGroupedDiscountPercent(groupedProduct, cartItems = []) {
  if (!groupedProduct) {
    return 0;
  }

  const repItem = {
    desc_promo: groupedProduct.desc_promo,
    precio1: groupedProduct.precio1 ?? groupedProduct.originalPrice,
    originalPrice: groupedProduct.originalPrice,
    precio: groupedProduct.precio,
    price: groupedProduct.precio,
    userOffer: groupedProduct.userOffer,
    discount: groupedProduct.discount,
  };

  const totalQty = Number(groupedProduct.totalQuantity ?? 0) || 0;
  const totalPaid = Number(groupedProduct.totalPrice ?? 0) || 0;
  const listUnit = getListUnitPrice(repItem);

  if (repItem.userOffer?.discount_category === 'product_discount') {
    return resolveStackedProductDiscountPercentLiteral(repItem, repItem.userOffer, cartItems);
  }

  if (repItem.userOffer?.discount_category === 'buy_x_get_y') {
    const totalList = listUnit * totalQty;
    if (totalList > 0 && totalPaid < totalList) {
      return Math.round((1 - totalPaid / totalList) * 100);
    }
    return 0;
  }

  const catalogPct = getCatalogRebajaPercent(repItem);
  if (catalogPct > 0) {
    return Math.round(catalogPct);
  }

  const totalList = listUnit * totalQty;
  if (totalList > 0 && totalPaid > 0 && totalPaid < totalList) {
    return Math.round((1 - totalPaid / totalList) * 100);
  }

  const stored = parseFloat(groupedProduct.discount);
  if (Number.isFinite(stored) && stored > 0) {
    return Math.round(stored);
  }

  return 0;
}

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
