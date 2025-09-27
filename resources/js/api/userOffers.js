import axios from 'axios';

const API_BASE_URL = '/api';

/**
 * Verificar si productos específicos tienen ofertas para el usuario
 * VERSIÓN OPTIMIZADA - Sin límites ni timeouts
 */
export const checkProductsWithUserOffers = async (productIds) => {
  console.log('🔍 checkProductsWithUserOffers: Iniciando verificación...', {
    productIds,
    hasToken: !!localStorage.getItem('token')
  });
  
  try {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      console.log('❌ checkProductsWithUserOffers: ProductIds inválidos');
      return {};
    }
    
    // Obtener token del localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('❌ checkProductsWithUserOffers: No hay token');
      return {};
    }

    console.log('🚀 checkProductsWithUserOffers: Haciendo llamada a la API...', {
      url: `${API_BASE_URL}/user-discounts/check`,
      productIds: productIds
    });

    // 🚀 UNA SOLA LLAMADA - Sin límites, sin lotes, sin timeouts
    const response = await axios.post(`${API_BASE_URL}/user-discounts/check`, {
      product_ids: productIds
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ checkProductsWithUserOffers: Respuesta recibida:', {
      status: response.status,
      success: response.data?.success,
      discountsCount: Object.keys(response.data?.discounts || {}).length,
      data: response.data
    });
    
    // Log especial para el usuario cliente@cherrycentral.com
    if (token) {
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        if (tokenPayload.email === 'cliente@cherrycentral.com') {
          console.log('🔍 DEBUGGING usuario cliente@cherrycentral.com:', {
            email: tokenPayload.email,
            userId: tokenPayload.sub,
            productIds: productIds,
            discounts: response.data?.discounts,
            hasDiscounts: Object.keys(response.data?.discounts || {}).length > 0
          });
        }
      } catch (tokenError) {
        console.log('⚠️ No se pudo decodificar el token para debugging');
      }
    }

    if (response && response.data && response.data.success) {
      return response.data.discounts || {};
    }

    console.log('⚠️ checkProductsWithUserOffers: Respuesta no exitosa');
    return {};
  } catch (error) {
    console.error('❌ checkProductsWithUserOffers: Error en la llamada:', {
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    
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
  console.log('🔍 applyUserOffersToProducts: Iniciando...', {
    productsCount: products?.length || 0,
    hasToken: !!localStorage.getItem('token')
  });
  
  if (!products || products.length === 0) {
    console.log('❌ applyUserOffersToProducts: No hay productos');
    return products;
  }

  // Extraer IDs de productos
  const productIds = products.map(product => 
    product.id_articulo || product.id || product.codigo
  ).filter(Boolean);

  console.log('📊 applyUserOffersToProducts: IDs de productos extraídos:', productIds);

  if (productIds.length === 0) {
    console.log('❌ applyUserOffersToProducts: No se pudieron extraer IDs');
    return products;
  }

  // 🚀 UNA SOLA CONSULTA SÚPER EFICIENTE
  try {
    console.log('🔍 applyUserOffersToProducts: Consultando ofertas del usuario...');
    const productsWithOffers = await checkProductsWithUserOffers(productIds);
    
    console.log('✅ applyUserOffersToProducts: Ofertas recibidas:', {
      offersCount: Object.keys(productsWithOffers).length,
      offers: productsWithOffers
    });

    // Log específico de productos con ofertas
    if (Object.keys(productsWithOffers).length > 0) {
      console.log(`🎯 applyUserOffersToProducts: ${Object.keys(productsWithOffers).length} productos con ofertas encontradas`);
    } else {
      console.log('❌ applyUserOffersToProducts: No se encontraron ofertas para ningún producto');
    }

    // Aplicar ofertas a los productos
    const processedProducts = products.map(product => {
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
        
        // Para ofertas buy_x_get_y y free_shipping, NO mostrar descuento de precio
        let visualDiscount = parseFloat(userOffer.discount_percentage) || 0;
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

      // Si no tiene oferta personalizada, mantener datos originales
      return {
        ...product,
        price: product.price || product.precio1 || 0,
        originalPrice: product.originalPrice || null,
        discount: product.discount || null,
        hasUserOffer: false
      };
    });

    // Log final de productos procesados
    const productsWithUserOffers = processedProducts.filter(p => p.hasUserOffer);
    console.log(`🎯 applyUserOffersToProducts: RESULTADO FINAL - ${productsWithUserOffers.length} de ${processedProducts.length} productos tienen ofertas personalizadas`);
    
    return processedProducts;
  } catch (error) {
    console.warn('Error aplicando ofertas de usuario:', error);
    return products;
  }
};
