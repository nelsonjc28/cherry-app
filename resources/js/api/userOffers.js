import axios from 'axios';

const API_BASE_URL = '/api';

/**
 * Verificar si productos específicos tienen ofertas para el usuario
 * VERSIÓN OPTIMIZADA - Usando el endpoint correcto
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

    // Usar el endpoint correcto que ya está funcionando
    const response = await fetch('/api/user-offer-products', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return {};
    }

    const data = await response.json();
    
    if (!data.success || !data.product_ids || data.product_ids.length === 0) {
      return {};
    }

    // Obtener datos completos de las ofertas del backend
    try {
      const detailsResponse = await fetch('/api/user-discounts/check', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_ids: data.product_ids
        })
      });
      
      if (!detailsResponse.ok) {
        return {};
      }

      const detailsData = await detailsResponse.json();
      
      if (!detailsData.success || !detailsData.discounts) {
        return {};
      }

      return detailsData.discounts;
    } catch (error) {
      return {};
    }
    
  } catch (error) {
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
      
      // Debug: Verificar productos específicos
      const productosEspecificos = ['515422585712', '50552258912', '515422524904', '2855708612', '515422524512'];
      const productosEncontradosEnOfertas = productosEspecificos.filter(id => productsWithOffers[id]);
      console.log('🔍 DEBUG userOffers - Productos específicos encontrados en ofertas:', productosEncontradosEnOfertas.length);
      if (productosEncontradosEnOfertas.length > 0) {
        productosEncontradosEnOfertas.forEach(id => {
          console.log('🔍 DEBUG userOffers - Oferta encontrada para producto:', id, productsWithOffers[id]);
        });
      } else {
        console.warn('⚠️ userOffers - NINGUNO de los productos específicos tiene oferta en productsWithOffers');
        console.log('🔍 DEBUG userOffers - Total de ofertas encontradas:', Object.keys(productsWithOffers).length);
        console.log('🔍 DEBUG userOffers - Primeras 10 IDs con ofertas:', Object.keys(productsWithOffers).slice(0, 10));
      }
    } catch (error) {
      console.error('❌ Error en checkProductsWithUserOffers:', error);
      return products;
    }
  }

  // Aplicar ofertas a los productos
  const processedProducts = products.map(product => {
      const productId = product.id_articulo || product.id || product.codigo;
      const userOffer = productsWithOffers[productId];
      
      if (userOffer) {
        const originalPrice = product.price || product.precio1 || 0;
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
