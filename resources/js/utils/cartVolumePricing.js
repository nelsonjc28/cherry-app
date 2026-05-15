/**
 * Alineado con {@see App\Services\PriceService::summarizeVolumeFromItems} (PHP).
 * Sin descuento1 en usuario: reglas tipo bronce para todos (≥ $7k / 45 días) y 30 % + 10 % si ≥ $15k elegible.
 * Con descuento1 desde API: los % del usuario; el segundo tramo aplica junto al primero (sin umbral $15k).
 */

import {
  canApplyMainDiscount,
  getVolumeDiscountMainTier,
  getVolumeDiscountExtraPercent,
  hasApiVolumeMainPercent,
} from './sellerVolumeDiscount';

export const SECOND_TIER_ELIGIBLE_MIN = 15000;

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

  const { mainRate, mainPercent } = getVolumeDiscountMainTier(user);
  const extraPercent = getVolumeDiscountExtraPercent(user);
  const extraRate = extraPercent / 100;
  let volMain = 0;
  let volExtra = 0;
  let descuento1 = 0;
  let descuento2 = 0;

  if (canApplyMainDiscount(user, eligibleTotal)) {
    descuento1 = mainPercent;
    volMain = round2(eligibleTotal * mainRate);
    const afterMain = round2(eligibleTotal - volMain);

    const hasApiMain = hasApiVolumeMainPercent(user);
    const applySecondTier = hasApiMain || eligibleTotal >= SECOND_TIER_ELIGIBLE_MIN;

    if (applySecondTier) {
      volExtra = round2(afterMain * extraRate);
      descuento2 = extraPercent;
    }
  }

  const volumeDiscount = round2(volMain + volExtra);
  const discountedMerchandise = round2(Math.max(0, linesSum - volumeDiscount));

  return {
    lines_sum: linesSum,
    eligible_total: eligibleTotal,
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
