/**
 * Utilidades para manejar imágenes de productos desde AWS S3
 */

/**
 * Genera la URL de imagen principal de un producto desde AWS S3
 * @param {string} externalProductId - ID externo del producto
 * @param {number} imageNumber - Número de imagen (por defecto 1)
 * @returns {string} URL completa de la imagen
 */
export const getProductImageUrl = (externalProductId, imageNumber = 1) => {
  if (!externalProductId) {
    return '/images/placeholder-product.png';
  }
  
  // Construir URL de AWS S3 basada en el ID del producto
  return `https://cherry-fotos.s3.amazonaws.com/shopify/${externalProductId}/${externalProductId}_${imageNumber}.jpg`;
};

/**
 * Genera la URL de imagen de catálogo desde AWS S3
 * @param {string} externalProductId - ID externo del producto
 * @param {number} imageNumber - Número de imagen (por defecto 1)
 * @returns {string} URL completa de la imagen
 */
export const getCatalogImageUrl = (externalProductId, imageNumber = 1) => {
  return getProductImageUrl(externalProductId, imageNumber);
};

/**
 * Genera múltiples URLs de imagen para un producto (para galería)
 * @param {string} externalProductId - ID externo del producto
 * @param {number} maxImages - Número máximo de imágenes a generar
 * @returns {Array<string>} Array de URLs de imágenes
 */
export const getProductImageGallery = (externalProductId, maxImages = 5) => {
  if (!externalProductId) {
    return ['/images/placeholder-product.png'];
  }
  
  const images = [];
  for (let i = 1; i <= maxImages; i++) {
    images.push(getProductImageUrl(externalProductId, i));
  }
  
  return images;
};

/**
 * Verifica si una imagen existe (hace una petición HEAD)
 * @param {string} imageUrl - URL de la imagen a verificar
 * @returns {Promise<boolean>} true si la imagen existe
 */
export const checkImageExists = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Obtiene la primera imagen disponible de un producto
 * @param {string} externalProductId - ID externo del producto
 * @param {number} maxAttempts - Número máximo de intentos
 * @returns {Promise<string>} URL de la primera imagen disponible
 */
export const getFirstAvailableImage = async (externalProductId, maxAttempts = 3) => {
  if (!externalProductId) {
    return '/images/placeholder-product.png';
  }
  
  for (let i = 1; i <= maxAttempts; i++) {
    const imageUrl = getProductImageUrl(externalProductId, i);
    if (await checkImageExists(imageUrl)) {
      return imageUrl;
    }
  }
  
  // Si no se encuentra ninguna imagen, devolver placeholder
  return '/images/placeholder-product.png';
};
