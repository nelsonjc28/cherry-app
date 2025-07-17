import apiClient from './config/apiConfig';

/**
 * Service for managing product-related API calls
 */
const productsApi = {
  /**
   * Get featured products for home page
   * @param {number} limit - Maximum number of products to fetch
   * @returns {Promise} - Promise with products data
   */
  getFeaturedProducts: (limit = 8) => {
    return apiClient.get(`/products/featured?limit=${limit}`);
  },

  /**
   * Get products by category
   * @param {string} categoryId - Category identifier
   * @param {number} page - Page number for pagination
   * @param {number} limit - Items per page
   * @returns {Promise} - Promise with products data
   */
  getProductsByCategory: (categoryId, page = 1, limit = 12) => {
    return apiClient.get(`/products/category/${categoryId}?page=${page}&limit=${limit}`);
  },

  /**
   * Get product details by ID
   * @param {string} productId - Product identifier
   * @returns {Promise} - Promise with product details
   */
  getProductById: (productId) => {
    return apiClient.get(`/products/${productId}`);
  },

  /**
   * Search products by query
   * @param {string} query - Search term
   * @param {number} page - Page number for pagination
   * @param {number} limit - Items per page
   * @returns {Promise} - Promise with search results
   */
  searchProducts: (query, page = 1, limit = 20) => {
    return apiClient.get(`/products/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
  },

  /**
   * Get product reviews
   * @param {string} productId - Product identifier
   * @param {number} page - Page number for pagination
   * @returns {Promise} - Promise with reviews data
   */
  getProductReviews: (productId, page = 1) => {
    return apiClient.get(`/products/${productId}/reviews?page=${page}`);
  }
};

const CHERRY_API_URL = 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/';

// Función para generar URL de imagen S3
export const generateS3ImageUrl = (id_articulo) => {
  return `https://cherry-fotos.s3.amazonaws.com/shopify/${id_articulo}/${id_articulo}_1.jpg`;
};

// Función para generar múltiples URLs de imagen S3 para un producto
export const generateS3ImageUrls = (id_articulo, count = 4) => {
  const urls = [];
  for (let i = 1; i <= count; i++) {
    urls.push(`https://cherry-fotos.s3.amazonaws.com/shopify/${id_articulo}/${id_articulo}_${i}.jpg`);
  }
  return urls;
};

// Función para obtener todos los productos
export const getAllProducts = async () => {
  try {
    const response = await fetch(CHERRY_API_URL);
    if (!response.ok) {
      throw new Error('Error al obtener productos');
    }
    const products = await response.json();
    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

// Función para obtener productos por línea/categoría
export const getProductsByLine = async (lineId) => {
  try {
    const products = await getAllProducts();
    return products.filter(product => product.linea?.id_linea === lineId);
  } catch (error) {
    console.error('Error fetching products by line:', error);
    return [];
  }
};

// Función para obtener productos por descripción de línea
export const getProductsByLineDescription = async (lineDescription) => {
  try {
    const products = await getAllProducts();
    return products.filter(product => 
      product.linea?.descripcion?.toLowerCase().includes(lineDescription.toLowerCase())
    );
  } catch (error) {
    console.error('Error fetching products by line description:', error);
    return [];
  }
};

// Función para mapear productos de la API al formato de la app
export const mapApiProductToAppProduct = (apiProduct) => {
  // Generar URL de imagen S3 usando el id_articulo
  const image = generateS3ImageUrl(apiProduct.id_articulo);
  
  // Calcular precio con descuento si aplica
  const originalPrice = apiProduct.precio1 || 0;
  const discount = apiProduct.desc_promo || 0;
  const finalPrice = discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;
  
  // Obtener colores únicos de los detalles
  const colors = [...new Set(apiProduct.detalles?.map(d => d.nombreColor) || [])];
  
  return {
    id: apiProduct.id_articulo,
    title: apiProduct.descripcion,
    image: image,
    price: finalPrice,
    originalPrice: discount > 0 ? originalPrice : null,
    discount: discount > 0 ? discount : null,
    rating: 5, // Mantener rating por defecto
    description: apiProduct.descripcion,
    brand: apiProduct.marca,
    category: apiProduct.linea?.descripcion || 'Sin categoría',
    colors: colors,
    stock: apiProduct.inventario || 0,
    isActive: apiProduct.activo === 1,
    isNew: apiProduct.opc_nuevo === 'S',
    isPromo: apiProduct.opc_promo === 'S'
  };
};

// Función para obtener productos destacados (activos y con stock)
export const getFeaturedProducts = async (limit = 8) => {
  try {
    const products = await getAllProducts();
    const featured = products
      .filter(product => product.activo === 1 && product.inventario > 0)
      .slice(0, limit)
      .map(mapApiProductToAppProduct);
    return featured;
  } catch (error) {
    console.error('Error fetching featured products:', error);
    return [];
  }
};

// Función para obtener productos nuevos
export const getNewProducts = async (limit = 8) => {
  try {
    const products = await getAllProducts();
    const newProducts = products
      .filter(product => product.opc_nuevo === 'S' && product.activo === 1)
      .slice(0, limit)
      .map(mapApiProductToAppProduct);
    return newProducts;
  } catch (error) {
    console.error('Error fetching new products:', error);
    return [];
  }
};

// Función para obtener productos en promoción
export const getPromoProducts = async (limit = 8) => {
  try {
    const products = await getAllProducts();
    const promoProducts = products
      .filter(product => product.opc_promo === 'S' && product.desc_promo > 0)
      .slice(0, limit)
      .map(mapApiProductToAppProduct);
    return promoProducts;
  } catch (error) {
    console.error('Error fetching promo products:', error);
    return [];
  }
};

export default productsApi; 