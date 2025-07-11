import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cartApi } from '../api';

/**
 * Store for managing shopping cart state
 * Using Zustand with persist middleware to keep cart state in localStorage
 */
const useCartStore = create(
  persist(
    (set, get) => ({
      // Cart state
      items: [
        {
          id: '1',
          productId: '50521255112',
          name: 'Chamarra de mezclilla con detalles bordados',
          price: 1899.00,
          image: '/images/catalogProductImages/Rectangle 4922.png',
          quantity: 4
        },
        {
          id: '2',
          productId: '50521255112',
          name: 'Chamarra de mezclilla con detalles bordados',
          price: 1899.00,
          image: '/images/catalogProductImages/Rectangle 4922 (1).png',
          quantity: 4
        },
        {
          id: '3',
          productId: '50521255112',
          name: 'Chamarra de mezclilla con detalles bordados',
          price: 1899.00,
          image: '/images/catalogProductImages/Rectangle 4922.png',
          quantity: 4
        }
      ],
      totalItems: 3,
      totalPrice: 15192.00,
      isLoading: false,
      error: null,
      couponCode: null,
      discount: 0,
      
      // Initialize cart from API (used after login)
      initCart: async () => {
        set({ isLoading: true, error: null });
        try {
          // Get cart from API
          const response = await cartApi.getCart();
          const cartData = response.data;
          
          // Calculate totals
          const totalItems = cartData.items.reduce((sum, item) => sum + item.quantity, 0);
          const totalPrice = cartData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          
          // Update state
          set({
            items: cartData.items,
            totalItems,
            totalPrice,
            couponCode: cartData.couponCode || null,
            discount: cartData.discount || 0,
            isLoading: false
          });
        } catch (error) {
          set({ 
            error: error.message || 'Error loading cart',
            isLoading: false
          });
          console.error('Error loading cart:', error);
        }
      },
      
      // Add product to cart
      addToCart: async (product, quantity = 1) => {
        set({ isLoading: true, error: null });
        
        try {
          // Check if item already exists in cart
          const { items } = get();
          const existingItem = items.find(item => item.productId === product.id);
          
          let updatedItems;
          
          if (existingItem) {
            // Update existing item quantity through API
            await cartApi.updateCartItem(existingItem.id, existingItem.quantity + quantity);
            
            // Update items locally for immediate feedback
            updatedItems = items.map(item => 
              item.productId === product.id 
                ? { ...item, quantity: item.quantity + quantity } 
                : item
            );
          } else {
            // Add new item through API
            const response = await cartApi.addToCart(product.id, quantity);
            const newItem = response.data;
            
            // Add new item to local state
            updatedItems = [...items, {
              id: newItem.id,
              productId: product.id,
              name: product.title,
              price: product.price,
              image: product.image,
              quantity
            }];
          }
          
          // Calculate new totals
          const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
          const totalPrice = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          
          set({
            items: updatedItems,
            totalItems,
            totalPrice,
            isLoading: false
          });
        } catch (error) {
          set({ 
            error: error.message || 'Error adding to cart',
            isLoading: false
          });
          console.error('Error adding to cart:', error);
        }
      },
      
      // Update item quantity
      updateQuantity: async (itemId, quantity) => {
        if (quantity <= 0) {
          // If quantity is 0 or negative, remove item
          return get().removeItem(itemId);
        }
        
        set({ isLoading: true, error: null });
        
        try {
          // Update item through API
          await cartApi.updateCartItem(itemId, quantity);
          
          // Update local state
          const { items } = get();
          const updatedItems = items.map(item =>
            item.id === itemId ? { ...item, quantity } : item
          );
          
          // Calculate new totals
          const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
          const totalPrice = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          
          set({
            items: updatedItems,
            totalItems,
            totalPrice,
            isLoading: false
          });
        } catch (error) {
          set({ 
            error: error.message || 'Error updating quantity',
            isLoading: false
          });
          console.error('Error updating quantity:', error);
        }
      },
      
      // Remove item from cart
      removeItem: async (itemId) => {
        set({ isLoading: true, error: null });
        
        try {
          // Remove item through API
          await cartApi.removeCartItem(itemId);
          
          // Update local state
          const { items } = get();
          const updatedItems = items.filter(item => item.id !== itemId);
          
          // Calculate new totals
          const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
          const totalPrice = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          
          set({
            items: updatedItems,
            totalItems,
            totalPrice,
            isLoading: false
          });
        } catch (error) {
          set({ 
            error: error.message || 'Error removing item',
            isLoading: false
          });
          console.error('Error removing item:', error);
        }
      },
      
      // Clear entire cart
      clearCart: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // Clear cart through API
          await cartApi.clearCart();
          
          // Reset local state
          set({
            items: [],
            totalItems: 0,
            totalPrice: 0,
            couponCode: null,
            discount: 0,
            isLoading: false
          });
        } catch (error) {
          set({ 
            error: error.message || 'Error clearing cart',
            isLoading: false
          });
          console.error('Error clearing cart:', error);
        }
      },
      
      // Apply coupon code
      applyCoupon: async (couponCode) => {
        set({ isLoading: true, error: null });
        
        try {
          // Apply coupon through API
          const response = await cartApi.applyCoupon(couponCode);
          const { discount } = response.data;
          
          set({
            couponCode,
            discount,
            isLoading: false
          });
        } catch (error) {
          set({ 
            error: error.message || 'Invalid coupon code',
            isLoading: false
          });
          console.error('Error applying coupon:', error);
        }
      },
      
      // Remove coupon
      removeCoupon: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // Remove coupon through API
          await cartApi.removeCoupon();
          
          set({
            couponCode: null,
            discount: 0,
            isLoading: false
          });
        } catch (error) {
          set({ 
            error: error.message || 'Error removing coupon',
            isLoading: false
          });
          console.error('Error removing coupon:', error);
        }
      }
    }),
    {
      name: 'cherry-central-cart', // Local storage key
      // Only persist specific fields (not loading states or errors)
      partialize: (state) => ({
        items: state.items,
        totalItems: state.totalItems,
        totalPrice: state.totalPrice,
        couponCode: state.couponCode,
        discount: state.discount
      })
    }
  )
);

export default useCartStore; 