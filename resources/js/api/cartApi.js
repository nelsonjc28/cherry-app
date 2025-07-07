import apiClient from './config/apiConfig';

/**
 * Service for managing shopping cart operations
 */
const cartApi = {
  /**
   * Get current user's cart
   * @returns {Promise} - Promise with cart data
   */
  getCart: () => {
    return apiClient.get('/cart');
  },

  /**
   * Add product to cart
   * @param {string} productId - Product identifier
   * @param {number} quantity - Quantity to add (default: 1)
   * @returns {Promise} - Promise with updated cart data
   */
  addToCart: (productId, quantity = 1) => {
    return apiClient.post('/cart/items', { productId, quantity });
  },

  /**
   * Update cart item quantity
   * @param {string} itemId - Cart item identifier
   * @param {number} quantity - New quantity
   * @returns {Promise} - Promise with updated cart data
   */
  updateCartItem: (itemId, quantity) => {
    return apiClient.put(`/cart/items/${itemId}`, { quantity });
  },

  /**
   * Remove item from cart
   * @param {string} itemId - Cart item identifier
   * @returns {Promise} - Promise with updated cart data
   */
  removeCartItem: (itemId) => {
    return apiClient.delete(`/cart/items/${itemId}`);
  },

  /**
   * Clear all items from cart
   * @returns {Promise} - Promise with empty cart confirmation
   */
  clearCart: () => {
    return apiClient.delete('/cart/items');
  },

  /**
   * Apply coupon code to cart
   * @param {string} couponCode - Coupon code to apply
   * @returns {Promise} - Promise with updated cart including discounts
   */
  applyCoupon: (couponCode) => {
    return apiClient.post('/cart/coupon', { couponCode });
  },

  /**
   * Remove coupon from cart
   * @returns {Promise} - Promise with updated cart without discounts
   */
  removeCoupon: () => {
    return apiClient.delete('/cart/coupon');
  }
};

export default cartApi; 