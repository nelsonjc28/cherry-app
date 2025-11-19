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
    }
    
    return [];
  }
};

/**
 * Verificar si productos específicos tienen ofertas para el usuario
 */
export const checkProductsWithUserOffers = async (productIds) => {
  try {
    
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return {};
    }
    
    // Validar que no exceda el límite del backend
    if (productIds.length > 100) {
      return {};
    }
    
    // Obtener token del localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      return {};
    }

    
    const response = await axios.post(`${API_BASE_URL}/user-discounts/check`, {
      product_ids: productIds
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });


    if (response && response.data && response.data.success) {
      return response.data.discounts || {};
    }

    return {};
  } catch (error) {
    if (error.response) {
      if (error.response.status === 422) {
      } else if (error.response.status !== 401) {
      }
    } else {
    }
    
    return {};
  }
};

/**
 * Aplicar ofertas de usuario a una lista de productos
 * Esta función reemplaza la lógica anterior de descuentos personalizados
 */
export const applyUserOffersToProducts = async (products) => {
  
  if (!products || products.length === 0) {
    return products || [];
  }

  try {
    // Extraer IDs de productos
    const productIds = products.map(product => 
      product.id_articulo || product.id || product.codigo
    ).filter(Boolean);


    if (productIds.length === 0) {
      return products;
    }

    // Verificar ofertas del usuario
    
    // Si hay muchos productos, procesarlos por lotes (máximo 100 por lote)
    let productsWithOffers = {};
    
    if (productIds.length > 100) {
      const chunkSize = 100; // Límite del backend
      const chunks = [];
      
      for (let i = 0; i < productIds.length; i += chunkSize) {
        chunks.push(productIds.slice(i, i + chunkSize));
      }
      
      for (const chunk of chunks) {
        try {
          const chunkResults = await Promise.race([
            checkProductsWithUserOffers(chunk),
            new Promise(resolve => setTimeout(() => resolve({}), 8000)) // Timeout de 8 segundos para lotes
          ]);
          productsWithOffers = { ...productsWithOffers, ...chunkResults };
        } catch (error) {
          // Continuar con el siguiente lote en caso de error
        }
      }
    } else {
      // Obtener productos con ofertas (con timeout de 5 segundos)
      try {
        productsWithOffers = await Promise.race([
          checkProductsWithUserOffers(productIds),
          new Promise(resolve => setTimeout(() => resolve({}), 5000)) // Timeout de 5 segundos
        ]);
      } catch (error) {
        productsWithOffers = {};
      }
    }


    // Aplicar ofertas a los productos
    const finalProducts = products.map(product => {
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
            discount_percentage: parseFloat(userOffer.discount_percentage) || 0, // Para compatibilidad con ProductCard
            title: userOffer.title,
            type: userOffer.discount_type,
            endDate: userOffer.end_date,
            // Campos adicionales para diferentes tipos de ofertas
            discount_category: userOffer.discount_category,
            buy_quantity: userOffer.buy_quantity,
            get_quantity: userOffer.get_quantity
          },
          // Precios actualizados
          originalPrice: discountedPrice < originalPrice ? originalPrice : product.originalPrice,
          price: discountedPrice,
          // Mantener el descuento original de la API si existe
          discount: parseFloat(userOffer.discount_percentage) || 0,
          // Flag para identificar que tiene oferta personalizada
          hasUserOffer: true
        };
      }

      // Si no tiene oferta personalizada, mantener precio y descuento original de la API
      return {
        ...product,
        price: product.price || product.precio1 || 0,
        // Mantener originalPrice y discount si ya existen (productos de API con desc_promo)
        originalPrice: product.originalPrice || null,
        discount: product.discount || null,
        hasUserOffer: false
      };
    });
    
    const finalProductsWithOffers = finalProducts.filter(p => p.hasUserOffer);
    
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
