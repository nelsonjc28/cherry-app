const API_BASE_URL = '/api';

// Cart API functions
export const cartApi = {
  // Get cart from database
  getCart: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/cart`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token inválido, limpiar
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return null;
        }
        throw new Error('Error fetching cart');
      }
      
      const data = await response.json();
      return data.cart;
    } catch (error) {
      return null;
    }
  },

  // Update cart in database
  updateCart: async (cartData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/cart`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cartData)
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return null;
        }
        throw new Error('Error updating cart');
      }
      
      const data = await response.json();
      return data.cart;
    } catch (error) {
      return null;
    }
  },

  // Clear cart in database
  clearCart: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/cart`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return null;
        }
        throw new Error('Error clearing cart');
      }
      
      return await response.json();
    } catch (error) {
      return null;
    }
  },

  // Sync cart from localStorage to database
  syncCart: async (cartData) => {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/cart/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cartData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return null;
        }
        throw new Error(`Error syncing cart: ${response.status} - ${JSON.stringify(errorData)}`);
      }
      
      const data = await response.json();
      
      if (!data.cart) {
        return null;
      }
      
      return data.cart;
    } catch (error) {
      return null;
    }
  },

  // Legacy methods (kept for compatibility but not used)
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
    const response = await fetch(`${API_BASE_URL}/cart`, {
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
