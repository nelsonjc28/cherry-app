import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import useCartStore, { cartLineMatches } from '../store/cartStore';
import api from '../config/axios';
import './CartDetailsPage.css';
import CartDetailsProductCard from '../components/CartDetailsProductCard';
import CartOrderSummary from '../components/CartOrderSummary/CartOrderSummary';
import OrderAmountCard from '../components/OrderAmountCard/OrderAmountCard';
import AddressSelector from '../components/AddressSelector/AddressSelector';
import BuyerInfo from '../components/BuyerInfo/BuyerInfo';
import { validateStock } from '../services/inventoryService';
import useUserStore from '../store/userStore';
import {
  getVolumeDiscountMainTier,
  getSellerCategoryFromUser,
  isBronzeBenefitActive,
  getBronzeBenefitRemainingDays,
  hasApiVolumeMainPercent,
  isOroDiamanteSeller,
  canApplyMainDiscount,
} from '../utils/sellerVolumeDiscount';
import {
  cartItemToPricingLine,
  summarizeVolumeFromCartItems,
  summarizeVolumeFromPricingLines,
  discountedMerchandiseForSubset,
} from '../utils/cartVolumePricing';
import { buildCartAmountBreakdown } from '../utils/cartCheckoutBreakdown';
import {
  isEncargoCartLine,
  itemSkipsStockValidation,
  cartLineToApiEncargoFlags,
} from '../utils/encargoUtils';





// Función para formatear montos con separador de miles
const formatMoney = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value || 0);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/** MP a veces manda init_point ""; el backend ya corrige, pero aquí reforzamos + armamos URL con preference_id. */
/** Pago con crédito, pedido directo y anticipados: categoría oro/diamante. */
const isOroDiamanteCategory = isOroDiamanteSeller;

const pickMercadoPagoCheckoutUrl = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  const candidates = [
    payload.payment_url,
    payload.redirect_url,
    payload.init_point,
    payload.sandbox_init_point,
    payload.sandbox_payment_url,
  ];
  const found = candidates.find((u) => typeof u === 'string' && u.trim().length > 0);
  if (found) return found.trim();

  const pid = payload.preference_id;
  if (pid != null && String(pid).trim() !== '') {
    const id = encodeURIComponent(String(pid).trim());
    return `https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=${id}&source_operation=checkout_pro`;
  }
  return null;
};

