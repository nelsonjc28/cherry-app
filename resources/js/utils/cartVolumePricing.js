/**
 * Alineado con {@see App\Services\PriceService::summarizeVolumeFromItems} (PHP).
 *
 * Reglas:
 * - Bronce: descuento por PIEZAS. Umbrales 12 (primera compra) / 6 (posteriores).
 *   El frontend también envía la cantidad de piezas elegibles al backend vía
 *   `items_for_volume_pricing`. El backend valida la consistencia.
 * - Oro/Diamante: descuento por monto elegible, % desde API o 30 + 10 por defecto.
 */

import {
  canApplyMainDiscount,
  getVolumeDiscountMainTier,
  getVolumeDiscountExtraPercent,
  isBronzeSeller,
  hasCompletedFirstPurchase,
  bronzeShippingPiecesThreshold,
  shouldApplyBronzeMainDiscount,
  shouldApplyBronzeSecondTier,
} from './sellerVolumeDiscount';

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export function cartItemToPricingLine(item) {
  const price = parseFloat(item.precio ?? item.price ?? 0);
  const quantity = parseInt(item.quantity ?? 0, 10);
  return {
    price,
    quantity,
    desc_promo: item.desc_promo ?? null,
    user_offer_applies: !!(item.userOffer && item.userOffer.discount_category),
  };
}

/** Cantidad total de piezas sin `desc_promo` y sin oferta de usuario. */
export function countEligiblePiecesFromLines(lines) {
  let pieces = 0;
  for (const item of lines) {
    const descPromo = item.desc_promo ?? null;
    const hasPromo = descPromo !== null && parseFloat(descPromo) > 0.0001;
    const hasUserOffer = !!item.user_offer_applies;
    if (hasPromo || hasUserOffer) continue;
    pieces += parseInt(item.quantity, 10) || 0;
  }
  return pieces;
}

export function summarizeVolumeFromPricingLines(user, lines) {
  let linesSum = 0;
  for (const item of lines) {
    linesSum += round2((parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 0));
  }
  linesSum = round2(linesSum);

  let eligibleTotal = 0;
  for (const item of lines) {
    const descPromo = item.desc_promo ?? null;
    const hasPromo = descPromo !== null && parseFloat(descPromo) > 0.0001;
    const hasUserOffer = !!item.user_offer_applies;
    if (hasPromo || hasUserOffer) continue;
    eligibleTotal += round2((parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 0));
  }
  eligibleTotal = round2(eligibleTotal);

  const eligiblePieces = countEligiblePiecesFromLines(lines);
  const isBronze = isBronzeSeller(user);

  const { mainRate, mainPercent } = getVolumeDiscountMainTier(user);
  const extraPercent = isBronze
    ? getVolumeDiscountExtraPercent(user, eligiblePieces)
    : getVolumeDiscountExtraPercent(user);
  const extraRate = extraPercent / 100;

  let volMain = 0;
  let volExtra = 0;
  let descuento1 = 0;
  let descuento2 = 0;

  if (isBronze) {
    if (shouldApplyBronzeMainDiscount(user, eligiblePieces)) {
      descuento1 = mainPercent;
      volMain = round2(eligibleTotal * mainRate);
      const afterMain = round2(eligibleTotal - volMain);

      if (shouldApplyBronzeSecondTier(user, eligiblePieces)) {
        volExtra = round2(afterMain * extraRate);
        descuento2 = extraPercent;
      }
    }
  } else if (canApplyMainDiscount(user, eligibleTotal)) {
    descuento1 = mainPercent;
    volMain = round2(eligibleTotal * mainRate);
    const afterMain = round2(eligibleTotal - volMain);
    if (extraRate > 0) {
      volExtra = round2(afterMain * extraRate);
      descuento2 = extraPercent;
    }
  }

  const volumeDiscount = round2(volMain + volExtra);
  const discountedMerchandise = round2(Math.max(0, linesSum - volumeDiscount));

  return {
    lines_sum: linesSum,
    eligible_total: eligibleTotal,
    eligible_pieces: eligiblePieces,
    bronze_shipping_pieces_threshold: isBronze
      ? bronzeShippingPiecesThreshold(user)
      : null,
    bronze_completed_first_purchase: isBronze
      ? hasCompletedFirstPurchase(user)
      : null,
    volume_discount: volumeDiscount,
    vol_main: volMain,
    vol_extra: volExtra,
    descuento1,
    descuento2,
    discounted_merchandise: discountedMerchandise,
  };
}

export function summarizeVolumeFromCartItems(user, cartItems) {
  const lines = cartItems.map(cartItemToPricingLine);
  return summarizeVolumeFromPricingLines(user, lines);
}

/**
 * Mercancía neta para un subconjunto cuando el volumen se calculó sobre el carrito completo.
 */
export function discountedMerchandiseForSubset(user, fullCartLines, subsetLines) {
  const full = summarizeVolumeFromPricingLines(user, fullCartLines);

  let subsetLinesSum = 0;
  let subsetEligible = 0;
  for (const item of subsetLines) {
    const line = round2((parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 0));
    subsetLinesSum += line;
    const descPromo = item.desc_promo ?? null;
    const hasPromo = descPromo !== null && parseFloat(descPromo) > 0.0001;
    const hasUserOffer = !!item.user_offer_applies;
    if (!hasPromo && !hasUserOffer) {
      subsetEligible += line;
    }
  }
  subsetLinesSum = round2(subsetLinesSum);
  subsetEligible = round2(subsetEligible);

  const eligibleTotal = full.eligible_total;
  if (eligibleTotal <= 0.0001) {
    return round2(Math.max(0, subsetLinesSum));
  }

  const ratio = subsetEligible / eligibleTotal;
  const subsetVolumeDiscount = round2(full.volume_discount * ratio);
  return round2(Math.max(0, subsetLinesSum - subsetVolumeDiscount));
}
