import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store for managing shopping cart state (solo frontend/localStorage)
 */
const useCartStore = create(
  persist(
    (set, get) => ({
      // Cart state
      items: [],
      totalItems: 0,
      totalPrice: 0,
      isLoading: false,
      error: null,
      couponCode: null,
      discount: 0,

      // Initialize cart from localStorage
      initCart: () => {
        const { items } = get();
        const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        set({ totalItems, totalPrice });
      },

      // Add product to cart (solo local)
      addToCart: (product, quantity = 1) => {
        set({ isLoading: true, error: null });
        const { items } = get();
        const existingItem = items.find(item => item.id === product.id && item.selectedColor === product.selectedColor && item.selectedSize === product.selectedSize);
        let updatedItems;
        if (existingItem) {
          updatedItems = items.map(item =>
            item.id === product.id && item.selectedColor === product.selectedColor && item.selectedSize === product.selectedSize
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          updatedItems = [
            ...items,
            {
              ...product,
              quantity
            }
          ];
        }
        const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        set({ items: updatedItems, totalItems, totalPrice, isLoading: false });
      },

      // Update item quantity (solo local)
      updateQuantity: (itemId, quantity, selectedColor, selectedSize) => {
        if (quantity <= 0) {
          return get().removeItem(itemId, selectedColor, selectedSize);
        }
        set({ isLoading: true, error: null });
        const { items } = get();
        const updatedItems = items.map(item =>
          item.id === itemId && item.selectedColor === selectedColor && item.selectedSize === selectedSize
            ? { ...item, quantity }
            : item
        );
        const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        set({ items: updatedItems, totalItems, totalPrice, isLoading: false });
      },

      // Remove item from cart (solo local)
      removeItem: (itemId, selectedColor, selectedSize) => {
        set({ isLoading: true, error: null });
        const { items } = get();
        const updatedItems = items.filter(item => !(item.id === itemId && item.selectedColor === selectedColor && item.selectedSize === selectedSize));
        const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        set({ items: updatedItems, totalItems, totalPrice, isLoading: false });
      },

      // Clear entire cart (solo local)
      clearCart: () => {
        set({
          items: [],
          totalItems: 0,
          totalPrice: 0,
          couponCode: null,
          discount: 0,
          isLoading: false
        });
      },
    }),
    {
      name: 'cherry-central-cart', // Local storage key
      partialize: (state) => ({
        items: state.items,
        totalItems: state.totalItems,
        totalPrice: state.totalPrice,
        couponCode: state.couponCode,
        discount: state.discount
      }),
      onRehydrateStorage: () => (state) => {
        // Recalculate totals when store is rehydrated from localStorage
        if (state && state.items) {
          const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);
          const totalPrice = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          state.totalItems = totalItems;
          state.totalPrice = totalPrice;
        }
      }
    }
  )
);

export default useCartStore; 