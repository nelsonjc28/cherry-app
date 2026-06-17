/**
 * Desglose tipo factura: prendas de línea (elegibles a volumen) vs prendas en oferta.
 * Alineado con {@see summarizeVolumeFromPricingLines} y precios de {@see calculateItemPrice}.
 */

import { cartItemToPricingLine, discountedMerchandiseForSubset } from './cartVolumePricing';
import { calculateItemPrice, getPaidQuantity } from '../store/cartStore';
import {
  getCatalogDiscountedUnitPrice,
  getListUnitPrice,
  getOfferGroupKey,
  isPromoMinPurchaseMet,
} from './offerMinPurchaseUtils';

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/** Productos que sí entran al descuento por volumen (sin rebaja catálogo ni oferta de usuario). */
export function isVolumeEligibleCartItem(item) {
  const d = item?.desc_promo;
  if (d != null && parseFloat(d) > 0.0001) {
    return false;
  }
  if (item?.userOffer?.discount_category) {
    return false;
  }
  return true;
}

/** Descuentos de ofertas product_discount agrupados por promoción (sobre importe ya rebajado). */
export function computeCartOfferDiscountLines(cartItems) {
  const byKey = {};

  for (const it of cartItems || []) {
    const offer = it?.userOffer;
    if (offer?.discount_category !== 'product_discount') {
      continue;
    }
    if (!isPromoMinPurchaseMet(offer, cartItems)) {
      continue;
    }

    const qty = getPaidQuantity(it) > 0 ? getPaidQuantity(it) : parseInt(it.quantity, 10) || 0;
    if (qty <= 0) {
      continue;
    }

    const listUnit = getListUnitPrice(it);
    const catalogUnit = getCatalogDiscountedUnitPrice(listUnit, it);
    const catalogLine = round2(catalogUnit * qty);
    const finalLine = round2(calculateItemPrice(it, cartItems));
    const saving = round2(Math.max(0, catalogLine - finalLine));
    if (saving <= 0.0001) {
      continue;
    }

    const key = getOfferGroupKey(it) || `offer:${offer.title || 'promo'}`;
    if (!byKey[key]) {
      byKey[key] = { title: offer.title || 'Oferta', amount: 0 };
    }
    byKey[key].amount = round2(byKey[key].amount + saving);
  }

  return Object.values(byKey).filter((row) => row.amount > 0.0001);
}

/**
 * @param {object | null} user
 * @param {object[]} cartItems
 * @param {object} volSummary - resultado de {@link summarizeVolumeFromCartItems}
 */
export function buildCartAmountBreakdown(user, cartItems, volSummary) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return {
      linePieces: 0,
      promoPieces: 0,
      lineSubtotal: 0,
      discountVolumeMain: 0,
      discountVolumeExtra: 0,
      lineNet: 0,
      promoListSubtotal: 0,
      promoCatalogSubtotal: 0,
      promoCartSubtotal: 0,
      promoSavings: 0,
      offerDiscountLines: [],
      totalPieces: 0,
    };
  }

  const u = user && typeof user === 'object' ? user : {};
  const v = volSummary && typeof volSummary === 'object' ? volSummary : { eligible_total: 0, vol_main: 0, vol_extra: 0 };

  const allLines = cartItems.map(cartItemToPricingLine);
  const lineItems = cartItems.filter(isVolumeEligibleCartItem);
  const promoItems = cartItems.filter((it) => !isVolumeEligibleCartItem(it));

  const linePieces = lineItems.reduce((s, it) => s + (parseInt(it.quantity, 10) || 0), 0);
  const promoPieces = promoItems.reduce((s, it) => s + (parseInt(it.quantity, 10) || 0), 0);

  const lineSubtotal = round2(v.eligible_total);
  const discountVolumeMain = round2(v.vol_main);
  const discountVolumeExtra = round2(v.vol_extra);

  const lineLines = lineItems.map(cartItemToPricingLine);
  const lineNet = lineLines.length
    ? discountedMerchandiseForSubset(u, allLines, lineLines)
    : 0;

  let promoListSubtotal = 0;
  let promoCatalogSubtotal = 0;
  let promoCartSubtotal = 0;
  for (const it of promoItems) {
    promoCartSubtotal += round2(calculateItemPrice(it, cartItems));
    const q = getPaidQuantity(it) > 0 ? getPaidQuantity(it) : parseInt(it.quantity, 10) || 0;
    const listUnit = getListUnitPrice(it);
    if (Number.isFinite(listUnit) && listUnit > 0) {
      promoListSubtotal += round2(listUnit * q);
      promoCatalogSubtotal += round2(getCatalogDiscountedUnitPrice(listUnit, it) * q);
    }
  }
  promoListSubtotal = round2(promoListSubtotal);
  promoCatalogSubtotal = round2(promoCatalogSubtotal);
  promoCartSubtotal = round2(promoCartSubtotal);
  if (promoPieces > 0 && promoListSubtotal < 0.01 && promoCartSubtotal > 0) {
    promoListSubtotal = round2(promoCartSubtotal);
    promoCatalogSubtotal = round2(promoCartSubtotal);
  }
  const promoSavings = round2(Math.max(0, promoListSubtotal - promoCatalogSubtotal));
  const offerDiscountLines = computeCartOfferDiscountLines(cartItems);

  return {
    linePieces,
    promoPieces,
    lineSubtotal,
    discountVolumeMain,
    discountVolumeExtra,
    lineNet: round2(lineNet),
    promoListSubtotal,
    promoCatalogSubtotal,
    promoCartSubtotal,
    promoSavings,
    offerDiscountLines,
    totalPieces: linePieces + promoPieces,
  };
}
