import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cartApi } from '../api/cartApi';
import useUserStore from './userStore';
import { hasApiVolumeMainPercent } from '../utils/sellerVolumeDiscount';

/**
 * Helper function to calculate item price considering Buy X Get Y offers
 */
export const calculateItemPrice = (item) => {
  if (item.isFreeItem) return 0;
  
  const itemPrice = item.price || item.precio || 0;
  const quantity = item.quantity || 0;
  
  // Si tiene oferta Buy X Get Y, calcular precio basado en items pagados
  if (item.userOffer?.discount_category === 'buy_x_get_y') {
    // Usar _paidQuantity si está disponible (calculado por applyBuyXGetYOffers)
    if (item._paidQuantity !== undefined) {
      return itemPrice * item._paidQuantity;
    }
    
    // Si no tiene _paidQuantity pero tiene freeItemsCount, calcularlo
    if (item.freeItemsCount && item.freeItemsCount > 0) {
      const paidQuantity = quantity - item.freeItemsCount;
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

export const getPaidQuantity = (item) => {
  if (item?._paidQuantity !== undefined && item?._paidQuantity !== null) {
    const paid = Number(item._paidQuantity);
    return Number.isFinite(paid) ? Math.max(0, paid) : 0;
  }
  const qty = Number(item?.quantity ?? 0);
  return Number.isFinite(qty) ? Math.max(0, qty) : 0;
};

const hasPromoDiscount = (item) => {
  const promoCandidates = [
    item?.desc_promo,
    item?.descPromo,
    item?.catalog_offer_discount,
    item?.catalogOffer?.discount_percentage,
  ];
  return promoCandidates.some((raw) => {
    if (raw === null || raw === undefined || raw === '') return false;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0.0001;
  });
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
    // No lanzar error, solo loguear para no interrumpir el flujo
  }
};

/**
 * Helper function to save cart to localStorage when there's no session
 * This ensures immediate persistence before sync
 */
/** id de tabla `detalles` (variante talla/color) según catálogo cargado */
const resolveDetalleIdFromCatalog = (productDetaill, color, size) => {
  if (!productDetaill?.detalles) return null;
  const variant = productDetaill.detalles.find(
    (v) => v.nombreColor === color && v.detalle === size
  );
  if (variant?.id == null) return null;
  const n = Number(variant.id);
  return Number.isFinite(n) ? n : null;
};

/**
 * Serializa addToCart para que el estado y el guardado en BD/localStorage no se pisen
 * (p. ej. varias tallas en un solo clic o doble clic rápido).
 */
let addToCartSerial = Promise.resolve();

const enqueueAddToCart = (fn) => {
  const run = addToCartSerial.then(() => fn());
  addToCartSerial = run.catch(() => {});
  return run;
};

const saveCartToLocalStorage = (items, totalItems, totalPrice, couponCode = null, discount = 0) => {
  if (isAuthenticated()) {
    return; // No guardar en localStorage si hay sesión
  }
  
  const persistData = {
    state: {
      items: items || [],
      totalItems: totalItems || 0,
      totalPrice: totalPrice || 0,
      couponCode: couponCode || null,
      discount: discount || 0
    },
    version: 0
  };
  
  try {
    localStorage.setItem('cherry-central-cart', JSON.stringify(persistData));
  } catch (error) {
    // Error guardando en localStorage
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
              // Limpiar imágenes placeholder antes de usar
              const cleanedItems = dbCart.items.map(item => {
                if (item.image === '/images/catalogProductImages/Rectangle 4922.png' || 
                    item.image === '/images/placeholder.jpg' ||
                    !item.image) {
                  return { ...item, image: null };
                }
                return item;
              });

              const totalItems = cleanedItems.reduce((sum, item) => {
                const baseQuantity = item.quantity || 0;
                const freeItems = item.freeItemsCount || 0;
                return sum + baseQuantity + freeItems;
              }, 0);

              const totalPrice = cleanedItems.reduce((sum, item) => sum + calculateItemPrice(item), 0);

              set({
                items: cleanedItems,
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

        // PASO 1: Leer localStorage INMEDIATAMENTE y hacer una copia completa
        // Esto evita que cualquier código (incluido persist middleware) lo limpie
        let localStorageCartString = null;
        try {
          const raw = localStorage.getItem('cherry-central-cart');
          if (raw) {
            // Crear una copia completa del string
            localStorageCartString = JSON.stringify(JSON.parse(raw));
          }
        } catch (error) {
          // Error leyendo localStorage
        }
        
        let localItems = [];
        let localTotals = { totalItems: 0, totalPrice: 0, couponCode: null, discount: 0 };

        // PASO 2: Parsear los datos de localStorage (usando la copia guardada)
        if (localStorageCartString) {
          try {
            const parsed = JSON.parse(localStorageCartString);
            // Intentar diferentes estructuras posibles
            if (parsed.state) {
              // Estructura de Zustand persist
              localItems = parsed.state.items || [];
              localTotals = {
                totalItems: parsed.state.totalItems || 0,
                totalPrice: parsed.state.totalPrice || 0,
                couponCode: parsed.state.couponCode || null,
                discount: parsed.state.discount || 0
              };
            } else if (parsed.items) {
              // Estructura directa
              localItems = parsed.items || [];
              localTotals = {
                totalItems: parsed.totalItems || 0,
                totalPrice: parsed.totalPrice || 0,
                couponCode: parsed.couponCode || null,
                discount: parsed.discount || 0
              };
            } else {
              // Intentar como array directo
              localItems = Array.isArray(parsed) ? parsed : [];
            }
            
          } catch (error) {
            // Error parsing localStorage cart
          }
        } else {
          // Verificar si localStorage fue limpiado después de leerlo
          const checkAgain = localStorage.getItem('cherry-central-cart');
          if (checkAgain) {
            try {
              const reparsed = JSON.parse(checkAgain);
              if (reparsed.state) {
                localItems = reparsed.state.items || [];
                localTotals = {
                  totalItems: reparsed.state.totalItems || 0,
                  totalPrice: reparsed.state.totalPrice || 0,
                  couponCode: reparsed.state.couponCode || null,
                  discount: reparsed.state.discount || 0
                };
              }
            } catch (e) {
              // Error parseando segunda lectura
            }
          }
        }

        // PASO 3: Preparar payload para enviar al backend
        // SIEMPRE enviar, incluso si no hay items en localStorage (para cargar BD)
        const syncPayload = {
          items: localItems, // IMPORTANTE: Enviar items de localStorage
          total_items: localTotals.totalItems,
          total_price: localTotals.totalPrice,
          coupon_code: localTotals.couponCode,
          discount: localTotals.discount
        };
        
        let syncSuccess = false;
        let syncedCart = null;
        
        try {
          // PASO 3: Enviar al backend y esperar confirmación
          syncedCart = await cartApi.syncCart(syncPayload);
          

          if (syncedCart) {
            // Hay respuesta del servidor (puede tener items o estar vacío)
            const syncedItems = syncedCart.items || [];
            
            
            // Aplicar ofertas Buy X Get Y al carrito combinado
            const itemsWithOffers = syncedItems.length > 0 
              ? get().applyBuyXGetYOffers(syncedItems)
              : [];
            
            // Calcular totales
            const totalItemsSynced = itemsWithOffers.reduce((sum, item) => {
              const baseQuantity = item.quantity || 0;
              const freeItems = item.freeItemsCount || 0;
              return sum + baseQuantity + freeItems;
            }, 0);

            const totalPriceSynced = itemsWithOffers.reduce((sum, item) => sum + calculateItemPrice(item), 0);

            // Actualizar estado con el carrito combinado (puede estar vacío si ambos estaban vacíos)
            set({
              items: itemsWithOffers,
              totalItems: totalItemsSynced,
              totalPrice: totalPriceSynced,
              couponCode: syncedCart.coupon_code || null,
              discount: syncedCart.discount || 0,
              isInitialized: true, // Marcar como inicializado para evitar que initCart sobrescriba
              isLoading: false
            });

            // PASO 6: Confirmar éxito SOLO si recibimos confirmación del backend
            syncSuccess = true;
          } else {
            // No hay respuesta válida del backend
            syncSuccess = false;
            
            // Si hay items en localStorage, mantenerlos en el estado
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
                discount: localTotals.discount,
                isInitialized: true,
                isLoading: false
              });
            } else {
              set({
                isInitialized: true,
                isLoading: false
              });
            }
          }
        } catch (error) {
          syncSuccess = false;
          
          // Si falla la sincronización, mantener items de localStorage si existen
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
              discount: localTotals.discount,
              isInitialized: true,
              isLoading: false
            });
          } else {
            set({
              isInitialized: true,
              isLoading: false
            });
          }
        }

        // PASO 7: Limpiar localStorage SOLO si recibimos confirmación de que se guardó en BD
        if (syncSuccess && syncedCart && syncedCart.id) {
          localStorage.removeItem('cherry-central-cart');
        }
      },

      // Add product to cart (con stock por talla y color)
      addToCart: (product, quantity = 1, productDetaill) =>
        enqueueAddToCart(async () => {
        const { items } = get();

        // Función para obtener stock de un producto específico
        const getStockForVariant = (product, color, size) => {
          if (!productDetaill?.detalles) return 0;
          const variant = productDetaill.detalles.find(v => v.nombreColor === color && v.detalle === size);
          return variant ? variant.inventario_d : 0;
        };

        const maxStock = getStockForVariant(product, product.selectedColor, product.selectedSize);
        
        // Próximamente: solo si el usuario tiene descuento por volumen en API (mismo criterio que pedido)
        const isComingSoon = product.isComingSoon === true;
        const user = useUserStore.getState?.()?.user;
        const isPremiumUser = user && hasApiVolumeMainPercent(user);
        
        if (maxStock === 0 && !(isComingSoon && isPremiumUser)) {
           window.showToast("No hay stock para esta combinación de color y talla.",'error');
          return;
        }
        
        if (maxStock === 0 && isComingSoon && isPremiumUser) {
          // Continuar con el proceso de agregar al carrito
        } else if (maxStock === 0) {
          return;
        }

        // Crear un item key único
        const existingIndex = items.findIndex(item =>
          item.id_articulo === product.id_articulo &&
          item.selectedColor === product.selectedColor &&
          item.selectedSize === product.selectedSize
        );

        let updatedItems = [...items];

        const detalleId = resolveDetalleIdFromCatalog(
          productDetaill,
          product.selectedColor,
          product.selectedSize
        );

        if (existingIndex !== -1) {
          const existing = updatedItems[existingIndex];
          const newQuantity = existing.quantity + quantity;

          const isComingSoon = product.isComingSoon === true || existing.isComingSoon === true;
          const user = useUserStore.getState?.()?.user;
          const isPremiumUser = user && hasApiVolumeMainPercent(user);
          
          const maxAllowed = (isComingSoon && isPremiumUser) ? 9999 : maxStock;

          if (newQuantity > maxAllowed && !(isComingSoon && isPremiumUser)) {
            // Preservar userOffer al actualizar cantidad
            updatedItems[existingIndex] = { 
              ...existing, 
              quantity: maxStock,
              detalle_id: existing.detalle_id ?? detalleId,
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
              detalle_id: existing.detalle_id ?? detalleId,
              // Preservar userOffer del producto nuevo si existe, sino mantener el existente
              userOffer: product.userOffer || existing.userOffer
            };
          }
        } else {
          const isComingSoon = product.isComingSoon === true;
          const user = useUserStore.getState?.()?.user;
          const isPremiumUser = user && hasApiVolumeMainPercent(user);
          
          const maxAllowed = (isComingSoon && isPremiumUser) ? 9999 : maxStock;
          const qty = quantity > maxAllowed ? maxAllowed : quantity;
          
          if (quantity > maxStock && !(isComingSoon && isPremiumUser)) {
            window.showToast(`Solo hay ${maxStock} unidades disponibles para esta combinación.`, 'error')
          }
          // Asegurar que userOffer se incluya al agregar nuevo producto
          updatedItems.push({ ...product, quantity: qty, detalle_id: detalleId });
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
        } else {
          // Si no hay sesión, guardar inmediatamente en localStorage
          // IMPORTANTE: Guardar ANTES de que el persist middleware pueda interferir
          saveCartToLocalStorage(updatedItems, totalItems, totalPrice, get().couponCode, get().discount);
          
          // Verificar inmediatamente después
          const verifySaved = localStorage.getItem('cherry-central-cart');
          if (verifySaved) {
            const parsed = JSON.parse(verifySaved);
          } else {
          }
        }
      }),

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
        } else {
          // Si no hay sesión, guardar inmediatamente en localStorage
          // IMPORTANTE: Guardar ANTES de que el persist middleware pueda interferir
          saveCartToLocalStorage(updatedItems, totalItems, totalPrice, get().couponCode, get().discount);
          
          // Verificar inmediatamente después
          const verifySaved = localStorage.getItem('cherry-central-cart');
          if (verifySaved) {
            const parsed = JSON.parse(verifySaved);
          } else {
          }
        }
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
        } else {
          // Si no hay sesión, guardar inmediatamente en localStorage
          // IMPORTANTE: Guardar ANTES de que el persist middleware pueda interferir
          saveCartToLocalStorage(updatedItems, totalItems, totalPrice, get().couponCode, get().discount);
          
          // Verificar inmediatamente después
          const verifySaved = localStorage.getItem('cherry-central-cart');
          if (verifySaved) {
            const parsed = JSON.parse(verifySaved);
          } else {
          }
        }
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
            // Error clearing cart in database
          }
        }
        
        // Siempre limpiar localStorage también
        localStorage.removeItem('cherry-central-cart');
      },

      applyBuyXGetYOffers: (items) => {
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

          // Si no hay cantidad suficiente o no hay items gratis, no aplicar oferta
          if (totalQuantity < buyQuantity || getQuantity === 0) {
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
        } else {
          // Si no hay sesión, guardar inmediatamente en localStorage
          saveCartToLocalStorage(items, totalItems, totalPrice, get().couponCode, get().discount);
        }
      },

      // Resumen de precios para totalizer (carrito/checkout)
      getPricingSummary: () => {
        const { items } = get();
        let subtotalOriginal = 0;
        /** Ahorro lista → precio unitario en carrito (items sin desc_promo / oferta catálogo) */
        let ahorroMayoreoLinea = 0;
        /** Ahorro por rebaja (desc_promo u ofertas de catálogo en la línea) */
        let ahorroRebaja = 0;
        /** Subtotal de mercancía a precio de carrito (antes del descuento por volumen global) */
        let merchandiseSubtotal = 0;

        items.forEach((item) => {
          merchandiseSubtotal += calculateItemPrice(item);

          const quantity = Number(item?.quantity ?? 0);
          if (!Number.isFinite(quantity) || quantity <= 0) return;

          const paidQty = getPaidQuantity(item);
          const listUnitPrice = Number(item?.precio1 ?? item?.originalPrice ?? item?.price ?? item?.precio ?? 0);
          const finalUnitPrice = Number(item?.price ?? item?.precio ?? 0);

          if (!Number.isFinite(listUnitPrice) || listUnitPrice <= 0) return;

          subtotalOriginal += listUnitPrice * quantity;

          const pricedQty = paidQty > 0 ? paidQty : quantity;
          const perUnitSaving = Math.max(0, listUnitPrice - (Number.isFinite(finalUnitPrice) ? finalUnitPrice : 0));
          const lineSaving = perUnitSaving * pricedQty;

          if (lineSaving > 0) {
            if (hasPromoDiscount(item)) {
              ahorroRebaja += lineSaving;
            } else {
              ahorroMayoreoLinea += lineSaving;
            }
          }
        });

        const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
        subtotalOriginal = round2(subtotalOriginal);
        ahorroMayoreoLinea = round2(ahorroMayoreoLinea);
        ahorroRebaja = round2(ahorroRebaja);
        merchandiseSubtotal = round2(merchandiseSubtotal);

        return {
          subtotalOriginal,
          /** Compat: antes se llamaba ahorroMayoreo (solo línea lista→precio, sin tramo volumen 30%) */
          ahorroMayoreo: ahorroMayoreoLinea,
          ahorroMayoreoLinea,
          ahorroRebaja,
          /** Precio carrito antes del % de volumen (coincide con totalPrice del store) */
          merchandiseSubtotal,
          subtotalFinal: merchandiseSubtotal,
        };
      },
    }),
    {
      name: 'cherry-central-cart',
      partialize: (state) => {
        // Si hay sesión activa, NO guardar en localStorage
        // Pero retornar el estado actual de localStorage si existe para NO limpiarlo
        if (isAuthenticated()) {
          // Leer localStorage actual y retornarlo para preservarlo
          // Esto evita que Zustand lo limpie cuando hay sesión
          try {
            const existing = localStorage.getItem('cherry-central-cart');
            if (existing) {
              const parsed = JSON.parse(existing);
              // Retornar el estado existente para preservarlo
              return parsed.state || parsed;
            }
          } catch (e) {
            // Si hay error, retornar undefined para no hacer nada
          }
          // Si no hay localStorage existente, retornar undefined (no hacer nada)
          return undefined;
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