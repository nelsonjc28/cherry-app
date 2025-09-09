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

export default productsApi; 
