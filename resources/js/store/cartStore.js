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

        const totalItems = items.reduce((sum, item) => {
          const baseQuantity = item.quantity || 0;
          const freeItems = item.freeItemsCount || 0;
          return sum + baseQuantity + freeItems;
        }, 0);

        const totalPrice = items.reduce((sum, item) => {
          if (item.isFreeItem) return sum;
          if (item.freeItemsCount && item.freeItemsCount > 0) {
            const itemPrice = item.price || item.precio || 0;
            return sum + itemPrice;
          }
          const itemPrice = item.price || item.precio || 0;
          const paidQuantity = item.quantity || 0;
          return sum + itemPrice * paidQuantity;
        }, 0);

        set({ totalItems, totalPrice });
      },

      // Add product to cart (con stock por talla y color)
      addToCart: (product, quantity = 1, productDetaill) => {
        const { items } = get();

        // Función para obtener stock de un producto específico
        const getStockForVariant = (product, color, size) => {
          if (!productDetaill?.detalles) return 0;
          const variant = productDetaill.detalles.find(v => v.nombreColor === color && v.detalle === size);
          return variant ? variant.inventario_d : 0;
        };

        const maxStock = getStockForVariant(product, product.selectedColor, product.selectedSize);
        if (maxStock === 0) {
           window.showToast("No hay stock para esta combinación de color y talla.",'error');
          return;
        }

        // Crear un item key único
        const existingIndex = items.findIndex(item =>
          item.id_articulo === product.id_articulo &&
          item.selectedColor === product.selectedColor &&
          item.selectedSize === product.selectedSize
        );

        let updatedItems = [...items];

        if (existingIndex !== -1) {
          const existing = updatedItems[existingIndex];
          const newQuantity = existing.quantity + quantity;

          if (newQuantity > maxStock) {
            updatedItems[existingIndex] = { ...existing, quantity: maxStock };
            window.showToast('Has alcanzado el stock máximo disponible para esta prenda.', 'error')
            process.exit();
          } else {
            updatedItems[existingIndex] = { ...existing, quantity: newQuantity };
          }
        } else {
          const qty = quantity > maxStock ? maxStock : quantity;
          if (quantity > maxStock) {
            window.showToast(`Solo hay ${maxStock} unidades disponibles para esta combinación.`, 'error')
          }
          updatedItems.push({ ...product, quantity: qty });
        }

        // Aplicar lógica de Buy X Get Y
        updatedItems = get().applyBuyXGetYOffers(updatedItems);

        // Recalcular totales
        const totalItems = updatedItems.reduce((sum, item) => {
          const baseQuantity = item.quantity || 0;
          const freeItems = item.freeItemsCount || 0;
          return sum + baseQuantity + freeItems;
        }, 0);

        const totalPrice = updatedItems.reduce((sum, item) => {
          if (item.isFreeItem) return sum;
          if (item.freeItemsCount && item.freeItemsCount > 0) {
            const itemPrice = item.price || item.precio || 0;
            return sum + itemPrice;
          }
          const itemPrice = item.price || item.precio || 0;
          const paidQuantity = item.quantity || 0;
          return sum + itemPrice * paidQuantity;
        }, 0);

        set({
          items: updatedItems,
          totalItems,
          totalPrice
        });
      },

      // El resto de tu store permanece intacto...
      updateQuantity: (productId, newQuantity, color, size) => {
        if (newQuantity < 1) return;

        const { items } = get();
        let updatedItems = items.map(item =>
          (item.id_articulo === productId &&
            item.selectedColor === color &&
            item.selectedSize === size)
            ? { ...item, quantity: newQuantity }
            : item
        );

        updatedItems = get().applyBuyXGetYOffers(updatedItems);

        const totalItems = updatedItems.reduce((sum, item) => {
          const baseQuantity = item.quantity || 0;
          const freeItems = item.freeItemsCount || 0;
          return sum + baseQuantity + freeItems;
        }, 0);
        const totalPrice = updatedItems.reduce((sum, item) => {
          if (item.isFreeItem) return sum;
          if (item.freeItemsCount && item.freeItemsCount > 0) {
            const itemPrice = item.price || item.precio || 0;
            return sum + itemPrice;
          }
          const itemPrice = item.price || item.precio || 0;
          const paidQuantity = item.quantity || 0;
          return sum + itemPrice * paidQuantity;
        }, 0);

        set({
          items: updatedItems,
          totalItems,
          totalPrice
        });
      },

      removeItem: (productId, color, size) => {
        const { items } = get();
        const updatedItems = items.filter(item =>
          !(item.id_articulo === productId &&
            item.selectedColor === color &&
            item.selectedSize === size)
        );

        const totalItems = updatedItems.reduce((sum, item) => sum + (item.quantity || 0) + (item.freeItemsCount || 0), 0);
        const totalPrice = updatedItems.reduce((sum, item) => {
          if (item.isFreeItem) return sum;
          if (item.freeItemsCount && item.freeItemsCount > 0) return sum + (item.price || item.precio || 0);
          return sum + (item.price || item.precio || 0) * (item.quantity || 0);
        }, 0);

        set({ items: updatedItems, totalItems, totalPrice });
      },

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

      applyBuyXGetYOffers: (items) => {
        // Tu lógica original de Buy X Get Y
        let updatedItems = [...items];
        // ... resto de la función permanece igual
        return updatedItems;
      },

      recalculateTotals: () => {
        const { items } = get();
        const totalItems = items.reduce((sum, item) => (sum + (item.quantity || 0) + (item.freeItemsCount || 0)), 0);
        const totalPrice = items.reduce((sum, item) => {
          if (item.isFreeItem) return sum;
          if (item.freeItemsCount && item.freeItemsCount > 0) return sum + (item.price || item.precio || 0);
          return sum + (item.price || item.precio || 0) * (item.quantity || 0);
        }, 0);
        set({ totalItems, totalPrice });
      }
    }),
    {
      name: 'cherry-central-cart',
      partialize: (state) => ({
        items: state.items,
        totalItems: state.totalItems,
        totalPrice: state.totalPrice,
        couponCode: state.couponCode,
        discount: state.discount
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.items) {
          const totalItems = state.items.reduce((sum, item) => (sum + (item.quantity || 0) + (item.freeItemsCount || 0)), 0);
          const totalPrice = state.items.reduce((sum, item) => {
            if (item.isFreeItem) return sum;
            if (item.freeItemsCount && item.freeItemsCount > 0) return sum + (item.price || item.precio || 0);
            return sum + (item.price || item.precio || 0) * (item.quantity || 0);
          }, 0);
          state.totalItems = totalItems;
          state.totalPrice = totalPrice;
        }
      }
    }
  )
);

export default useCartStore;