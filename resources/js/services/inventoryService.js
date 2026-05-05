import api from '../services/api';
import { effectiveDetailInventoryContribution } from '../utils/productUtils';

/**
 * Servicio para gestionar y validar inventario de productos
 * Ahora consulta la base de datos local en lugar de la API externa
 */

// Cache de stocks para evitar múltiples llamadas a la API
const stockCache = new Map();
const CACHE_DURATION = 60000; // 1 minuto en milisegundos

/**
 * Obtiene el stock disponible de un producto específico por talla y color
 * @param {string} productId - ID del producto
 * @param {string} size - Talla del producto
 * @param {string} color - Color del producto
 * @returns {Promise<number>} Stock disponible
 */
export const getProductStock = async (productId, size, color) => {
  const cacheKey = `${productId}-${size}-${color}`;
  const cached = stockCache.get(cacheKey);
  
  // Verificar si hay caché válido
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.stock;
  }

  try {
    // Obtener producto completo desde la base de datos local
    const response = await api.get(`/products/${productId}`);
    
    if (!response.data.success || !response.data.data) {
      return 0;
    }

    const product = response.data.data;
    
    if (!product || !product.detalles || product.detalles.length === 0) {
      return 0;
    }

    // Buscar el detalle específico que coincida con talla y color
    const detalle = product.detalles.find(d => 
      d.detalle === size && d.nombreColor === color
    );

    let stock = 0;
    
    if (detalle && detalle.inventario_d !== undefined) {
      stock = effectiveDetailInventoryContribution(detalle.inventario_d);
    } else if (product.inventario !== undefined) {
      stock = effectiveDetailInventoryContribution(product.inventario);
    } else if (product.stock !== undefined) {
      stock = effectiveDetailInventoryContribution(product.stock);
    }

    // Guardar en caché
    stockCache.set(cacheKey, {
      stock,
      timestamp: Date.now()
    });

    return stock;
  } catch (error) {
    // En caso de error, retornar 0 para prevenir agregar más al carrito
    return 0;
  }
};

/**
 * Valida si la cantidad solicitada está disponible en el inventario
 * @param {string} productId - ID del producto
 * @param {string} size - Talla del producto
 * @param {string} color - Color del producto
 * @param {number} requestedQuantity - Cantidad solicitada
 * @returns {Promise<{isValid: boolean, availableStock: number, message: string}>}
 */
export const validateStock = async (productId, size, color, requestedQuantity) => {
  const availableStock = await getProductStock(productId, size, color);

  if (requestedQuantity <= availableStock) {
    return {
      isValid: true,
      availableStock,
      message: 'Stock disponible'
    };
  }

  return {
    isValid: false,
    availableStock,
    message: availableStock > 0 
      ? `Solo hay ${availableStock} unidad${availableStock !== 1 ? 'es' : ''} disponible${availableStock !== 1 ? 's' : ''}`
      : 'Producto agotado'
  };
};

/**
 * Limpia el caché de inventario
 */
export const clearInventoryCache = () => {
  stockCache.clear();
};

/**
 * Limpia el caché de un producto específico
 * @param {string} productId - ID del producto
 * @param {string} size - Talla del producto
 * @param {string} color - Color del producto
 */
export const clearProductCache = (productId, size, color) => {
  const cacheKey = `${productId}-${size}-${color}`;
  stockCache.delete(cacheKey);
};

