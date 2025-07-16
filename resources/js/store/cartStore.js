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
        const { items } = get();
        
        // Create a unique key for the item based on product ID, color, and size
        const itemKey = `${product.id_articulo}-${product.selectedColor}-${product.selectedSize}`;
        
        // Check if item already exists in cart
        const existingItemIndex = items.findIndex(item => 
          item.id_articulo === product.id_articulo &&
          item.selectedColor === product.selectedColor &&
          item.selectedSize === product.selectedSize
        );

        let updatedItems;
        
        if (existingItemIndex !== -1) {
          // Update existing item quantity
          updatedItems = items.map((item, index) => 
            index === existingItemIndex 
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          // Add new item to cart
          const newItem = {
            ...product,
            quantity
          };
          updatedItems = [...items, newItem];
        }

        // Calculate totals
        const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = updatedItems.reduce((sum, item) => sum + (item.precio * item.quantity), 0);

        set({
          items: updatedItems,
          totalItems,
          totalPrice
        });
      },

      // Update item quantity (solo local)
      updateQuantity: (productId, newQuantity, color, size) => {
        if (newQuantity < 1) return;

        const { items } = get();
        const updatedItems = items.map(item => 
          (item.id_articulo === productId && 
           item.selectedColor === color && 
           item.selectedSize === size)
            ? { ...item, quantity: newQuantity }
            : item
        );

        const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = updatedItems.reduce((sum, item) => sum + (item.precio * item.quantity), 0);

        set({
          items: updatedItems,
          totalItems,
          totalPrice
        });
      },

      // Remove item from cart (solo local)
      removeItem: (productId, color, size) => {
        const { items } = get();
        const updatedItems = items.filter(item => 
          !(item.id_articulo === productId && 
            item.selectedColor === color && 
            item.selectedSize === size)
        );

        const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = updatedItems.reduce((sum, item) => sum + (item.precio * item.quantity), 0);

        set({
          items: updatedItems,
          totalItems,
          totalPrice
        });
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