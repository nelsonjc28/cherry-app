import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cartApi } from '../api/cartApi';

/**
 * Helper function to calculate item price considering Buy X Get Y offers
 */
const calculateItemPrice = (item) => {
  if (item.isFreeItem) return 0;
  
  const itemPrice = item.price || item.precio || 0;
  const quantity = item.quantity || 0;
  
  // Si tiene oferta Buy X Get Y, calcular precio basado en items pagados
  if (item.userOffer?.discount_category === 'buy_x_get_y') {
    // Usar _paidQuantity si está disponible (calculado por applyBuyXGetYOffers)
    if (item._paidQuantity !== undefined) {
      console.log('Calculando precio Buy X Get Y:', {
        productId: item.id_articulo,
        quantity,
        _paidQuantity: item._paidQuantity,
        itemPrice,
        totalPrice: itemPrice * item._paidQuantity
      });
      return itemPrice * item._paidQuantity;
    }
    
    // Si no tiene _paidQuantity pero tiene freeItemsCount, calcularlo
    if (item.freeItemsCount && item.freeItemsCount > 0) {
      const paidQuantity = quantity - item.freeItemsCount;
      console.log('Calculando precio Buy X Get Y (fallback):', {
        productId: item.id_articulo,
        quantity,
        freeItemsCount: item.freeItemsCount,
        paidQuantity,
        itemPrice,
        totalPrice: itemPrice * paidQuantity
      });
      return itemPrice * paidQuantity;
    }
  }
  
  // Si tiene freeItemsCount pero no es Buy X Get Y (caso legacy)
  if (item.freeItemsCount && item.freeItemsCount > 0) {
    return itemPrice;
  }
  
  // Item normal sin ofertas
  return itemPrice * quantity;
};

/**
 * Helper function to check if user is authenticated
 */
const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return !!token;
};

/**
 * Helper function to save cart to database (if authenticated)
 */
const saveCartToDatabase = async (cartState) => {
  if (!isAuthenticated()) {
    return; // No guardar en BD si no hay sesión
  }

  try {
    await cartApi.updateCart({
      items: cartState.items,
      total_items: cartState.totalItems,
      total_price: cartState.totalPrice,
      coupon_code: cartState.couponCode,
      discount: cartState.discount
    });
  } catch (error) {
    console.error('Error saving cart to database:', error);
    // No lanzar error, solo loguear para no interrumpir el flujo
  }
};

