import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Verificar descuentos aplicables para el usuario logueado y productos específicos
 */
export const checkUserDiscounts = async (productIds) => {
  try {
    // Validar que productIds sea un array válido
    if (!Array.isArray(productIds) || productIds.length === 0) {
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
      timeout: 10000 // 10 segundos de timeout
    });

    if (response && response.data) {
      return {
        success: response.data.success || true,
        discounts: response.data.discounts || {},
        error: response.data.error || null
      };
    }

    return {
      success: false,
      discounts: {},
      error: 'No response data'
    };
  } catch (error) {
    // Solo loggear errores importantes en producción
    if (error.response && error.response.status !== 401) {
    }
    
    return {
      success: false,
      discounts: {},
      error: error.message || 'Error desconocido'
    };
  }
};

/**
 * Calcular precio con descuento aplicado
 */
export const calculateDiscountedPrice = (originalPrice, discountData) => {
  if (!discountData || !originalPrice) {
    return originalPrice;
  }

  const discountType = discountData.discount_type;
  const discountValue = discountData.discount_percentage;
  const maxDiscountAmount = discountData.max_discount_amount;

  if (discountType === 'percentage') {
    let discount = (originalPrice * discountValue) / 100;
    
    // Aplicar descuento máximo si está configurado
    if (maxDiscountAmount && discount > maxDiscountAmount) {
      discount = maxDiscountAmount;
    }
    
    return Math.max(0, originalPrice - discount);
  } else if (discountType === 'fixed') {
    return Math.max(0, originalPrice - discountValue);
  }

  return originalPrice;
};

/**
 * Aplicar descuentos personalizados a una lista de productos
 */
export const applyUserDiscountsToProducts = async (products) => {
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

    // Verificar descuentos del usuario (con timeout y manejo de errores)
    const userDiscounts = await Promise.race([
      checkUserDiscounts(productIds),
      new Promise(resolve => setTimeout(() => resolve({}), 5000)) // Timeout de 5 segundos
    ]);

    // Aplicar descuentos a los productos
    const finalProducts = products.map(product => {
      const productId = product.id_articulo || product.id || product.codigo;
      const userDiscount = userDiscounts[productId];

      if (userDiscount) {
        const originalPrice = product.price || product.precio1 || 0;
        const discountedPrice = calculateDiscountedPrice(originalPrice, userDiscount);
        
        return {
          ...product,
          // Información del descuento personalizado
          userDiscount: {
            percentage: userDiscount.discount_percentage,
            title: userDiscount.title,
            type: userDiscount.discount_type,
            endDate: userDiscount.end_date
          },
          // Precios actualizados
          originalPrice: originalPrice,
          price: discountedPrice,
          // Mantener el descuento original de la API si existe
          discount: product.discount || null,
          // Flag para identificar que tiene descuento personalizado
          hasUserDiscount: true
        };
      }

      return product;
    });
    
    return finalProducts;
  } catch (error) {
    // Devolver productos originales en caso de error
    return products || [];
  }
};

/**
 * Verificar si el usuario está logueado
 */
export const isUserLoggedIn = () => {
  const token = localStorage.getItem('token');
  return !!token;
};
