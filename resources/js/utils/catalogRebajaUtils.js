import { isOroDiamanteSeller } from './sellerVolumeDiscount';

/**
 * % de rebaja catálogo efectivo según categoría:
 * Oro/Diamante → desc_promo completo; Bronce/invitado → desc_promo − 10.
 */
export function getEffectiveDescPromoPercent(descPromo, user = null) {
  const raw = parseFloat(descPromo ?? 0);
  if (!Number.isFinite(raw) || raw <= 0.0001) {
    return 0;
  }
  if (isOroDiamanteSeller(user)) {
    return raw;
  }
  return Math.max(0, raw - 10);
}

/** Precio unitario con rebaja de catálogo (precio1 + desc_promo + categoría). */
export function catalogPriceFromList(listPrice, descPromo, user = null) {
  const base = Number(listPrice) || 0;
  if (base <= 0) {
    return 0;
  }
  const pct = getEffectiveDescPromoPercent(descPromo, user);
  if (pct <= 0) {
    return base;
  }
  return Math.max(0, base * (1 - pct / 100));
}

/** Mapeo estándar de precio/badge para listados que parten de desc_promo crudo. */
export function applyCatalogRebajaToProductFields(product, user = null) {
  if (!product) {
    return product;
  }

  const descPromo = parseFloat(product.desc_promo ?? product.descPromo ?? 0);
  const rawBase = product.precio1 ?? product.precio ?? product.originalPrice ?? product.price ?? 0;
  const precio1 = typeof rawBase === 'string'
    ? parseFloat(rawBase.replace(/[^\d.-]/g, '')) || 0
    : parseFloat(rawBase) || 0;

  const discountPercentage = getEffectiveDescPromoPercent(descPromo, user);
  const hasDiscount = discountPercentage > 0 && precio1 > 0;
  const finalPrice = hasDiscount
    ? catalogPriceFromList(precio1, descPromo, user)
    : precio1;

  return {
    ...product,
    precio1,
    price: finalPrice,
    originalPrice: hasDiscount ? precio1 : (product.originalPrice ?? null),
    discount: discountPercentage,
  };
}
