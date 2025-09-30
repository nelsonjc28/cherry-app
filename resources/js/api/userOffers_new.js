import axios from 'axios';

const API_BASE_URL = '/api';

/**
 * Verificar si productos específicos tienen ofertas para el usuario
 * VERSIÓN OPTIMIZADA - Sin límites ni timeouts
 */
export const checkProductsWithUserOffers = async (productIds) => {
  try {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return {};
    }
    
    // Obtener token del localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      return {};
    }

    // 🚀 UNA SOLA LLAMADA - Sin límites, sin lotes, sin timeouts
    const response = await axios.post(`${API_BASE_URL}/user-discounts/check`, {
      product_ids: productIds
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response && response.data && response.data.success) {
      return response.data.discounts || {};
    }

    return {};
  } catch (error) {
    if (error.response && error.response.status !== 401) {
      console.warn('Error verificando productos con ofertas:', error.response.status);
    }
    return {};
  }
};

/**
 * Aplicar ofertas de usuario a una lista de productos
 * VERSIÓN SÚPER SIMPLIFICADA - Sin lotes, sin límites, sin timeouts
 */
export const applyUserOffersToProducts = async (products) => {
  if (!products || products.length === 0) {
    return products;
  }

  // Extraer IDs de productos
  const productIds = products.map(product => 
    product.id_articulo || product.id || product.codigo
  ).filter(Boolean);

  if (productIds.length === 0) {
    return products;
  }

  // 🚀 UNA SOLA CONSULTA SÚPER EFICIENTE
  try {
    const productsWithOffers = await checkProductsWithUserOffers(productIds);

    // Aplicar ofertas a los productos
    return products.map(product => {
      const productId = product.id_articulo || product.id || product.codigo;
      const userOffer = productsWithOffers[productId];
      
      if (userOffer) {
        const originalPrice = product.price || product.precio1 || 0;
        let discountedPrice = originalPrice;
        
        // Calcular precio con descuento (solo para ofertas de descuento en producto)
        if (userOffer.discount_category === 'product_discount') {
          const discountPercentage = parseFloat(userOffer.discount_percentage) || 0;
          
          if (discountPercentage > 0) {
            if (userOffer.discount_type === 'percentage') {
              const discount = (originalPrice * discountPercentage) / 100;
              discountedPrice = Math.max(0, originalPrice - discount);
            } else if (userOffer.discount_type === 'fixed') {
              discountedPrice = Math.max(0, originalPrice - discountPercentage);
            }
          }
        }
        
        return {
          ...product,
          // Información de la oferta personalizada
          userOffer: {
            percentage: parseFloat(userOffer.discount_percentage) || 0,
            discount_percentage: parseFloat(userOffer.discount_percentage) || 0,
            title: userOffer.title,
            type: userOffer.discount_type,
            endDate: userOffer.end_date,
            discount_category: userOffer.discount_category,
            buy_quantity: userOffer.buy_quantity,
            get_quantity: userOffer.get_quantity
          },
          // Precios actualizados
          originalPrice: discountedPrice < originalPrice ? originalPrice : product.originalPrice,
          price: discountedPrice,
          discount: parseFloat(userOffer.discount_percentage) || 0,
          hasUserOffer: true
        };
      }

      // Si no tiene oferta personalizada, mantener datos originales
      return {
        ...product,
        price: product.price || product.precio1 || 0,
        originalPrice: product.originalPrice || null,
        discount: product.discount || null,
        hasUserOffer: false
      };
    });
  } catch (error) {
    console.warn('Error aplicando ofertas de usuario:', error);
    return products;
  }
};




