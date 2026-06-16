import axios from 'axios';

const API_BASE_URL = '/api';

/**
 * Verificar si productos específicos tienen ofertas para el usuario.
 * Usa /user-discounts/check con los IDs visibles para resolver alcance dinámico
 * (categoría, catálogo, nuevos, rebajas).
 */
export const checkProductsWithUserOffers = async (productIds) => {
  try {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return {};
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return {};
    }

    const normalizedIds = [...new Set(
      productIds
        .map((id) => (id != null ? String(id).trim() : ''))
        .filter(Boolean)
    )];

    if (normalizedIds.length === 0) {
      return {};
    }

    const detailsResponse = await fetch('/api/user-discounts/check', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_ids: normalizedIds,
      }),
    });

    if (!detailsResponse.ok) {
      return {};
    }

    const detailsData = await detailsResponse.json();

    if (!detailsData.success || !detailsData.discounts) {
      return {};
    }

    return detailsData.discounts;
  } catch {
    return {};
  }
};

/**
 * Aplicar ofertas de usuario a una lista de productos
 * VERSIÓN SÚPER SIMPLIFICADA - Sin lotes, sin límites, sin timeouts
 */
export const applyUserOffersToProducts = async (products, userOfferMap = null) => {
  
  if (!products || products.length === 0) {
    return products;
  }
  // Si se proporciona un mapa de ofertas personalizadas, usarlo directamente
  let productsWithOffers = {};
  
  if (userOfferMap && userOfferMap.size > 0) {
    // Convertir Map a objeto
    userOfferMap.forEach((value, key) => {
      productsWithOffers[key] = value;
    });
  } else {
    // Extraer IDs de productos
    const productIds = products.map(product => 
      product.id_articulo || product.id || product.codigo
    ).filter(Boolean);

    if (productIds.length === 0) {
      return products;
    }

    // 🚀 UNA SOLA CONSULTA SÚPER EFICIENTE
    try {
      productsWithOffers = await checkProductsWithUserOffers(productIds);
    } catch (error) {
      return products;
    }
  }

  // Aplicar ofertas a los productos
  const resolveOfferForProduct = (offersMap, product) => {
    const candidates = [product.id_articulo, product.id, product.codigo]
      .filter((id) => id != null && String(id).trim() !== '')
      .map((id) => String(id).trim());

    for (const key of candidates) {
      if (offersMap[key]) {
        return offersMap[key];
      }
    }

    return null;
  };

  const processedProducts = products.map(product => {
      const userOffer = resolveOfferForProduct(productsWithOffers, product);
      
      if (userOffer) {
        // Usar precio1 como base para que el descuento personalizado tenga prioridad
        // sobre el descuento de la API externa (desc_promo) ya aplicado en product.price
        const rawBase = product.precio1 ?? product.precio ?? product.originalPrice ?? product.price ?? 0;
        const originalPrice = typeof rawBase === 'string'
          ? parseFloat(rawBase.replace(/[^\d.-]/g, '')) || 0
          : parseFloat(rawBase) || 0;
        let discountedPrice = originalPrice;
        let visualDiscount = 0;
        
        // Calcular precio con descuento (solo para ofertas de descuento en producto)
        if (userOffer.discount_category === 'product_discount') {
          const discountValue = parseFloat(userOffer.discount_percentage) || 0;
          
          if (discountValue > 0) {
            if (userOffer.discount_type === 'percentage') {
              // Descuento por porcentaje
              const discount = (originalPrice * discountValue) / 100;
              discountedPrice = Math.max(0, originalPrice - discount);
              visualDiscount = discountValue; // Mostrar el porcentaje directamente
            } else if (userOffer.discount_type === 'fixed') {
              // Descuento por pesos fijos
              discountedPrice = Math.max(0, originalPrice - discountValue);
              // Calcular el equivalente en porcentaje
              if (originalPrice > 0) {
                visualDiscount = Math.round((discountValue / originalPrice) * 100);
              }
            }
          }
        }
        
        // Para ofertas buy_x_get_y y free_shipping, NO mostrar descuento de precio
        let showPriceDiscount = true;
        
        if (userOffer.discount_category === 'buy_x_get_y') {
          visualDiscount = 0; // No mostrar descuento de precio para buy X get Y
          showPriceDiscount = false;
          discountedPrice = originalPrice; // Mantener precio original
        } else if (userOffer.discount_category === 'free_shipping') {
          visualDiscount = 0; // No mostrar descuento de precio para envío gratis
          showPriceDiscount = false;
          discountedPrice = originalPrice; // Mantener precio original
        }

        return {
          ...product,
          // Información de la oferta personalizada
          userOffer: {
            percentage: visualDiscount,
            discount_percentage: visualDiscount,
            title: userOffer.title,
            type: userOffer.discount_type,
            endDate: userOffer.end_date,
            discount_category: userOffer.discount_category,
            buy_quantity: userOffer.buy_quantity,
            get_quantity: userOffer.get_quantity,
            showPriceDiscount: showPriceDiscount
          },
          // Precios actualizados
          originalPrice: showPriceDiscount && discountedPrice < originalPrice ? originalPrice : product.originalPrice,
          price: discountedPrice,
          discount: visualDiscount,
          hasUserOffer: true
        };
      }

      // Si no tiene oferta personalizada, mantener datos originales del backend
      // IMPORTANTE: No sobrescribir price, originalPrice y discount si ya vienen del backend
      return {
        ...product,
        // Mantener los valores que vienen del backend (ya calculados con descuento reducido)
        price: product.price !== undefined ? product.price : (product.precio1 || 0),
        originalPrice: product.originalPrice !== undefined ? product.originalPrice : null,
        discount: product.discount !== undefined ? product.discount : null,
        hasUserOffer: false
      };
    });

  // Log final de productos procesados
  const productsWithUserOffers = processedProducts.filter(p => p.hasUserOffer);
  return processedProducts;
};