const CartDetailsPage = () => {
  const navigate = useNavigate();
  const {
    items: cartItems,
    totalItems,
    totalPrice,
    removeItem,
    removeItemUsingClearThenSync,
    updateQuantity,
    clearCart,
    initCart
  } = useCartStore();
  const getPricingSummary = useCartStore((state) => state.getPricingSummary);
  const pricingSummary = getPricingSummary();


  const { user, fetchUser } = useUserStore();

  // State for selected address
  const [selectedAddress, setSelectedAddress] = useState(null);

  // State for selected payment card
  const [selectedPaymentCard, setSelectedPaymentCard] = useState(null);

  // State for delivery type (envio or retiro)
  const [deliveryType, setDeliveryType] = useState('envio'); // 'envio' or 'retiro'
  
  // State for payment method (credit or mercadopago)
  const [paymentMethod, setPaymentMethod] = useState('mercadopago'); // 'mercadopago' or 'credit'
  
  // Separar encargos (Próximamente / Agotado) de productos con stock
  const advanceOrderItems = cartItems.filter(item => isEncargoCartLine(item));
  const regularItems = cartItems.filter(item => !isEncargoCartLine(item));
  const hasAdvanceOrders = advanceOrderItems.length > 0;
  const hasRegularItems = regularItems.length > 0;
  
  // Calcular totales separados
  const regularItemsTotal = regularItems.reduce((sum, item) => {
    return sum + (parseFloat(item.precio || item.price || 0) * parseInt(item.quantity || 0));
  }, 0);
  
  // State for store address (from contact_info) - valores por defecto para asegurar que siempre haya datos
  // Estos valores deben coincidir exactamente con los de ContactPage.jsx
  const defaultStoreAddress = {
    id: 'store',
    name: 'Retiro en tienda',
    street_address: 'José María Izazaga 127 piso 2 Col.',
    city: 'Centros México D.F. C.P. 06080',
    state: '',
    postal_code: '',
    country: 'México',
    additional_info: null,
    is_default: false
  };
  const defaultMapUrl = 'https://www.google.com/maps/embed?pb=!1m12!1m8!1m3!1d3830947.253725377!2d-99.1779212!3d20.3350315!3m2!1i1024!2i768!4f13.1!2m1!1scherry%20tienda%20mx%20direccion!5e0!3m2!1ses-419!2sve!4v1753274350284!5m2!1ses-419!2sve';
  
  const [storeAddress, setStoreAddress] = useState(defaultStoreAddress);
  const [storeMapUrl, setStoreMapUrl] = useState(defaultMapUrl);

  // Initialize cart from localStorage
  useEffect(() => {
    initCart();
  }, [initCart]);

  // Refrescar usuario al entrar al carrito para evitar categoría cacheada
  // (p.ej. cambio admin de Oro/Diamante a Bronce sin hard refresh).
  useEffect(() => {
    fetchUser();

    const refreshUser = () => {
      fetchUser();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshUser();
      }
    };

    window.addEventListener('focus', refreshUser);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refreshUser);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUser]);

  const didDefaultPremiumPaymentRef = useRef(false);
  useEffect(() => {
    if (!user) {
      didDefaultPremiumPaymentRef.current = false;
      return;
    }
    if (!isOroDiamanteCategory(user)) {
      didDefaultPremiumPaymentRef.current = false;
      return;
    }
    if (!didDefaultPremiumPaymentRef.current) {
      didDefaultPremiumPaymentRef.current = true;
      setPaymentMethod('credit');
    }
  }, [user]);

  // Fetch store address from contact_info
  useEffect(() => {
    const fetchStoreAddress = async () => {
      try {
        // Agregar timestamp para evitar caché del navegador
        const timestamp = new Date().getTime();
        const response = await api.get(`/contact-info?t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (response.data.success && response.data.data) {
          const contactInfo = response.data.data;
          // Create a store address object similar to Address model
          setStoreAddress({
            id: 'store',
            name: 'Retiro en tienda',
            street_address: contactInfo.address_street || '',
            city: contactInfo.address_city || '',
            state: '',
            postal_code: '',
            country: 'México',
            additional_info: null,
            is_default: false
          });
          // Store map URL for displaying map (con fallback si está vacío)
          const defaultMapUrl = 'https://www.google.com/maps/embed?pb=!1m12!1m8!1m3!1d3830947.253725377!2d-99.1779212!3d20.3350315!3m2!1i1024!2i768!4f13.1!2m1!1scherry%20tienda%20mx%20direccion!5e0!3m2!1ses-419!2sve!4v1753274350284!5m2!1ses-419!2sve';
          const mapUrl = contactInfo.map_url && contactInfo.map_url.trim() !== '' 
            ? contactInfo.map_url 
            : defaultMapUrl;
          setStoreMapUrl(mapUrl);
        } else {
          // Si no hay datos, usar valores por defecto (deben coincidir con ContactPage.jsx)
          setStoreAddress(defaultStoreAddress);
          setStoreMapUrl(defaultMapUrl);
        }
      } catch (error) {
        // Error fetching store address - usar valores por defecto (deben coincidir con ContactPage.jsx)
        setStoreAddress(defaultStoreAddress);
        setStoreMapUrl(defaultMapUrl);
      }
    };
    
    fetchStoreAddress();
    
    // Recargar cuando la página vuelve a estar visible (por si se actualizó en otra pestaña)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchStoreAddress();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Scroll to top when component mounts
  useEffect(() => {
    // Función para hacer scroll al inicio
    const scrollToTop = () => {
      // Intentar múltiples métodos para asegurar compatibilidad
      if (window.scrollTo) {
        window.scrollTo(0, 0);
      }
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
      // También intentar con scrollIntoView del primer elemento
      const firstElement = document.querySelector('.cart-details__container') || document.body.firstElementChild;
      if (firstElement && firstElement.scrollIntoView) {
        firstElement.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    };

    // Ejecutar inmediatamente
    scrollToTop();
    
    // Ejecutar después de que React termine de renderizar
    requestAnimationFrame(() => {
      scrollToTop();
      // Ejecutar una vez más después de un pequeño delay
      setTimeout(scrollToTop, 100);
    });
  }, []);

  // Helper function to calculate item price considering Buy X Get Y offers
  const calculateItemPriceForDisplay = (item) => {
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
    
    // Item normal sin ofertas
    return itemPrice * quantity;
  };

  // Group cart items by product ID and color, combining different sizes
  const groupedProducts = cartItems.reduce((groups, item) => {
    const key = `${item.id_articulo}-${item.selectedColor}`;

    if (!groups[key]) {
      groups[key] = {
        id_articulo: item.id_articulo,
        image: item.image,
        title: item.title,
        precio: item.precio,
        originalPrice: item.originalPrice, // Precio original antes del descuento
        desc_promo: item.desc_promo, // Porcentaje de descuento
        discount: item.discount, // Descuento calculado
        selectedColor: item.selectedColor,
        variants: [],
        totalQuantity: 0,
        totalPrice: 0,
        userOffer: item.userOffer, // Preservar userOffer para mostrar información de oferta
        freeItemsCount: item.freeItemsCount || 0, // Preservar freeItemsCount para mostrar
        _paidQuantity: item._paidQuantity // Preservar _paidQuantity para cálculos
      };
    }

    // Add size variant
    groups[key].variants.push({
      color: item.selectedColor,
      size: item.selectedSize,
      quantity: item.quantity
    });

    // Update totals - usar calculateItemPriceForDisplay para considerar Buy X Get Y
    groups[key].totalQuantity += item.quantity;
    groups[key].totalPrice += calculateItemPriceForDisplay(item);

    return groups;
  }, {});

  // Convert grouped products to array format
  const productsForDisplay = Object.values(groupedProducts).map((groupedProduct) => {
    // Calcular precio sin descuento (precio original * cantidad total)
    const priceWithoutDiscount = parseFloat(groupedProduct.precio) * groupedProduct.totalQuantity;
    
    // El precio con descuento ya está calculado considerando Buy X Get Y en totalPrice
    const priceWithDiscount = groupedProduct.totalPrice;
    
    // Determinar si el producto tiene rebaja (desc_promo > 0 o tiene originalPrice)
    const hasDiscount = (groupedProduct.desc_promo && groupedProduct.desc_promo > 0) || 
                        (groupedProduct.originalPrice && groupedProduct.originalPrice > groupedProduct.precio);
    
    return {
      image: groupedProduct.image && groupedProduct.image !== '/images/catalogProductImages/Rectangle 4922.png' 
        ? groupedProduct.image 
        : null,
      sku: groupedProduct.id_articulo,
      title: groupedProduct.title,
      price: parseFloat(groupedProduct.precio).toFixed(2),
      originalPrice: groupedProduct.originalPrice ? parseFloat(groupedProduct.originalPrice).toFixed(2) : null,
      hasDiscount: hasDiscount,
      discountPercentage: groupedProduct.discount || groupedProduct.desc_promo || 0,
      variants: groupedProduct.variants,
      summary: {
        quantity: groupedProduct.totalQuantity,
        priceWithoutDiscount: priceWithoutDiscount.toFixed(2),
        priceWithDiscount: parseFloat(priceWithDiscount).toFixed(2),
        // Información adicional para mostrar ofertas Buy X Get Y
        userOffer: groupedProduct.userOffer,
        freeItemsCount: groupedProduct.freeItemsCount || 0,
        _paidQuantity: groupedProduct._paidQuantity
      }
    };
  });

  // Handle remove variant (remove specific size from cart)
  const handleRemoveVariant = (productIdx, variantIdx) => {
    const product = productsForDisplay[productIdx];
    const variant = product.variants[variantIdx];

    // Find and remove the specific item from cart
    const itemToRemove = cartItems.find((item) =>
      cartLineMatches(item, product.sku, variant.color, variant.size)
    );

    if (!itemToRemove) return;

    const onlyVariantOnCard = product.variants.length === 1;

    // Una sola talla en la tarjeta: mismo truco que "Limpiar carrito" (DELETE) + volver a subir lo que queda (sync).
    if (onlyVariantOnCard && cartItems.length === 1) {
      clearCart();
      return;
    }

    if (onlyVariantOnCard) {
      removeItemUsingClearThenSync(
        itemToRemove.id_articulo,
        itemToRemove.selectedColor,
        itemToRemove.selectedSize
      );
      return;
    }

    removeItem(itemToRemove.id_articulo, itemToRemove.selectedColor, itemToRemove.selectedSize);
  };

  // Handle quantity change for specific variant
  const handleQuantityChange = async (productIdx, variantIdx, newQty) => {
    const product = productsForDisplay[productIdx];
    const variant = product.variants[variantIdx];

    if (newQty < 1) return;

    // Find the specific item in cart
    const itemToUpdate = cartItems.find((item) =>
      cartLineMatches(item, product.sku, variant.color, variant.size)
    );

    if (!itemToUpdate) return;

    const { user } = useUserStore.getState();
    if (itemSkipsStockValidation(itemToUpdate, user)) {
      updateQuantity(itemToUpdate.id_articulo, newQty, itemToUpdate.selectedColor, itemToUpdate.selectedSize);
      return;
    }

    // Validar stock disponible
    try {
      const stockValidation = await validateStock(
        itemToUpdate.id_articulo,
        itemToUpdate.selectedSize,
        itemToUpdate.selectedColor,
        newQty
      );

      if (!stockValidation.isValid) {
        // Mostrar mensaje de error con el stock disponible
        if (window.showToast) {
          window.showToast(stockValidation.message, 'error');
        }

        // Si hay stock disponible pero menos de lo solicitado, ajustar a lo disponible
        if (stockValidation.availableStock > 0) {
          updateQuantity(
            itemToUpdate.id_articulo,
            stockValidation.availableStock,
            itemToUpdate.selectedColor,
            itemToUpdate.selectedSize
          );
        }
        return;
      }

      // Si la validación es exitosa, actualizar la cantidad
      updateQuantity(itemToUpdate.id_articulo, newQty, itemToUpdate.selectedColor, itemToUpdate.selectedSize);
    } catch (error) {
      if (window.showToast) {
        window.showToast('Error al validar disponibilidad del producto', 'error');
      }
    }
  };

  // Handle continue shopping
  const handleContinueShopping = () => {
    navigate('/');
  };

  // Handle clear cart
  const handleClearCart = () => {
    clearCart();
  };

  // Handle address selection
  const handleAddressChange = (address) => {
    setSelectedAddress(address);
  };

  // Update selectedAddress when deliveryType changes
  useEffect(() => {
    if (deliveryType === 'retiro') {
      // Siempre establecer la dirección de la tienda cuando es retiro
      if (storeAddress) {
        setSelectedAddress(storeAddress);
      }
    } else if (deliveryType === 'envio') {
      // Cuando cambia a envío, limpiar si era dirección de tienda
      if (selectedAddress?.id === 'store') {
        setSelectedAddress(null);
      }
    }
  }, [deliveryType, storeAddress, selectedAddress]);

  // MercadoPago o crédito; oro/diamante → pedido directo vía /orders/direct. Descuento API solo en precios.
  const handleGenerateOrder = async (options = {}) => {
    const pm = options.paymentMethod ?? paymentMethod;

    if (cartItems.length === 0) {
      if (window.showToast) {
        window.showToast('No hay productos en el carrito', 'warning');
      }
      return;
    }

    /** Snapshot del carrito completo (disponibles + anticipados) para volumen y validación en servidor. */
    const fullCartPricingLinesSnapshot = cartItems.map(cartItemToPricingLine);

    const isDirectCategory = isOroDiamanteSeller(user);

    if (isDirectCategory) {
      if (deliveryType === 'envio' && !selectedAddress) {
        if (window.showToast) {
          window.showToast('Por favor selecciona una dirección de entrega', 'warning');
        }
        return;
      }

      for (const item of cartItems) {
        if (itemSkipsStockValidation(item, user)) continue;
        try {
          const stockValidation = await validateStock(
            item.id_articulo,
            item.selectedSize,
            item.selectedColor,
            item.quantity
          );
          if (!stockValidation.isValid) {
            if (window.showToast) {
              window.showToast(stockValidation.message || 'Stock insuficiente', 'error');
            }
            return;
          }
        } catch (err) {
          if (window.showToast) {
            window.showToast('Error al validar disponibilidad del producto', 'error');
          }
          return;
        }
      }

      // Pedido directo (API volume discount): POST /orders/direct — pendiente_pago hasta liquidación admin.
      const paymentLineItems = cartItems;
      const volSummary = summarizeVolumeFromCartItems(user, paymentLineItems);
      const paymentDescuento1 = volSummary.descuento1;
      const paymentDescuento2 = volSummary.descuento2;
      const lineItemsGrossTotal = volSummary.lines_sum;
      const regularTotalAfterDiscount = volSummary.discounted_merchandise;

      let regularShippingAmount = 0;
      if (deliveryType === 'retiro') {
        regularShippingAmount = 0;
      } else {
        const freeShippingMin = user?.free_shipping_min_amount || 0;
        if (user?.free_shipping && freeShippingMin > 0) {
          regularShippingAmount = regularTotalAfterDiscount < freeShippingMin ? 150 : 0;
        } else {
          regularShippingAmount = regularTotalAfterDiscount < 3000 ? 150 : 0;
        }
      }

      const regularFinalTotal = parseFloat((regularTotalAfterDiscount + regularShippingAmount).toFixed(2));
      const regularSubtotal = lineItemsGrossTotal;
      const regularDiscountedTotal = regularTotalAfterDiscount;

      const directData = {
        items: paymentLineItems.map(item => ({
          product_id: String(item.id_articulo || item.product_id || item.id),
          name: item.title || item.name,
          quantity: parseInt(item.quantity, 10),
          price: parseFloat(item.precio || item.price),
          size: item.selectedSize || null,
          color: item.selectedColor || null,
          barcode: item.barcode || null,
          detalle_id: item.detalle_id != null ? Number(item.detalle_id) : null,
          ...cartLineToApiEncargoFlags(item),
          desc_promo: item.desc_promo != null ? item.desc_promo : null,
          user_offer_applies: !!(item.userOffer && item.userOffer.discount_category),
        })),
        address_id: deliveryType === 'envio' ? selectedAddress.id : null,
        delivery_type: deliveryType,
        shipping_amount: parseFloat(regularShippingAmount || 0),
        total_amount: regularFinalTotal,
        subtotal: regularSubtotal,
        discounted_total: regularDiscountedTotal,
        descuento1: paymentDescuento1,
        descuento2: paymentDescuento2,
        items_for_volume_pricing: fullCartPricingLinesSnapshot.map((line) => ({
          price: line.price,
          quantity: line.quantity,
          desc_promo: line.desc_promo,
          user_offer_applies: line.user_offer_applies,
        })),
      };

      const longTimeout = { timeout: 120000 };

      try {
        if (window.showToast) {
          window.showToast('Confirmando pedido...', 'info');
        }
        const response = await api.post('/orders/direct', directData, longTimeout);
        if (response.data.success) {
          void clearCart();
          const payload = response.data.data ?? response.data;
          const okMsg =
            response.data?.message ||
            'Pedido registrado. Queda pendiente de pago hasta liquidación.';
          if (window.showToast) {
            window.showToast(okMsg, 'success');
          }
          setTimeout(() => {
            navigate('/compra-exitosa', {
              state: {
                orderInfo: {
                  orderId: payload?.order_id,
                  totalAmount: regularFinalTotal,
                  directOrder: true,
                  directOrderPendingPayment: true,
                },
              },
            });
          }, 600);
        } else {
          throw new Error(response.data.message || 'No se pudo confirmar el pedido');
        }
      } catch (error) {
        if (error.response?.data?.has_pending_order && error.response?.data?.pending_order) {
          const pendingOrder = error.response.data.pending_order;
          const orderNumber = pendingOrder.number || `#${pendingOrder.id}`;
          Swal.fire({
            title: 'Orden Pendiente',
            html: `
              <p>${error.response.data.message}</p>
              <p style="margin-top: 15px; font-size: 14px;">
                <strong>Orden:</strong> ${orderNumber}<br>
                <strong>Total:</strong> $${parseFloat(pendingOrder.total_amount || 0).toFixed(2)}
              </p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ver Mis Órdenes',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#EA2630',
            cancelButtonColor: '#6c757d',
            reverseButtons: true
          }).then((result) => {
            if (result.isConfirmed) {
              window.location.href = '/perfil/mis-pedidos';
            }
          });
        } else {
          const errorMessage = error.response?.data?.message || error.message || 'Error al confirmar el pedido';
          if (window.showToast) {
            window.showToast(errorMessage, 'error');
          }
        }
      }
      return;
    }

    if (hasAdvanceOrders && !isOroDiamanteSeller(user)) {
      if (window.showToast) {
        window.showToast(
          'Los productos en encargo (Próximamente o Agotado) solo están disponibles para clientes con categoría Oro o Diamante.',
          'error'
        );
      }
      return;
    }

    // Carrito mixto (disponible + próximamente) + crédito: un solo create-preference con todo el carrito
    // para que Total − Crédito = saldo MP y siempre se genere preferencia/URL si hay excedente.
    const skipSeparateAdvanceOrder =
      pm === 'credit' &&
      hasAdvanceOrders &&
      hasRegularItems &&
      isOroDiamanteSeller(user);

    // Si hay productos adelantados, crear pedido adelantado primero (excepto el caso unificado arriba)
    if (hasAdvanceOrders && !skipSeparateAdvanceOrder) {
      try {
        if (window.showToast) {
          window.showToast('Creando pedido adelantado...', 'info');
        }

        // Volumen sobre el carrito completo (disponibles + anticipados); el anticipado recibe su parte proporcional
        const globalVol = summarizeVolumeFromPricingLines(user, fullCartPricingLinesSnapshot);
        const advanceLines = advanceOrderItems.map(cartItemToPricingLine);
        const advanceItemsSubtotal = advanceLines.reduce(
          (sum, line) => sum + line.price * line.quantity,
          0
        );
        const advanceDiscountedMerch = discountedMerchandiseForSubset(
          user,
          fullCartPricingLinesSnapshot,
          advanceLines
        );
        const advanceOrderTotalCharged = parseFloat(advanceDiscountedMerch.toFixed(2));

        const advanceOrderData = {
          items: advanceOrderItems.map(item => ({
            product_id: String(item.id_articulo || item.product_id || item.id), // Enviar como string para soportar IDs con ceros a la izquierda
            name: item.title || item.name,
            quantity: parseInt(item.quantity, 10),
            price: parseFloat(item.precio || item.price),
            size: item.selectedSize || null,
            color: item.selectedColor || null,
            barcode: item.barcode || null,
            detalle_id: item.detalle_id != null ? Number(item.detalle_id) : null,
            desc_promo: item.desc_promo != null ? item.desc_promo : null,
            user_offer_applies: !!(item.userOffer && item.userOffer.discount_category),
          })),
          items_for_volume_pricing: fullCartPricingLinesSnapshot.map((line) => ({
            price: line.price,
            quantity: line.quantity,
            desc_promo: line.desc_promo,
            user_offer_applies: line.user_offer_applies,
          })),
          total_amount: advanceOrderTotalCharged,
          subtotal: advanceItemsSubtotal,
          discounted_total: advanceDiscountedMerch,
          descuento1: globalVol.descuento1,
          descuento2: globalVol.descuento2,
          shipping_amount: 0,
          delivery_type: deliveryType,
          is_advance_order: true,
        };

        const advanceResponse = await api.post('/payment/create-advance-order', advanceOrderData);

        if (advanceResponse.data.success) {
          if (window.showToast) {
            window.showToast(
              `Pedido adelantado creado exitosamente. Total: $${advanceOrderTotalCharged.toFixed(2)}`,
              'success'
            );
          }

          // Remover productos adelantados del carrito
          advanceOrderItems.forEach(item => {
            removeItem(item.id_articulo || item.product_id || item.id, item.selectedColor, item.selectedSize);
          });

          // Si solo había productos adelantados, redirigir a mis órdenes
          if (!hasRegularItems) {
            setTimeout(() => {
              navigate('/mis-pedidos');
            }, 1500);
            return;
          }

          // Si hay productos regulares, continuar con el flujo normal de pago
          // (el código continuará después de este bloque)
        } else {
          throw new Error(advanceResponse.data.message || 'Error al crear el pedido adelantado');
        }
      } catch (error) {
        // Verificar si el error es por orden pendiente
        if (error.response?.data?.has_pending_order && error.response?.data?.pending_order) {
          const pendingOrder = error.response.data.pending_order;
          const orderNumber = pendingOrder.number || `#${pendingOrder.id}`;
          
          Swal.fire({
            title: 'Orden Pendiente',
            html: `
              <p>${error.response.data.message}</p>
              <p style="margin-top: 15px; font-size: 14px;">
                <strong>Orden:</strong> ${orderNumber}<br>
                <strong>Total:</strong> $${parseFloat(pendingOrder.total_amount || 0).toFixed(2)}
              </p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ver Mis Órdenes',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#EA2630',
            cancelButtonColor: '#6c757d',
            reverseButtons: true
          }).then((result) => {
            if (result.isConfirmed) {
              // Redirigir a la página de mis pedidos
              window.location.href = '/perfil/mis-pedidos';
            }
          });
        } else {
          const errorMessage = error.response?.data?.message || error.message || 'Error al crear el pedido adelantado';
          if (window.showToast) {
            window.showToast(errorMessage, 'error');
          }
        }
        return;
      }
    }

    // Si solo había productos adelantados, ya terminamos
    if (!hasRegularItems) {
      return;
    }

    // Validaciones para productos regulares (con stock)
    // Si es envío, validar que haya dirección seleccionada
    if (deliveryType === 'envio' && !selectedAddress) {
      if (window.showToast) {
        window.showToast('Por favor selecciona una dirección de entrega', 'warning');
      }
      return;
    }

    // Si es pago con crédito, validar que el usuario tenga categoría oro o diamante
    if (pm === 'credit') {
      if (!isOroDiamanteCategory(user)) {
        if (window.showToast) {
          window.showToast('Solo los usuarios con categoría Oro pueden pagar con crédito', 'error');
        }
        return;
      }
    }

    try {
      const paymentLineItems = skipSeparateAdvanceOrder ? cartItems : regularItems;
      const regularLines = paymentLineItems.map(cartItemToPricingLine);

      const globalVol = summarizeVolumeFromPricingLines(user, fullCartPricingLinesSnapshot);
      const regularDiscountedTotal = discountedMerchandiseForSubset(
        user,
        fullCartPricingLinesSnapshot,
        regularLines
      );

      const lineItemsGrossTotal = regularLines.reduce((sum, line) => sum + line.price * line.quantity, 0);
      const regularDayFortyFiveDiscountAmount = Math.max(0, lineItemsGrossTotal - regularDiscountedTotal);
      const paymentDescuento1 = globalVol.descuento1;
      const paymentDescuento2 = globalVol.descuento2;

      // Calcular shipping amount para productos regulares
      let regularShippingAmount = 0;
      if (deliveryType === 'retiro') {
        regularShippingAmount = 0;
      } else {
        // Calcular envío basado en el total después de descuentos
        const freeShippingMin = user?.free_shipping_min_amount || 0;
        if (user?.free_shipping && freeShippingMin > 0) {
          regularShippingAmount = regularDiscountedTotal < freeShippingMin ? 150 : 0;
        } else {
          regularShippingAmount = regularDiscountedTotal < 3000 ? 150 : 0;
        }
      }

      // Calcular total final con descuentos y envío
      const regularFinalTotal = parseFloat((regularDiscountedTotal + regularShippingAmount).toFixed(2));

      const regularSubtotal = lineItemsGrossTotal; // Subtotal sin descuentos de volumen

      const paymentData = {
        items: paymentLineItems.map(item => {
          const mappedItem = {
            product_id: String(item.id_articulo || item.product_id || item.id), // Enviar como string para soportar IDs con ceros a la izquierda
            name: item.title || item.name,
            quantity: parseInt(item.quantity, 10),
            price: parseFloat(item.precio || item.price),
            size: item.selectedSize || null,
            color: item.selectedColor || null,
            barcode: item.barcode || null,
            detalle_id: item.detalle_id != null ? Number(item.detalle_id) : null,
            ...cartLineToApiEncargoFlags(item),
            desc_promo: item.desc_promo != null ? item.desc_promo : null,
            user_offer_applies: !!(item.userOffer && item.userOffer.discount_category),
          };

          return mappedItem;
        }),
        items_for_volume_pricing: fullCartPricingLinesSnapshot.map((line) => ({
          price: line.price,
          quantity: line.quantity,
          desc_promo: line.desc_promo,
          user_offer_applies: line.user_offer_applies,
        })),
        address_id: deliveryType === 'envio' ? selectedAddress.id : null,
        delivery_type: deliveryType, // 'envio' or 'retiro'
        shipping_amount: parseFloat(regularShippingAmount || 0), // Monto del envío
        total_amount: regularFinalTotal, // Total FINAL con descuentos y envío incluidos
        subtotal: regularSubtotal, // Monto total sin descuentos aplicados
        discounted_total: regularDiscountedTotal, // Monto total con descuentos aplicados (sin envío)
        use_credit: pm === 'credit',
        pay_remainder_with_mercadopago: pm === 'credit', // Si paga con crédito y hay pendiente, pagar resto con MP
        // Porcentajes para API/BD: 30 u 33 si hay elegibles; 10 si aplica segundo tramo (>15k neto tras primer descuento)
        descuento1: paymentDescuento1,
        descuento2: paymentDescuento2
      };

      const longTimeout = { timeout: 120000 };

      let response;

      if (pm === 'credit') {
        if (window.showToast) {
          window.showToast('Procesando pago con crédito...', 'info');
        }
        response = await api.post('/payment/create-preference', paymentData, longTimeout);
      } else {
        if (window.showToast) {
          window.showToast('Creando preferencia de pago...', 'info');
        }
        response = await api.post('/payment/create-preference', paymentData, longTimeout);
      }

      if (response.data.success) {
        let payload = response.data.data ?? response.data;
        if (payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
          const inner = payload.data;
          if (
            inner.preference_id != null
            || inner.order_split != null
            || inner.redirect_url != null
            || inner.payment_url != null
            || inner.requires_payment != null
          ) {
            payload = inner;
          }
        }

        // Si es pago con crédito
        if (pm === 'credit') {
          const pendingRaw =
            payload?.amount_pending ??
            payload?.order_payment?.amount_pending ??
            0;
          const pendingMp =
            typeof pendingRaw === 'number'
              ? pendingRaw
              : parseFloat(String(pendingRaw).replace(/,/g, '')) || 0;

          const isSplitResponse =
            payload?.order_split === true ||
            payload?.order_split === 1 ||
            payload?.requires_mercadopago_redirect === true ||
            payload?.requires_mercadopago_redirect === 1 ||
            payload?.requires_payment === true ||
            payload?.requires_payment === 1;
          const needsMercadoPagoCheckout =
            pendingMp > 0.01 || isSplitResponse;

          if (needsMercadoPagoCheckout) {
            const payOrderId =
              payload?.order_payment_id ?? payload?.order_id;

            const mercadoPagoCheckoutUrl = pickMercadoPagoCheckoutUrl(payload);

            if (mercadoPagoCheckoutUrl) {
              if (window.showToast) {
                if (payload?.order_split) {
                  const line1 = payload?.order_credit
                    ? `Orden #${payload.order_credit.id}: aplicada a tu crédito. `
                    : '';
                  window.showToast(
                    `${line1}Redirigiendo a Mercado Pago para completar el pago…`,
                    'info'
                  );
                } else {
                  window.showToast(
                    `Saldo pendiente: $${pendingMp.toFixed(2)}. Abriendo Mercado Pago…`,
                    'info'
                  );
                }
              }
              void clearCart();
              window.location.replace(mercadoPagoCheckoutUrl);
              return;
            }

            void clearCart();
            if (window.showToast) {
              window.showToast(
                'Tu orden quedó con saldo pendiente pero no se obtuvo el enlace de Mercado Pago. Revisa Mis pedidos o contacta soporte.',
                'warning'
              );
            }
            setTimeout(() => {
              navigate(`/perfil/mis-pedidos?highlight=${payOrderId}`, { replace: true });
            }, 2500);
            return;
          }

          // Pago completo con crédito (orden en pendiente_pago hasta liquidación admin)
          void clearCart();
          if (window.showToast) {
            window.showToast(
              response.data?.message ||
                'Pedido realizado con éxito. Tu saldo pendiente se ha actualizado.',
              'success'
            );
          }

          setTimeout(() => {
            navigate('/compra-exitosa', {
              state: {
                orderInfo: {
                  orderId: payload?.order_id,
                  creditUsed: payload?.credit_used,
                  amountPending: 0,
                  totalAmount: regularFinalTotal,
                  paymentMethod: 'credito',
                  creditPendingLiquidation: true,
                },
              },
            });
          }, 800);
        } else {
          // Pago con MercadoPago (flujo normal)
          if (window.showToast) {
            window.showToast('¡Redirigiendo a MercadoPago!', 'success');
          }

          localStorage.setItem('pending_order', JSON.stringify({
            orderId: payload?.order_id,
            externalReference: payload?.external_reference,
            totalAmount: totalPrice
          }));

          const mpOnlyUrl = [
            payload?.redirect_url,
            payload?.init_point,
            payload?.sandbox_init_point,
            payload?.payment_url,
            payload?.sandbox_payment_url,
          ].find((u) => typeof u === 'string' && u.trim().length > 0);

          setTimeout(() => {
            if (mpOnlyUrl) {
              window.location.href = mpOnlyUrl;
            }
          }, 1500);
        }

      } else {
        throw new Error(response.data.message || 'Error al crear la preferencia de pago');
      }

    } catch (error) {

      const errorMessage = error.response?.data?.message || error.message || 'Error al procesar el pago';

      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      }
    }
  };

  // Handle integrated payment success
  const handleIntegratedPaymentSuccess = (paymentData) => {
    // Limpiar carrito
    clearCart();

    if (window.showToast) {
      window.showToast('¡Gracias por tu compra!', 'success');
    }

    // Redirigir a página de éxito (muestra mensaje de agradecimiento + detalle Mercado Pago)
    setTimeout(() => {
      navigate('/compra-exitosa', {
        state: {
          paymentData,
          orderInfo: {
            items: cartItems,
            total: totalPrice,
            address: selectedAddress
          }
        }
      });
    }, 600);
  };

  // Handle integrated payment error
  const handleIntegratedPaymentError = (error) => {
    // El error ya se maneja en el componente IntegratedCheckout
  };

  // Descuento por volumen alineado con PriceService (sin API: +10 % adicional si elegible ≥ $15k; con API: segundo tramo sin $15k)
  const volumeSummary = summarizeVolumeFromCartItems(user, cartItems);
  const eligibleTotal = volumeSummary.eligible_total;
  const dayFortyFiveDiscountAmount = volumeSummary.volume_discount;
  const discountTwentyAmount = volumeSummary.vol_main;
  const discountAdditionalTenAmount = volumeSummary.vol_extra;
  const descuento1 = volumeSummary.descuento1;
  const descuento2 = volumeSummary.descuento2;

  const sellerCategory = getSellerCategoryFromUser(user);
  const isDiamanteUser = sellerCategory === 'diamante';
  const isBronzeUser = sellerCategory === 'bronce';
  const bronzeBenefitActive = isBronzeBenefitActive(user);
  const bronzeBenefitDaysLeft = getBronzeBenefitRemainingDays(user);
  const { mainPercent: mainDiscountPercent } = getVolumeDiscountMainTier(user);

  // El total SIN descuento (CartOrderSummary aplicará el descuento internamente)
  const baseTotal = (totalPrice && typeof totalPrice === 'number') ? totalPrice : 0;

  // Calcular totales para el card de Monto del pedido (similar a CartOrderSummary)
  const preShippingTotal = Math.max(0, baseTotal - dayFortyFiveDiscountAmount);
  let shippingAmount = 0;
  
  // Si es retiro, no cobrar envío
  if (deliveryType === 'retiro') {
    shippingAmount = 0;
  } else {
    // Si es envío, aplicar la lógica de envío gratis
    const freeShippingMin = user?.free_shipping_min_amount || 0;
    if (user?.free_shipping && freeShippingMin > 0) {
      shippingAmount = preShippingTotal < freeShippingMin ? 150 : 0;
    } else {
      shippingAmount = preShippingTotal < 3000 ? 150 : 0;
    }
  }
  
  const finalTotalWithShipping = parseFloat((preShippingTotal + shippingAmount).toFixed(2));
  const isFreeShippingApplied = shippingAmount === 0;

  // Order summary data
  const orderSummary = {
    creditDays: '',
    discount1: descuento1, // 30 u 33 si hay productos elegibles; 0 si no
    discount2: descuento2, // 10 u otro % del segundo tramo; sin API solo si elegible ≥ 15k; con API junto al primero
    pieces: totalItems,
    subtotal: baseTotal.toFixed(2),
    discountTotal: dayFortyFiveDiscountAmount > 0 ? dayFortyFiveDiscountAmount.toFixed(2) : '0.00',
    total: finalTotalWithShipping, // Total FINAL con descuentos y envío incluidos
    daysFortyFive: user?.day_forty_five,
    freeShipping: user?.free_shipping,
    freeShippingMinAmount: user?.free_shipping_min_amount || 0,
    shippingAmount: shippingAmount, // Monto del envío calculado
    selectedAddress: selectedAddress,
    onGenerateOrder: handleGenerateOrder,
    onClearCart: handleClearCart
  };

  // ===== ALERTAS DE DESCUENTO =====
  const VOLUME_MAIN_THRESHOLD = 7000;
  const DISCOUNT_40_THRESHOLD = 15000;
  const NEAR_THRESHOLD_PERCENT = 0.7; // 70% del umbral = "ya casi"
  /** Descuento realmente aplicado en este carrito (no solo categoría oro/diamante). */
  const hasActiveVolumeDiscount = dayFortyFiveDiscountAmount > 0.009;

  // Calcular alertas para descuentos
  const getDiscountAlerts = () => {
    const alerts = [];
    
    // Solo mostrar alertas si hay productos elegibles (sin rebaja)
    if (eligibleTotal <= 0) return alerts;

    const hasApiMain = hasApiVolumeMainPercent(user);
    const progressThreshold =
      isBronzeUser && !bronzeBenefitActive
        ? VOLUME_MAIN_THRESHOLD
        : hasActiveVolumeDiscount
          ? 0
          : VOLUME_MAIN_THRESHOLD;

    const apiSecondTierActive =
      hasActiveVolumeDiscount
      && hasApiMain
      && canApplyMainDiscount(user, eligibleTotal)
      && Number(descuento2) > 0
      && eligibleTotal < DISCOUNT_40_THRESHOLD;

    if (isBronzeUser) {
      if (bronzeBenefitActive) {
        alerts.push({
          type: 'success',
          icon: '⏳',
          message: `Tu descuento del 30% vence en: ${bronzeBenefitDaysLeft} día(s). ¡Compra algo para renovarlo!`,
          color: '#4caf50'
        });
      } else {
        const remainingToActivate = Math.max(0, 7000 - eligibleTotal);
        alerts.push({
          type: 'info',
          icon: '💡',
          message: remainingToActivate > 0
            ? `¡Te faltan $${formatMoney(remainingToActivate)} para obtener el 30% de descuento!`
            : 'Tu compra actual activa el 30% de descuento por 45 días.',
          color: '#2196f3'
        });
      }
    }

    // Diamante: mensaje genérico; oro/bronce: porcentaje real del primer tramo
    const discountLabel = isDiamanteUser
      ? 'tu descuento especial'
      : `tu descuento del ${mainDiscountPercent}%`;
    const maxDiscountLabel = isDiamanteUser
      ? '¡Felicidades! Has alcanzado el descuento máximo disponible'
      : `¡Increíble! Tienes el descuento máximo del ${mainDiscountPercent}% + 10% adicional`;
    
    // Bronce sin beneficio 45 días: el mensaje "falta $X para el 30%" ya va arriba (💡); no duplicar con el tramo genérico.
    const skipFirstVolumeTier =
      isBronzeUser && !bronzeBenefitActive && eligibleTotal < progressThreshold;

    if (eligibleTotal < progressThreshold && !skipFirstVolumeTier) {
      const remaining = progressThreshold - eligibleTotal;
      const isNear = progressThreshold > 0 && eligibleTotal >= progressThreshold * NEAR_THRESHOLD_PERCENT;

      if (isNear) {
        alerts.push({
          type: 'near',
          icon: '🔥',
          message: isDiamanteUser
            ? `¡Ya casi! Te faltan $${formatMoney(remaining)} para activar tu descuento`
            : `¡Ya casi! Te faltan $${formatMoney(remaining)} para obtener tu descuento del ${mainDiscountPercent}%`,
          color: '#ff9800'
        });
      } else {
        alerts.push({
          type: 'info',
          icon: '💰',
          message: isDiamanteUser
            ? `Te faltan $${formatMoney(remaining)} para activar tu descuento`
            : `Te faltan $${formatMoney(remaining)} para obtener un descuento del ${mainDiscountPercent}%`,
          color: '#2196f3'
        });
      }
    } else if (hasActiveVolumeDiscount && eligibleTotal < DISCOUNT_40_THRESHOLD) {
      const remaining = DISCOUNT_40_THRESHOLD - eligibleTotal;
      const isNear = eligibleTotal >= DISCOUNT_40_THRESHOLD * NEAR_THRESHOLD_PERCENT;

      if (apiSecondTierActive) {
        alerts.push({
          type: 'success',
          icon: '🎉',
          message: maxDiscountLabel,
          color: '#4caf50',
        });
      } else {
        if (!hasApiMain) {
          alerts.push({
            type: 'success',
            icon: '✅',
            message: isDiamanteUser
              ? '¡Felicidades! Ya tienes tu descuento activado'
              : `¡Felicidades! Ya tienes ${discountLabel}`,
            color: '#4caf50'
          });
        }

        if (!hasApiMain) {
          if (isNear) {
            alerts.push({
              type: 'near',
              icon: '🔥',
              message: `¡Ya casi! Te faltan $${formatMoney(remaining)} para obtener un 10% adicional`,
              color: '#ff9800'
            });
          } else {
            alerts.push({
              type: 'info',
              icon: '🎯',
              message: `Te faltan $${formatMoney(remaining)} para obtener un 10% adicional`,
              color: '#2196f3'
            });
          }
        }
      }
    } else if (hasActiveVolumeDiscount && eligibleTotal >= DISCOUNT_40_THRESHOLD) {
      alerts.push({
        type: 'success',
        icon: '🎉',
        message: maxDiscountLabel,
        color: '#4caf50'
      });
    }
    
    return alerts;
  };
  
  // Calcular alertas para envío gratis
  const getShippingAlerts = () => {
    const alerts = [];
    
    // Si es retiro en tienda, no mostrar alertas de envío
    if (deliveryType === 'retiro') {
      return alerts;
    }
    
    const freeShippingMin = user?.free_shipping_min_amount || 3000;
    const currentTotal = preShippingTotal;
    
    if (currentTotal < freeShippingMin) {
      const remaining = freeShippingMin - currentTotal;
      const isNear = currentTotal >= (freeShippingMin * NEAR_THRESHOLD_PERCENT);
      
      if (isNear) {
        alerts.push({
          type: 'near',
          icon: '🚚',
          message: `¡Ya casi! Te faltan $${formatMoney(remaining)} para envío gratis`,
          color: '#ff9800'
        });
      } else {
        alerts.push({
          type: 'info',
          icon: '📦',
          message: `Te faltan $${formatMoney(remaining)} para envío gratis`,
          color: '#9c27b0'
        });
      }
    } else {
      alerts.push({
        type: 'success',
        icon: '🚚',
        message: `¡Genial! Tienes envío gratis`,
        color: '#4caf50'
      });
    }
    
    return alerts;
  };
  
  // Detectar si hay productos con rebaja
  const hasProductsWithDiscount = cartItems.some(item => {
    const hasPromo = item.desc_promo && item.desc_promo > 0;
    const hasUserOffer = item.userOffer && item.userOffer.discount_category !== null;
    return hasPromo || hasUserOffer;
  });

  // Alerta sobre productos con rebaja
  const discountWarningAlert = hasProductsWithDiscount ? [{
    type: 'warning',
    icon: 'ℹ️',
    message: `Recuerda que en productos con rebaja no se aplica el descuento por volumen (${mainDiscountPercent}% + 10% adicional cuando aplica)`,
    color: '#ff9800'
  }] : [];

  const discountAlerts = getDiscountAlerts();
  const shippingAlerts = getShippingAlerts();
  const allAlerts = [...discountWarningAlert, ...discountAlerts, ...shippingAlerts];

  const orderAmountBreakdown = useMemo(
    () => buildCartAmountBreakdown(user, cartItems, volumeSummary),
    [user, cartItems, volumeSummary]
  );

  return (
    <div className="container cart-details__container">
      <header className="cart-details__header">
        <h1 className="cart-details__title">Carrito de compras</h1>
        <div className="cart-details__header-actions">
          <span className="cart-details__items-count">
            ({totalItems}) <span className="cart-details__items-label">item agregados</span>
          </span>
          <button className="cart-details__continue-btn" onClick={handleContinueShopping}>
            <span className="cart-details__continue-icon">+</span>
            <span className="cart-details__continue-text"> Seguir comprando</span>
          </button>
        </div>
      </header>

      {cartItems.length === 0 ? (
        <div className="cart-details__empty">
          <div className="cart-details__empty-icon">🛒</div>
          <h2>Tu carrito está vacío</h2>
          <p>No tienes productos en tu carrito. Agrega algunos productos para comenzar a comprar.</p>
          <button className="cart-details__continue-btn" onClick={handleContinueShopping}>
            Continuar Comprando
          </button>
        </div>
      ) : (
        <div className="cart-details__content">
          <div className="cart-details__products-col">
            {/* Alertas de descuento y envío - Mostrar por encima de los productos */}
            {allAlerts.length > 0 && (
              <div className="cart-details__alerts">
                {allAlerts.map((alert, index) => (
                  <div 
                    key={index} 
                    className={`cart-details__alert cart-details__alert--${alert.type}`}
                    style={{ 
                      borderLeftColor: alert.color,
                      backgroundColor: `${alert.color}15`
                    }}
                  >
                    <span className="cart-details__alert-icon">{alert.icon}</span>
                    <span className="cart-details__alert-message">{alert.message}</span>
                  </div>
                ))}
              </div>
            )}
            
            {productsForDisplay.map((product, idx) => (
              <CartDetailsProductCard
                key={`${String(product.sku)}-${product.variants.map((v) => `${v.color}:${v.size}`).join('|')}`}
                {...product}
                onRemove={variantIdx => handleRemoveVariant(idx, variantIdx)}
                onQuantityChange={(variantIdx, newQty) => handleQuantityChange(idx, variantIdx, newQty)}
              />
            ))}
          </div>
          <div className="cart-details__summary-col">
            {/* Card 1: Monto del pedido */}
            <OrderAmountCard
              breakdown={orderAmountBreakdown}
              mainPercent={mainDiscountPercent}
              shipping={shippingAmount}
              total={parseFloat(finalTotalWithShipping)}
              deliveryType={deliveryType}
              isFreeShipping={isFreeShippingApplied}
            />
            {/* Datos del comprador (debajo de Monto del pedido) */}
            <BuyerInfo className="cart-details__buyer-info" />
            
            {/* Opciones de entrega */}
            <div className="cart-details__delivery-options">
              <div className="cart-details__section-title">Tipo de entrega</div>
              <div className="cart-details__delivery-options-content">
                <label className="cart-details__delivery-option">
                  <input
                    type="radio"
                    name="deliveryType"
                    value="envio"
                    checked={deliveryType === 'envio'}
                    onChange={(e) => setDeliveryType(e.target.value)}
                  />
                  <span>Envío a domicilio</span>
                </label>
                <label className="cart-details__delivery-option">
                  <input
                    type="radio"
                    name="deliveryType"
                    value="retiro"
                    checked={deliveryType === 'retiro'}
                    onChange={(e) => setDeliveryType(e.target.value)}
                  />
                  <span>Retiro en tienda</span>
                </label>
              </div>
            </div>
            
            {deliveryType === 'envio' && (
            <AddressSelector
              selectedAddressId={selectedAddress?.id}
              onAddressChange={handleAddressChange}
              className="cart-details__address-selector"
            />
            )}
            

            {/* Datos de la Tarjeta (resumen con formulario integrado) */}
            <CartOrderSummary
              {...orderSummary}
              cartItems={cartItems}
              selectedAddress={deliveryType === 'retiro' && storeAddress ? storeAddress : selectedAddress}
              deliveryType={deliveryType}
              selectedPaymentCard={selectedPaymentCard}
              onPaymentCardChange={setSelectedPaymentCard}
              onIntegratedPaymentSuccess={handleIntegratedPaymentSuccess}
              onIntegratedPaymentError={handleIntegratedPaymentError}
              user={user}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              hasAdvanceOrders={hasAdvanceOrders}
              hasRegularItems={hasRegularItems}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CartDetailsPage; 
