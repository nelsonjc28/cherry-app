import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Obtener ofertas específicas para el usuario logueado
 */
export const getUserOffers = async () => {
  try {
    // Obtener token del localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      return [];
    }

    const response = await axios.get(`${API_BASE_URL}/user-offers`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response && response.data && response.data.success) {
      return response.data.offers || [];
    }

    return [];
  } catch (error) {
    if (error.response && error.response.status !== 401) {
      console.warn('Error obteniendo ofertas de usuario:', error.response.status);
    }
    
    return [];
  }
};

/**
 * Verificar si productos específicos tienen ofertas para el usuario
 */
export const checkProductsWithUserOffers = async (productIds) => {
  try {
    console.log('🔍 checkProductsWithUserOffers: Iniciando con IDs:', productIds.slice(0, 5), '...');
    
    if (!Array.isArray(productIds) || productIds.length === 0) {
      console.log('❌ checkProductsWithUserOffers: Sin IDs válidos');
      return {};
    }
    
    // Obtener token del localStorage
    const token = localStorage.getItem('token');
    console.log('🔑 checkProductsWithUserOffers: Token encontrado:', !!token);
    
    if (!token) {
      console.log('❌ checkProductsWithUserOffers: Sin token');
      return {};
    }

    console.log('📡 checkProductsWithUserOffers: Haciendo llamada a API...');
    
    const response = await axios.post(`${API_BASE_URL}/user-offers/products`, {
      product_ids: productIds
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ checkProductsWithUserOffers: Respuesta recibida:', response.data);

    if (response && response.data && response.data.success) {
      console.log('🎯 checkProductsWithUserOffers: Productos con ofertas:', response.data.products_with_offers);
      return response.data.products_with_offers || {};
    }

    console.log('❌ checkProductsWithUserOffers: Sin éxito en respuesta');
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
 * Esta función reemplaza la lógica anterior de descuentos personalizados
 */
export const applyUserOffersToProducts = async (products) => {
  console.log('🎯 applyUserOffersToProducts: Iniciando con', products.length, 'productos');
  
  if (!products || products.length === 0) {
    console.log('❌ applyUserOffersToProducts: Sin productos');
    return products || [];
  }

  try {
    // Extraer IDs de productos
    const productIds = products.map(product => 
      product.id_articulo || product.id || product.codigo
    ).filter(Boolean);

    console.log('📋 applyUserOffersToProducts: IDs extraídos:', productIds.slice(0, 5), '...');

    if (productIds.length === 0) {
      console.log('❌ applyUserOffersToProducts: Sin IDs válidos');
      return products;
    }

    // Verificar ofertas del usuario
    console.log('📞 applyUserOffersToProducts: Llamando a checkProductsWithUserOffers...');
    
    // Si hay muchos productos, procesarlos por lotes
    let productsWithOffers = {};
    
    if (productIds.length > 1500) {
      console.log('🔄 applyUserOffersToProducts: Procesando por lotes (productos > 1500)');
      const chunkSize = 1500;
      const chunks = [];
      
      for (let i = 0; i < productIds.length; i += chunkSize) {
        chunks.push(productIds.slice(i, i + chunkSize));
      }
      
      for (const chunk of chunks) {
        const chunkResults = await Promise.race([
          checkProductsWithUserOffers(chunk),
          new Promise(resolve => setTimeout(() => resolve({}), 10000)) // Timeout de 10 segundos para lotes
        ]);
        productsWithOffers = { ...productsWithOffers, ...chunkResults };
      }
    } else {
      // Obtener productos con ofertas (con timeout de 5 segundos)
      productsWithOffers = await Promise.race([
        checkProductsWithUserOffers(productIds),
        new Promise(resolve => setTimeout(() => resolve({}), 5000)) // Timeout de 5 segundos
      ]);
    }

    console.log('💰 applyUserOffersToProducts: Ofertas recibidas:', productsWithOffers);

    // Aplicar ofertas a los productos
    const finalProducts = products.map(product => {
      const productId = product.id_articulo || product.id || product.codigo;
      const userOffer = productsWithOffers[productId];

      if (userOffer) {
        console.log(`✅ applyUserOffersToProducts: Aplicando oferta a ${productId}:`, userOffer);
        const originalPrice = product.price || product.precio1 || 0;
        let discountedPrice = originalPrice;
        
        // Calcular precio con descuento
        if (userOffer.discount_type === 'percentage') {
          const discount = (originalPrice * userOffer.discount_percentage) / 100;
          discountedPrice = Math.max(0, originalPrice - discount);
        } else if (userOffer.discount_type === 'fixed') {
          discountedPrice = Math.max(0, originalPrice - userOffer.discount_percentage);
        }
        
        return {
          ...product,
          // Información de la oferta personalizada
          userOffer: {
            percentage: userOffer.discount_percentage,
            title: userOffer.title,
            type: userOffer.discount_type,
            endDate: userOffer.end_date
          },
          // Precios actualizados
          originalPrice: originalPrice,
          price: discountedPrice,
          // Mantener el descuento original de la API si existe
          discount: userOffer.discount_percentage,
          // Flag para identificar que tiene oferta personalizada
          hasUserOffer: true
        };
      }

      // Si no tiene oferta personalizada, mantener solo precio1 (precio original)
      return {
        ...product,
        price: product.precio1 || product.price || 0,
        originalPrice: null,
        discount: null,
        hasUserOffer: false
      };
    });
    
    const finalProductsWithOffers = finalProducts.filter(p => p.hasUserOffer);
    console.log('🏁 applyUserOffersToProducts: Productos finales con ofertas:', finalProductsWithOffers.length);
    console.log('🏁 applyUserOffersToProducts: Total productos devueltos:', finalProducts.length);
    
    return finalProducts;
  } catch (error) {
    // Devolver productos originales en caso de error, pero sin descuentos
    return products.map(product => ({
      ...product,
      price: product.precio1 || product.price || 0,
      originalPrice: null,
      discount: null,
      hasUserOffer: false
    }));
  }
};

/**
 * Verificar si el usuario está logueado
 */
export const isUserLoggedIn = () => {
  return !!localStorage.getItem('token');
};
