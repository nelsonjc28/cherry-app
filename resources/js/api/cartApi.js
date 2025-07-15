const API_BASE_URL = '/api';

// Cart API functions
export const cartApi = {
  // Get cart
  getCart: async () => {
    const response = await fetch(`${API_BASE_URL}/cart`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Error fetching cart');
    }
    
    return response.json();
  },

  // Add item to cart
  addToCart: async (productId, quantity = 1) => {
    const response = await fetch(`${API_BASE_URL}/cart/add`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ productId, quantity })
    });
    
    if (!response.ok) {
      throw new Error('Error adding item to cart');
    }
    
    return response.json();
  },

  // Update cart item quantity
  updateCartItem: async (itemId, quantity) => {
    const response = await fetch(`${API_BASE_URL}/cart/update`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ itemId, quantity })
    });
    
    if (!response.ok) {
      throw new Error('Error updating cart item');
    }
    
    return response.json();
  },

  // Remove item from cart
  removeCartItem: async (itemId) => {
    const response = await fetch(`${API_BASE_URL}/cart/remove`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ itemId })
    });
    
    if (!response.ok) {
      throw new Error('Error removing item from cart');
    }
    
    return response.json();
  },

  // Apply coupon
  applyCoupon: async (code) => {
    const response = await fetch(`${API_BASE_URL}/cart/coupon`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });
    
    if (!response.ok) {
      throw new Error('Invalid coupon code');
    }
    
    return response.json();
  },

  // Remove coupon
  removeCoupon: async () => {
    const response = await fetch(`${API_BASE_URL}/cart/coupon`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Error removing coupon');
    }
    
    return response.json();
  },

  // Clear cart
  clearCart: async () => {
    const response = await fetch(`${API_BASE_URL}/cart/clear`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Error clearing cart');
    }
    
    return response.json();
  }
}; 