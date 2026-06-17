import { checkProductsWithUserOffers } from '../api/userOffers';
import {
  getListUnitPrice,
  getCatalogDiscountedUnitPrice,
  resolveStackedProductDiscountUnitPrice,
} from './offerMinPurchaseUtils';

function resolveOfferForCartItem(offersMap, item) {
  const candidates = [item?.id_articulo, item?.id, item?.product_id, item?.codigo]
    .filter((id) => id != null && String(id).trim() !== '')
    .map((id) => String(id).trim());

  for (const key of candidates) {
    if (offersMap[key]) {
      return offersMap[key];
    }
  }

  return null;
}

export function buildCartUserOffer(backendOffer) {
  if (!backendOffer) {
    return null;
  }

  return {
    offer_id: backendOffer.offer_id,
    discount_percentage: backendOffer.discount_category === 'product_discount'
      ? (parseFloat(backendOffer.discount_percentage) || 0)
      : 0,
    title: backendOffer.title,
    type: backendOffer.discount_type,
    discount_type: backendOffer.discount_type,
    endDate: backendOffer.end_date,
    discount_category: backendOffer.discount_category,
    buy_quantity: backendOffer.buy_quantity,
    get_quantity: backendOffer.get_quantity,
    min_purchase_amount: backendOffer.min_purchase_amount,
    max_discount_amount: backendOffer.max_discount_amount,
  };
}

function applyOfferToCartItem(item, backendOffer, allItems) {
  const freshOffer = buildCartUserOffer(backendOffer);
  const updated = { ...item, userOffer: freshOffer };

  if (item?.isFreeItem) {
    return { ...updated, price: 0, precio: 0 };
  }

  const listUnit = getListUnitPrice(updated);
  if (listUnit <= 0) {
    return updated;
  }

  if (!freshOffer) {
    const unit = getCatalogDiscountedUnitPrice(listUnit, updated);
    return { ...updated, userOffer: null, price: unit, precio: unit };
  }

  if (
    freshOffer.discount_category === 'buy_x_get_y'
    || freshOffer.discount_category === 'free_shipping'
    || freshOffer.discount_category === 'order_discount'
  ) {
    const unit = getCatalogDiscountedUnitPrice(listUnit, updated);
    return { ...updated, price: unit, precio: unit };
  }

  if (freshOffer.discount_category === 'product_discount') {
    const unit = resolveStackedProductDiscountUnitPrice(listUnit, updated, freshOffer, allItems);
    return { ...updated, price: unit, precio: unit };
  }

  return updated;
}

/**
 * Reemplaza userOffer y precios de línea con datos actuales de /user-discounts/check.
 * No cachea el % de la oferta: siempre consulta el backend.
 */
export async function refreshCartItemsOffers(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return items || [];
  }

  if (!localStorage.getItem('token')) {
    return items;
  }

  const productIds = [...new Set(
    items
      .map((item) => item?.id_articulo ?? item?.id ?? item?.product_id)
      .filter((id) => id != null && String(id).trim() !== '')
      .map((id) => String(id).trim())
  )];

  if (productIds.length === 0) {
    return items;
  }

  const offersMap = await checkProductsWithUserOffers(productIds);

  let refreshed = items.map((item) => {
    const backendOffer = resolveOfferForCartItem(offersMap, item);
    if (!item?.userOffer && !backendOffer) {
      return item;
    }
    return applyOfferToCartItem(item, backendOffer, items);
  });

  refreshed = refreshed.map((item) => {
    const backendOffer = resolveOfferForCartItem(offersMap, item);
    if (!item?.userOffer && !backendOffer) {
      return item;
    }
    return applyOfferToCartItem(item, backendOffer, refreshed);
  });

  return refreshed;
}
