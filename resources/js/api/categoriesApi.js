import apiClient from './config/apiConfig';

/**
 * Service for managing category-related API calls
 */
const categoriesApi = {
  /**
   * Get all categories
   * @returns {Promise} - Promise with categories data
   */
  getAllCategories: () => {
    return apiClient.get('/categories');
  },

  /**
   * Get category by ID
   * @param {string} categoryId - Category identifier
   * @returns {Promise} - Promise with category details
   */
  getCategoryById: (categoryId) => {
    return apiClient.get(`/categories/${categoryId}`);
  },

  /**
   * Get featured categories for home page display
   * @param {number} limit - Maximum number of categories to fetch
   * @returns {Promise} - Promise with featured categories data
   */
  getFeaturedCategories: (limit = 6) => {
    return apiClient.get(`/categories/featured?limit=${limit}`);
  },

  /**
   * Get subcategories for a parent category
   * @param {string} parentCategoryId - Parent category identifier
   * @returns {Promise} - Promise with subcategories data
   */
  getSubcategories: (parentCategoryId) => {
    return apiClient.get(`/categories/${parentCategoryId}/subcategories`);
  }
};

export default categoriesApi; 
