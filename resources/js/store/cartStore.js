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
          // Sumar la cantidad total incluyendo items gratuitos
          const baseQuantity = item.quantity || 0;
          const freeItems = item.freeItemsCount || 0;
          return sum + baseQuantity + freeItems;
        }, 0);
        const totalPrice = items.reduce((sum, item) => {
          // Para productos completamente gratis (isFreeItem), no sumar al total
          if (item.isFreeItem) {
            return sum;
          }
          // Para productos con algunos items gratuitos, usar el precio ya ajustado
          if (item.freeItemsCount && item.freeItemsCount > 0) {
            // El precio ya está ajustado para solo los items pagados
            const itemPrice = item.price || item.precio || 0;
            return sum + itemPrice;
          }
          // Para productos normales (sin descuentos)
          const itemPrice = item.price || item.precio || 0;
          const paidQuantity = item.quantity || 0;
          return sum + (itemPrice * paidQuantity);
        }, 0);
        set({ totalItems, totalPrice });
      },

      // Add product to cart (solo local)
      addToCart: (product, quantity = 1) => {
        const { items } = get();
        
        // Create a unique key for the item based on product ID, color, and size
        const itemKey = `${product.id_articulo}-${product.selectedColor}-${product.selectedSize}`;
        
        // Check if item already exists in cart (considering if it's a free item)
        const existingItemIndex = items.findIndex(item => 
          item.id_articulo === product.id_articulo &&
          item.selectedColor === product.selectedColor &&
          item.selectedSize === product.selectedSize &&
          item.isFreeItem === product.isFreeItem
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

        // Aplicar lógica de Buy X Get Y después de agregar el producto
        updatedItems = get().applyBuyXGetYOffers(updatedItems);

        // Calculate totals
        const totalItems = updatedItems.reduce((sum, item) => {
          // Sumar la cantidad total incluyendo items gratuitos
          const baseQuantity = item.quantity || 0;
          const freeItems = item.freeItemsCount || 0;
          return sum + baseQuantity + freeItems;
        }, 0);
        const totalPrice = updatedItems.reduce((sum, item) => {
          // Para productos completamente gratis (isFreeItem), no sumar al total
          if (item.isFreeItem) {
            return sum;
          }
          // Para productos con algunos items gratuitos, usar el precio ya ajustado
          if (item.freeItemsCount && item.freeItemsCount > 0) {
            // El precio ya está ajustado para solo los items pagados
            const itemPrice = item.price || item.precio || 0;
            return sum + itemPrice;
          }
          // Para productos normales (sin descuentos)
          const itemPrice = item.price || item.precio || 0;
          const paidQuantity = item.quantity || 0;
          return sum + (itemPrice * paidQuantity);
        }, 0);

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
        let updatedItems = items.map(item => 
          (item.id_articulo === productId && 
           item.selectedColor === color && 
           item.selectedSize === size)
            ? { ...item, quantity: newQuantity }
            : item
        );

        // Aplicar lógica de Buy X Get Y después de actualizar la cantidad
        updatedItems = get().applyBuyXGetYOffers(updatedItems);

        const totalItems = updatedItems.reduce((sum, item) => {
          // Sumar la cantidad total incluyendo items gratuitos
          const baseQuantity = item.quantity || 0;
          const freeItems = item.freeItemsCount || 0;
          return sum + baseQuantity + freeItems;
        }, 0);
        const totalPrice = updatedItems.reduce((sum, item) => {
          // Para productos completamente gratis (isFreeItem), no sumar al total
          if (item.isFreeItem) {
            return sum;
          }
          // Para productos con algunos items gratuitos, usar el precio ya ajustado
          if (item.freeItemsCount && item.freeItemsCount > 0) {
            // El precio ya está ajustado para solo los items pagados
            const itemPrice = item.price || item.precio || 0;
            return sum + itemPrice;
          }
          // Para productos normales (sin descuentos)
          const itemPrice = item.price || item.precio || 0;
          const paidQuantity = item.quantity || 0;
          return sum + (itemPrice * paidQuantity);
        }, 0);

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
        const totalPrice = updatedItems.reduce((sum, item) => {
          // Para productos gratis (isFreeItem), no sumar al total
          if (item.isFreeItem) {
            return sum;
          }
          // Usar el precio correcto (price o precio)
          const itemPrice = item.price || item.precio || 0;
          return sum + (itemPrice * item.quantity);
        }, 0);

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

      // Aplicar ofertas Buy X Get Y al carrito
      applyBuyXGetYOffers: (items) => {
        const updatedItems = [...items];
        
        // Primero limpiar todas las ofertas anteriores
        updatedItems.forEach((item, index) => {
          if (item.isFreeItem || item.freeItemsCount) {
            updatedItems[index] = {
              ...item,
              price: item.originalPrice || item.price,
              precio: item.originalPrice || item.precio,
              isFreeItem: false,
              freeItemsCount: 0,
              freeItemReason: null
            };
          }
        });
        
        // Agrupar productos por ID y oferta
        const productGroups = {};
        
        updatedItems.forEach(item => {
          if (!item.isFreeItem && !item.freeItemsCount && item.userOffer && item.userOffer.type === 'buy_x_get_y') {
            const productId = item.id_articulo;
            const offer = item.userOffer;
            
            if (!productGroups[productId]) {
              productGroups[productId] = {
                items: [],
                totalQuantity: 0,
                offer: offer
              };
            }
            
            productGroups[productId].items.push(item);
            productGroups[productId].totalQuantity += item.quantity;
          }
        });
        
        // Aplicar lógica Buy X Get Y para cada grupo de productos
        Object.values(productGroups).forEach(group => {
          const { items: groupItems, totalQuantity, offer } = group;
          const buyQuantity = offer.buy_quantity || 1;
          const getQuantity = offer.get_quantity || 1;
          
          // Calcular cuántos productos deben ser gratis
          // Lógica "X por Y": por cada "buyQuantity" productos, solo se paga "getQuantity"
          // Ejemplo: "2 X 1" = por cada 2 productos, solo se paga 1 (1 gratis)
          const groups = Math.floor(totalQuantity / buyQuantity);
          const freeItems = groups * (buyQuantity - getQuantity);
          const totalPaid = totalQuantity - freeItems;
          
          if (freeItems > 0) {
            // Aplicar descuento a los últimos items (los que serán gratis)
            let freeItemsApplied = 0;
            
            // Ordenar items por precio (más caros primero) para aplicar descuento a los más caros
            const sortedItems = updatedItems
              .filter(item => item.id_articulo === groupItems[0].id_articulo && !item.isFreeItem)
              .sort((a, b) => (b.precio || b.price || 0) - (a.precio || a.price || 0));
            
            for (const item of sortedItems) {
              if (freeItemsApplied >= freeItems) break;
              
              const itemIndex = updatedItems.findIndex(i => i === item);
              if (itemIndex === -1) continue;
              
              // Aplicar gratis hasta completar el total de gratis calculado
              const itemsToMakeFree = Math.min(freeItems - freeItemsApplied, item.quantity);
              
              if (itemsToMakeFree > 0) {
                if (itemsToMakeFree === item.quantity) {
                  // Todo el item es gratis
                  updatedItems[itemIndex] = {
                    ...item,
                    price: 0,
                    precio: 0,
                    originalPrice: item.price || item.precio,
                    isFreeItem: true,
                    freeItemReason: `🎁 Gratis por oferta: ${buyQuantity} X ${getQuantity}`
                  };
                } else {
                  // Solo algunos items son gratis
                  // Calcular el precio ajustado: solo cobrar por los items pagados
                  const paidQuantity = item.quantity - itemsToMakeFree;
                  const adjustedPrice = paidQuantity > 0 ? (item.price || item.precio) : 0;
                  
                  updatedItems[itemIndex] = {
                    ...item,
                    price: adjustedPrice,
                    precio: adjustedPrice,
                    originalPrice: item.price || item.precio,
                    freeItemsCount: itemsToMakeFree,
                    freeItemReason: `🎁 ${itemsToMakeFree} gratis por oferta: ${buyQuantity} X ${getQuantity}`
                  };
                }
                
                freeItemsApplied += itemsToMakeFree;
              }
            }
          } else {
            // Si no hay productos gratis, limpiar cualquier marca de gratis
            updatedItems.forEach((item, index) => {
              if (item.id_articulo === groupItems[0].id_articulo && (item.isFreeItem || item.freeItemsCount)) {
                updatedItems[index] = {
                  ...item,
                  price: item.originalPrice || item.price,
                  precio: item.originalPrice || item.precio,
                  isFreeItem: false,
                  freeItemsCount: 0,
                  freeItemReason: null
                };
              }
            });
          }
        });
        
        return updatedItems;
      },

      // Recalculate totals (useful for debugging)
      recalculateTotals: () => {
        const { items } = get();
        const totalItems = items.reduce((sum, item) => {
          // Sumar la cantidad total incluyendo items gratuitos
          const baseQuantity = item.quantity || 0;
          const freeItems = item.freeItemsCount || 0;
          return sum + baseQuantity + freeItems;
        }, 0);
        const totalPrice = items.reduce((sum, item) => {
          // Para productos completamente gratis (isFreeItem), no sumar al total
          if (item.isFreeItem) {
            return sum;
          }
          // Para productos con algunos items gratuitos, usar el precio ya ajustado
          if (item.freeItemsCount && item.freeItemsCount > 0) {
            // El precio ya está ajustado para solo los items pagados
            const itemPrice = item.price || item.precio || 0;
            return sum + itemPrice;
          }
          // Para productos normales (sin descuentos)
          const itemPrice = item.price || item.precio || 0;
          const paidQuantity = item.quantity || 0;
          return sum + (itemPrice * paidQuantity);
        }, 0);
        set({ totalItems, totalPrice });
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
          const totalItems = state.items.reduce((sum, item) => {
            // Sumar la cantidad total incluyendo items gratuitos
            const baseQuantity = item.quantity || 0;
            const freeItems = item.freeItemsCount || 0;
            return sum + baseQuantity + freeItems;
          }, 0);
          const totalPrice = state.items.reduce((sum, item) => {
            // Para productos completamente gratis (isFreeItem), no sumar al total
            if (item.isFreeItem) {
              return sum;
            }
            // Para productos con algunos items gratuitos, solo sumar los pagados
            const itemPrice = item.price || item.precio || 0;
            const paidQuantity = item.quantity || 0;
            return sum + (itemPrice * paidQuantity);
          }, 0);
          state.totalItems = totalItems;
          state.totalPrice = totalPrice;
        }
      }
    }
  )
);

export default useCartStore; 
