/**
 * Utilidad para manejar productos vistos recientemente en localStorage
 * 
 * Características:
 * - Máximo 10 productos
 * - Sin duplicados (el más reciente se mantiene)
 * - El producto más reciente está al inicio del array
 */

const STORAGE_KEY = 'cherry_recently_viewed';
const MAX_PRODUCTS = 10;

/**
 * Obtiene la lista de IDs de productos vistos recientemente
 * @returns {string[]} Array de IDs de productos (más reciente primero)
 */
export const getRecentlyViewedIds = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const ids = JSON.parse(stored);
    return Array.isArray(ids) ? ids : [];
  } catch (error) {
    console.error('Error al obtener productos vistos recientemente:', error);
    return [];
  }
};

/**
 * Agrega un producto a la lista de vistos recientemente
 * Si ya existe, lo mueve al inicio (más reciente)
 * Si hay más de MAX_PRODUCTS, elimina el más antiguo
 * 
 * @param {string} productId - ID del producto a agregar
 */
export const addRecentlyViewed = (productId) => {
  if (!productId) {
    return;
  }

  try {
    const currentIds = getRecentlyViewedIds();
    
    // Remover el producto si ya existe (para evitar duplicados)
    const filteredIds = currentIds.filter(id => id !== productId);
    
    // Agregar al inicio (más reciente primero)
    const newIds = [productId, ...filteredIds];
    
    // Limitar a MAX_PRODUCTS
    const limitedIds = newIds.slice(0, MAX_PRODUCTS);
    
    // Guardar en localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedIds));
  } catch (error) {
    console.error('Error al guardar producto visto recientemente:', error);
  }
};

/**
 * Elimina un producto de la lista de vistos recientemente
 * @param {string} productId - ID del producto a eliminar
 */
export const removeRecentlyViewed = (productId) => {
  if (!productId) {
    return;
  }

  try {
    const currentIds = getRecentlyViewedIds();
    const filteredIds = currentIds.filter(id => id !== productId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredIds));
  } catch (error) {
    console.error('Error al eliminar producto visto recientemente:', error);
  }
};

/**
 * Limpia toda la lista de productos vistos recientemente
 */
export const clearRecentlyViewed = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error al limpiar productos vistos recientemente:', error);
  }
};

/**
 * Obtiene el número de productos vistos recientemente
 * @returns {number} Cantidad de productos
 */
export const getRecentlyViewedCount = () => {
  return getRecentlyViewedIds().length;
};
