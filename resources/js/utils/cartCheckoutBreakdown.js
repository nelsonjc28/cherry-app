/**
 * Desglose tipo factura: prendas de línea (elegibles a volumen) vs prendas en oferta.
 * Alineado con {@see summarizeVolumeFromPricingLines} y precios de {@see calculateItemPrice}.
 */

import { cartItemToPricingLine, discountedMerchandiseForSubset } from './cartVolumePricing';
import { calculateItemPrice, getPaidQuantity } from '../store/cartStore';

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
      promoCartSubtotal: 0,
      promoSavings: 0,
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
  let promoCartSubtotal = 0;
  for (const it of promoItems) {
    promoCartSubtotal += round2(calculateItemPrice(it));
    const q = getPaidQuantity(it) > 0 ? getPaidQuantity(it) : parseInt(it.quantity, 10) || 0;
    const listUnit = Number(it?.precio1 ?? it?.originalPrice ?? it?.price ?? it?.precio ?? 0);
    if (Number.isFinite(listUnit) && listUnit > 0) {
      promoListSubtotal += round2(listUnit * q);
    }
  }
  promoListSubtotal = round2(promoListSubtotal);
  promoCartSubtotal = round2(promoCartSubtotal);
  if (promoPieces > 0 && promoListSubtotal < 0.01 && promoCartSubtotal > 0) {
    promoListSubtotal = round2(promoCartSubtotal);
  }
  const promoSavings = round2(Math.max(0, promoListSubtotal - promoCartSubtotal));

  return {
    linePieces,
    promoPieces,
    lineSubtotal,
    discountVolumeMain,
    discountVolumeExtra,
    lineNet: round2(lineNet),
    promoListSubtotal,
    promoCartSubtotal,
    promoSavings,
    totalPieces: linePieces + promoPieces,
  };
}