/**
 * Store for managing shopping cart state
 * - Si hay sesión: guarda en BD y localStorage
 * - Si no hay sesión: guarda solo en localStorage
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
      isInitialized: false,

      // Initialize cart - carga desde BD si hay sesión, sino desde localStorage
      initCart: async (forceReload = false) => {
        const { isInitialized } = get();
        if (isInitialized && !forceReload) {
          return; // Ya inicializado (a menos que se fuerce recarga)
        }

        set({ isLoading: true });

        try {
          if (isAuthenticated()) {
            // Cargar desde BD
            const dbCart = await cartApi.getCart();
            
            if (dbCart && dbCart.items && dbCart.items.length > 0) {
              // Hay carrito en BD, usarlo
              const totalItems = dbCart.items.reduce((sum, item) => {
                const baseQuantity = item.quantity || 0;
                const freeItems = item.freeItemsCount || 0;
                return sum + baseQuantity + freeItems;
              }, 0);

              const totalPrice = dbCart.items.reduce((sum, item) => sum + calculateItemPrice(item), 0);

              set({
                items: dbCart.items,
                totalItems,
                totalPrice,
                couponCode: dbCart.coupon_code || null,
                discount: dbCart.discount || 0,
                isInitialized: true,
                isLoading: false
              });
            } else {
              // No hay carrito en BD, verificar localStorage y sincronizar
              // Obtener directamente de localStorage antes de limpiarlo
              const localStorageCart = localStorage.getItem('cherry-central-cart');
              let hasLocalItems = false;
              
              if (localStorageCart) {
                try {
                  const parsed = JSON.parse(localStorageCart);
                  hasLocalItems = parsed.state?.items && parsed.state.items.length > 0;
                } catch (error) {
                  console.error('Error parsing localStorage cart:', error);
                }
              }
              
              if (hasLocalItems) {
                // Sincronizar localStorage a BD
                await get().syncCartFromLocalStorage();
                set({ isInitialized: true, isLoading: false });
              } else {
                set({ isInitialized: true, isLoading: false });
              }
            }
          } else {
            // No hay sesión, solo cargar desde localStorage
            const { items } = get();

            const totalItems = items.reduce((sum, item) => {
              const baseQuantity = item.quantity || 0;
              const freeItems = item.freeItemsCount || 0;
              return sum + baseQuantity + freeItems;
            }, 0);

            const totalPrice = items.reduce((sum, item) => sum + calculateItemPrice(item), 0);

            set({
              totalItems,
              totalPrice,
              isInitialized: true,
              isLoading: false
            });
          }
        } catch (error) {
          console.error('Error initializing cart:', error);
          set({ isLoading: false, isInitialized: true });
        }
      },

      // Resetear estado de inicialización (útil cuando usuario inicia sesión)
      resetInitialization: () => {
        set({ isInitialized: false });
      },

      // Sincronizar carrito de localStorage a BD (cuando usuario inicia sesión)
      syncCartFromLocalStorage: async () => {
        if (!isAuthenticated()) {
          return;
        }

        // Obtener items de localStorage directamente (antes de que se limpien)
        const localStorageCart = localStorage.getItem('cherry-central-cart');
        let localItems = [];
        let localTotals = { totalItems: 0, totalPrice: 0, couponCode: null, discount: 0 };

        if (localStorageCart) {
          try {
            const parsed = JSON.parse(localStorageCart);
            localItems = parsed.state?.items || [];
            localTotals = {
              totalItems: parsed.state?.totalItems || 0,
              totalPrice: parsed.state?.totalPrice || 0,
              couponCode: parsed.state?.couponCode || null,
              discount: parsed.state?.discount || 0
            };
          } catch (error) {
            console.error('Error parsing localStorage cart:', error);
          }
        }

        // Siempre sincronizar, incluso si no hay items en localStorage
        // Esto asegura que se cargue el carrito de BD si existe
        try {
          const syncedCart = await cartApi.syncCart({
            items: localItems, // Puede estar vacío, pero el backend lo manejará
            total_items: localTotals.totalItems,
            total_price: localTotals.totalPrice,
            coupon_code: localTotals.couponCode,
            discount: localTotals.discount
          });

          if (syncedCart) {
            // Hay respuesta del servidor (puede tener items o estar vacío)
            const syncedItems = syncedCart.items || [];
            
            if (syncedItems.length > 0) {
              // Aplicar ofertas Buy X Get Y al carrito combinado
              const itemsWithOffers = get().applyBuyXGetYOffers(syncedItems);
              
              // Actualizar con el carrito combinado de BD
              const totalItemsSynced = itemsWithOffers.reduce((sum, item) => {
                const baseQuantity = item.quantity || 0;
                const freeItems = item.freeItemsCount || 0;
                return sum + baseQuantity + freeItems;
              }, 0);

              const totalPriceSynced = itemsWithOffers.reduce((sum, item) => sum + calculateItemPrice(item), 0);

              set({
                items: itemsWithOffers,
                totalItems: totalItemsSynced,
                totalPrice: totalPriceSynced,
                couponCode: syncedCart.coupon_code || null,
                discount: syncedCart.discount || 0
              });
            } else {
              // Carrito vacío en BD, pero puede haber items en localStorage que se combinaron
              // Si no hay items después de combinar, limpiar el estado
              set({
                items: [],
                totalItems: 0,
                totalPrice: 0,
                couponCode: syncedCart.coupon_code || null,
                discount: syncedCart.discount || 0
              });
            }
          } else {
            // No hay respuesta del servidor, cargar desde localStorage si existe
            if (localItems && localItems.length > 0) {
              const itemsWithOffers = get().applyBuyXGetYOffers(localItems);
              const totalItems = itemsWithOffers.reduce((sum, item) => {
                const baseQuantity = item.quantity || 0;
                const freeItems = item.freeItemsCount || 0;
                return sum + baseQuantity + freeItems;
              }, 0);

              const totalPrice = itemsWithOffers.reduce((sum, item) => sum + calculateItemPrice(item), 0);

              set({
                items: itemsWithOffers,
                totalItems,
                totalPrice,
                couponCode: localTotals.couponCode,
                discount: localTotals.discount
              });
            }
          }
        } catch (error) {
          console.error('Error syncing cart from localStorage:', error);
          // Si falla la sincronización, mantener items de localStorage temporalmente
        }

        // Limpiar localStorage después de sincronizar (solo si la sincronización fue exitosa)
        localStorage.removeItem('cherry-central-cart');
      },

      // Add product to cart (con stock por talla y color)
      addToCart: async (product, quantity = 1, productDetaill) => {
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
            // Preservar userOffer al actualizar cantidad
            updatedItems[existingIndex] = { 
              ...existing, 
              quantity: maxStock,
              // Preservar userOffer del producto nuevo si existe, sino mantener el existente
              userOffer: product.userOffer || existing.userOffer
            };
            window.showToast('Has alcanzado el stock máximo disponible para esta prenda.', 'error')
            return;
          } else {
            // Preservar userOffer al actualizar cantidad
            updatedItems[existingIndex] = { 
              ...existing, 
              quantity: newQuantity,
              // Preservar userOffer del producto nuevo si existe, sino mantener el existente
              userOffer: product.userOffer || existing.userOffer
            };
          }
        } else {
          const qty = quantity > maxStock ? maxStock : quantity;
          if (quantity > maxStock) {
            window.showToast(`Solo hay ${maxStock} unidades disponibles para esta combinación.`, 'error')
          }
          // Asegurar que userOffer se incluya al agregar nuevo producto
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

        const totalPrice = updatedItems.reduce((sum, item) => sum + calculateItemPrice(item), 0);

        const newState = {
          items: updatedItems,
          totalItems,
          totalPrice
        };

        set(newState);

        // Si hay sesión, guardar SOLO en BD (no en localStorage)
        if (isAuthenticated()) {
          await saveCartToDatabase({ ...newState, couponCode: get().couponCode, discount: get().discount });
          // Limpiar localStorage cuando hay sesión activa
          localStorage.removeItem('cherry-central-cart');
        }
        // Si no hay sesión, el persist middleware guardará en localStorage automáticamente
      },

      // El resto de tu store permanece intacto...
      updateQuantity: async (productId, newQuantity, color, size) => {
        if (newQuantity < 1) return;

        const { items } = get();
        let updatedItems = items.map(item =>
          (item.id_articulo === productId &&
            item.selectedColor === color &&
            item.selectedSize === size)
            ? { ...item, quantity: newQuantity }
            : item
        );

        // Aplicar lógica de Buy X Get Y después de actualizar cantidad
        updatedItems = get().applyBuyXGetYOffers(updatedItems);

        const totalItems = updatedItems.reduce((sum, item) => {
          const baseQuantity = item.quantity || 0;
          const freeItems = item.freeItemsCount || 0;
          return sum + baseQuantity + freeItems;
        }, 0);
        const totalPrice = updatedItems.reduce((sum, item) => sum + calculateItemPrice(item), 0);

        const newState = {
          items: updatedItems,
          totalItems,
          totalPrice
        };

        set(newState);

        // Si hay sesión, guardar SOLO en BD (no en localStorage)
        if (isAuthenticated()) {
          await saveCartToDatabase({ ...newState, couponCode: get().couponCode, discount: get().discount });
          // Limpiar localStorage cuando hay sesión activa
          localStorage.removeItem('cherry-central-cart');
        }
        // Si no hay sesión, el persist middleware guardará en localStorage automáticamente
      },

      removeItem: async (productId, color, size) => {
        const { items } = get();
        const updatedItems = items.filter(item =>
          !(item.id_articulo === productId &&
            item.selectedColor === color &&
            item.selectedSize === size)
        );

        const totalItems = updatedItems.reduce((sum, item) => sum + (item.quantity || 0) + (item.freeItemsCount || 0), 0);
        const totalPrice = updatedItems.reduce((sum, item) => sum + calculateItemPrice(item), 0);

        const newState = { items: updatedItems, totalItems, totalPrice };
        set(newState);

        // Si hay sesión, guardar SOLO en BD (no en localStorage)
        if (isAuthenticated()) {
          await saveCartToDatabase({ ...newState, couponCode: get().couponCode, discount: get().discount });
          // Limpiar localStorage cuando hay sesión activa
          localStorage.removeItem('cherry-central-cart');
        }
        // Si no hay sesión, el persist middleware guardará en localStorage automáticamente
      },

      clearCart: async () => {
        const newState = {
          items: [],
          totalItems: 0,
          totalPrice: 0,
          couponCode: null,
          discount: 0,
          isLoading: false
        };

        set(newState);

        // Si hay sesión, limpiar SOLO en BD
        if (isAuthenticated()) {
          try {
            await cartApi.clearCart();
          } catch (error) {
            console.error('Error clearing cart in database:', error);
          }
        }
        
        // Siempre limpiar localStorage también
        localStorage.removeItem('cherry-central-cart');
      },

      applyBuyXGetYOffers: (items) => {
        console.log('applyBuyXGetYOffers llamado con items:', items.map(item => ({
          id: item.id_articulo,
          color: item.selectedColor,
          size: item.selectedSize,
          quantity: item.quantity,
          hasUserOffer: !!item.userOffer,
          discount_category: item.userOffer?.discount_category,
          buy_quantity: item.userOffer?.buy_quantity,
          get_quantity: item.userOffer?.get_quantity
        })));

        // 1. Separar items con y sin oferta Buy X Get Y
        const itemsWithOffer = items.filter(item => 
          item.userOffer && item.userOffer.discount_category === 'buy_x_get_y'
        );
        const itemsWithoutOffer = items.filter(item => 
          !item.userOffer || item.userOffer.discount_category !== 'buy_x_get_y'
        );

        // 2. Agrupar items con oferta por producto (id_articulo) y color (selectedColor)
        // Esto agrupa todas las tallas del mismo producto y color
        const groupedByProductAndColor = {};
        
        itemsWithOffer.forEach(item => {
          const key = `${item.id_articulo}_${item.selectedColor || 'default'}`;
          
          if (!groupedByProductAndColor[key]) {
            groupedByProductAndColor[key] = {
              items: [],
              buyQuantity: parseInt(item.userOffer.buy_quantity) || 1,
              getQuantity: parseInt(item.userOffer.get_quantity) || 0,
              userOffer: item.userOffer
            };
          }
          
          groupedByProductAndColor[key].items.push(item);
        });

        // 3. Calcular oferta para cada grupo (sumando todas las tallas)
        const processedGroups = {};
        
        Object.keys(groupedByProductAndColor).forEach(key => {
          const group = groupedByProductAndColor[key];
          const buyQuantity = group.buyQuantity;
          const getQuantity = group.getQuantity;
          
          // Sumar todas las cantidades de todas las tallas del grupo
          const totalQuantity = group.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
          
          console.log('Procesando grupo Buy X Get Y:', {
            key,
            totalQuantity,
            buyQuantity,
            getQuantity,
            itemsCount: group.items.length
          });

          // Si no hay cantidad suficiente o no hay items gratis, no aplicar oferta
          if (totalQuantity < buyQuantity || getQuantity === 0) {
            console.log('No se aplica oferta: cantidad insuficiente o getQuantity=0');
            group.items.forEach(item => {
              processedGroups[`${item.id_articulo}_${item.selectedColor || 'default'}_${item.selectedSize || 'default'}`] = {
                ...item,
                freeItemsCount: 0,
                _paidQuantity: item.quantity,
                _freeQuantity: 0
              };
            });
            return;
          }

          // Calcular cuántos grupos completos de "buy_quantity" hay
          const completeGroups = Math.floor(totalQuantity / buyQuantity);
          
          // Calcular cuántos items son gratis (solo para grupos completos)
          const freeItems = completeGroups * getQuantity;
          
          // Calcular cuántos items se pagan por cada grupo completo
          const paidFromGroups = completeGroups * (buyQuantity - getQuantity);
          
          // Items sobrantes que no forman un grupo completo se pagan completos
          const remainderItems = totalQuantity % buyQuantity;
          
          // Total de items pagados
          const paidItems = paidFromGroups + remainderItems;

          console.log('Buy X Get Y aplicado al grupo:', {
            key,
            totalQuantity,
            buyQuantity,
            getQuantity,
            completeGroups,
            freeItems,
            paidFromGroups,
            remainderItems,
            paidItems
          });

          // 4. Distribuir items pagados y gratis proporcionalmente entre las tallas
          // Usar un algoritmo que asegure que la suma total sea exacta
          let remainingPaidItems = paidItems;
          let remainingFreeItems = freeItems;
          let totalDistributedPaid = 0;
          let totalDistributedFree = 0;
          
          group.items.forEach((item, index) => {
            const itemQuantity = parseInt(item.quantity) || 0;
            const proportion = totalQuantity > 0 ? itemQuantity / totalQuantity : 0;
            
            // Calcular distribución proporcional
            let itemPaidQuantity, itemFreeQuantity;
            
            if (index === group.items.length - 1) {
              // Para el último item, usar los restantes para asegurar que la suma sea exacta
              itemPaidQuantity = remainingPaidItems;
              itemFreeQuantity = remainingFreeItems;
            } else {
              // Para los demás, calcular proporcionalmente y redondear
              itemPaidQuantity = Math.round(paidItems * proportion);
              itemFreeQuantity = Math.round(freeItems * proportion);
              
              // Asegurar que no exceda la cantidad del item
              itemPaidQuantity = Math.min(itemPaidQuantity, itemQuantity);
              itemFreeQuantity = Math.min(itemFreeQuantity, itemQuantity - itemPaidQuantity);
              
              remainingPaidItems -= itemPaidQuantity;
              remainingFreeItems -= itemFreeQuantity;
            }
            
            totalDistributedPaid += itemPaidQuantity;
            totalDistributedFree += itemFreeQuantity;
            
            const itemKey = `${item.id_articulo}_${item.selectedColor || 'default'}_${item.selectedSize || 'default'}`;
            
            processedGroups[itemKey] = {
              ...item,
              freeItemsCount: itemFreeQuantity,
              isFreeItem: false,
              freeItemReason: freeItems > 0 ? `🎁 Oferta: Compra ${buyQuantity} por el precio de ${buyQuantity - getQuantity}` : null,
              quantity: itemQuantity,
              _paidQuantity: itemPaidQuantity,
              _freeQuantity: itemFreeQuantity
            };
          });
          
          console.log('Distribución final del grupo:', {
            key,
            totalPaidItems: paidItems,
            totalFreeItems: freeItems,
            distributedPaid: totalDistributedPaid,
            distributedFree: totalDistributedFree
          });
        });

        // 5. Combinar items procesados con items sin oferta
        const updatedItems = items.map(item => {
          const itemKey = `${item.id_articulo}_${item.selectedColor || 'default'}_${item.selectedSize || 'default'}`;
          
          // Si está en los grupos procesados, usar ese
          if (processedGroups[itemKey]) {
            return processedGroups[itemKey];
          }
          
          // Si no tiene oferta Buy X Get Y, limpiar campos relacionados
          if (!item.userOffer || item.userOffer.discount_category !== 'buy_x_get_y') {
            const { freeItemsCount, isFreeItem, freeItemReason, _paidQuantity, _freeQuantity, ...itemWithoutOffer } = item;
            return itemWithoutOffer;
          }
          
          return item;
        });

        console.log('Items después de aplicar Buy X Get Y:', updatedItems.map(item => ({
          id: item.id_articulo,
          color: item.selectedColor,
          size: item.selectedSize,
          quantity: item.quantity,
          _paidQuantity: item._paidQuantity,
          freeItemsCount: item.freeItemsCount,
          hasUserOffer: !!item.userOffer
        })));

        return updatedItems;
      },

      recalculateTotals: async () => {
        const { items } = get();
        const totalItems = items.reduce((sum, item) => (sum + (item.quantity || 0) + (item.freeItemsCount || 0)), 0);
        const totalPrice = items.reduce((sum, item) => sum + calculateItemPrice(item), 0);
        
        const newState = { totalItems, totalPrice };
        set(newState);

        // Si hay sesión, guardar SOLO en BD (no en localStorage)
        if (isAuthenticated()) {
          await saveCartToDatabase({ items, ...newState, couponCode: get().couponCode, discount: get().discount });
          // Limpiar localStorage cuando hay sesión activa
          localStorage.removeItem('cherry-central-cart');
        }
        // Si no hay sesión, el persist middleware guardará en localStorage automáticamente
      }
    }),
    {
      name: 'cherry-central-cart',
      partialize: (state) => {
        // Si hay sesión activa, NO guardar en localStorage
        if (isAuthenticated()) {
          return {}; // Retornar objeto vacío para no persistir
        }
        // Si no hay sesión, guardar normalmente
        return {
          items: state.items,
          totalItems: state.totalItems,
          totalPrice: state.totalPrice,
          couponCode: state.couponCode,
          discount: state.discount
        };
      },
      onRehydrateStorage: () => (state) => {
        // Solo rehidratar si NO hay sesión activa
        if (isAuthenticated()) {
          return; // No cargar desde localStorage si hay sesión
        }
        
        if (state && state.items) {
          const totalItems = state.items.reduce((sum, item) => (sum + (item.quantity || 0) + (item.freeItemsCount || 0)), 0);
          const totalPrice = state.items.reduce((sum, item) => sum + calculateItemPrice(item), 0);
          state.totalItems = totalItems;
          state.totalPrice = totalPrice;
        }
      }
    }
  )
);

export default useCartStore;