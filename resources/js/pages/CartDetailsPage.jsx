import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import useCartStore from '../store/cartStore';
import api from '../config/axios';
import './CartDetailsPage.css';
import CartDetailsProductCard from '../components/CartDetailsProductCard';
import CartOrderSummary from '../components/CartOrderSummary/CartOrderSummary';
import OrderAmountCard from '../components/OrderAmountCard/OrderAmountCard';
import AddressSelector from '../components/AddressSelector/AddressSelector';
import BuyerInfo from '../components/BuyerInfo/BuyerInfo';
import { validateStock } from '../services/inventoryService';
import useUserStore from '../store/userStore';





// Función para formatear montos con separador de miles
const formatMoney = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value || 0);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const CartDetailsPage = () => {
  const navigate = useNavigate();
  const {
    items: cartItems,
    totalItems,
    totalPrice,
    removeItem,
    updateQuantity,
    clearCart,
    initCart
  } = useCartStore();


  const { user } = useUserStore();

  // State for selected address
  const [selectedAddress, setSelectedAddress] = useState(null);

  // State for selected payment card
  const [selectedPaymentCard, setSelectedPaymentCard] = useState(null);

  // State for delivery type (envio or retiro)
  const [deliveryType, setDeliveryType] = useState('envio'); // 'envio' or 'retiro'
  
  // State for payment method (credit or mercadopago)
  const [paymentMethod, setPaymentMethod] = useState('mercadopago'); // 'mercadopago' or 'credit'
  
  // Separar productos adelantados de productos con stock
  const advanceOrderItems = cartItems.filter(item => item.isComingSoon === true);
  const regularItems = cartItems.filter(item => !item.isComingSoon || item.isComingSoon !== true);
  const hasAdvanceOrders = advanceOrderItems.length > 0;
  const hasRegularItems = regularItems.length > 0;
  
  // Calcular totales separados
  const advanceOrderTotal = advanceOrderItems.reduce((sum, item) => {
    return sum + (parseFloat(item.precio || item.price || 0) * parseInt(item.quantity || 0));
  }, 0);
  
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
    const itemToRemove = cartItems.find(item =>
      item.id_articulo === product.sku &&
      item.selectedColor === variant.color &&
      item.selectedSize === variant.size
    );

    if (itemToRemove) {
      removeItem(itemToRemove.id_articulo, itemToRemove.selectedColor, itemToRemove.selectedSize);
    }
  };

  // Handle quantity change for specific variant
  const handleQuantityChange = async (productIdx, variantIdx, newQty) => {
    const product = productsForDisplay[productIdx];
    const variant = product.variants[variantIdx];

    if (newQty < 1) return;

    // Find the specific item in cart
    const itemToUpdate = cartItems.find(item =>
      item.id_articulo === product.sku &&
      item.selectedColor === variant.color &&
      item.selectedSize === variant.size
    );

    if (!itemToUpdate) return;

    // Si el producto es "Próximamente" y el usuario es "oro" o "diamante", saltar validación de stock
    const isComingSoon = itemToUpdate.isComingSoon === true;
    const { user } = useUserStore.getState();
    const isPremiumUser = user && ['oro', 'diamante'].includes(user.seller_category);
    
    if (isComingSoon && isPremiumUser) {
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

  // Handle generate order with MercadoPago or Credit
  const handleGenerateOrder = async () => {
    if (cartItems.length === 0) {
      if (window.showToast) {
        window.showToast('No hay productos en el carrito', 'warning');
      }
      return;
    }

    // Si hay productos adelantados, crear pedido adelantado primero
    if (hasAdvanceOrders) {
      try {
        if (window.showToast) {
          window.showToast('Creando pedido adelantado...', 'info');
        }

        const advanceOrderData = {
          items: advanceOrderItems.map(item => ({
            product_id: String(item.id_articulo || item.product_id || item.id), // Enviar como string para soportar IDs con ceros a la izquierda
            name: item.title || item.name,
            quantity: parseInt(item.quantity, 10),
            price: parseFloat(item.precio || item.price),
            size: item.selectedSize || null,
            color: item.selectedColor || null,
            barcode: item.barcode || null
          })),
          total_amount: advanceOrderTotal,
          is_advance_order: true,
          // Descuentos del 20% y 10% adicional (0 para pedidos adelantados ya que no aplican)
          descuento1: 0,
          descuento2: 0
        };

        const advanceResponse = await api.post('/payment/create-advance-order', advanceOrderData);

        if (advanceResponse.data.success) {
          if (window.showToast) {
            window.showToast(`Pedido adelantado creado exitosamente. Total: $${advanceOrderTotal.toFixed(2)}`, 'success');
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
    if (paymentMethod === 'credit') {
      if (!user || !['oro', 'diamante'].includes(user.seller_category)) {
        if (window.showToast) {
          window.showToast('Solo los usuarios con categoría Oro pueden pagar con crédito', 'error');
        }
        return;
      }
    }

    try {
      // Calcular total elegible para productos regulares (solo productos con desc_promo = 0 y sin userOffer)
      const eligibleRegularItems = regularItems.filter(item => {
        const hasNoPromo = item.desc_promo === 0 || item.desc_promo === null || item.desc_promo === undefined;
        const hasNoUserOffer = !item.userOffer || item.userOffer.discount_category === null;
        return hasNoPromo && hasNoUserOffer;
      });

      // Calcular total elegible (suma de precios de productos elegibles)
      const eligibleRegularTotal = eligibleRegularItems.reduce((sum, item) => {
        const itemPrice = item.precio || item.price || 0;
        const itemQuantity = item.quantity || 0;
        return sum + (itemPrice * itemQuantity);
      }, 0);

      // Determinar porcentaje de descuento según categoría del usuario
      const isDiamante = user && user.seller_category === 'diamante';
      const mainDiscountRate = isDiamante ? 0.33 : 0.20;
      const mainDiscountPercent = isDiamante ? 33 : 20;

      let regularDiscountTwentyAmount = 0;
      let regularDiscountAdditionalTenAmount = 0;
      let regularDayFortyFiveDiscountAmount = 0;
      
      if (eligibleRegularTotal >= 7000) {
        regularDiscountTwentyAmount = eligibleRegularTotal * mainDiscountRate;
        regularDayFortyFiveDiscountAmount = regularDiscountTwentyAmount;
        
        if (eligibleRegularTotal >= 15000) {
          const totalAfterMain = eligibleRegularTotal - regularDiscountTwentyAmount;
          regularDiscountAdditionalTenAmount = totalAfterMain * 0.10;
          regularDayFortyFiveDiscountAmount = regularDiscountTwentyAmount + regularDiscountAdditionalTenAmount;
        }
      }

      // Calcular total después de descuentos (regularItemsTotal ya incluye descuentos individuales de productos)
      const regularTotalAfterDiscount = Math.max(0, regularItemsTotal - regularDayFortyFiveDiscountAmount);

      // Calcular shipping amount para productos regulares
      let regularShippingAmount = 0;
      if (deliveryType === 'retiro') {
        regularShippingAmount = 0;
      } else {
        // Calcular envío basado en el total después de descuentos
        const freeShippingMin = user?.free_shipping_min_amount || 0;
        if (user?.free_shipping && freeShippingMin > 0) {
          regularShippingAmount = regularTotalAfterDiscount < freeShippingMin ? 150 : 0;
        } else {
          regularShippingAmount = regularTotalAfterDiscount < 3000 ? 150 : 0;
        }
      }

      // Calcular total final con descuentos y envío
      const regularFinalTotal = parseFloat((regularTotalAfterDiscount + regularShippingAmount).toFixed(2));
      
      // Calcular subtotal (monto total sin descuentos) y discounted_total (monto con descuentos pero sin envío)
      const regularSubtotal = regularItemsTotal; // Subtotal sin descuentos aplicados
      const regularDiscountedTotal = regularTotalAfterDiscount; // Total con descuentos aplicados (sin envío)

      // Preparar datos para el pago (solo productos regulares)
      const paymentData = {
        items: regularItems.map(item => {
          const mappedItem = {
            product_id: String(item.id_articulo || item.product_id || item.id), // Enviar como string para soportar IDs con ceros a la izquierda
            name: item.title || item.name,
            quantity: parseInt(item.quantity, 10),
            price: parseFloat(item.precio || item.price),
            size: item.selectedSize || null,
            color: item.selectedColor || null,
            barcode: item.barcode || null
          };

          return mappedItem;
        }),
        address_id: deliveryType === 'envio' ? selectedAddress.id : null,
        delivery_type: deliveryType, // 'envio' or 'retiro'
        shipping_amount: parseFloat(regularShippingAmount || 0), // Monto del envío
        total_amount: regularFinalTotal, // Total FINAL con descuentos y envío incluidos
        subtotal: regularSubtotal, // Monto total sin descuentos aplicados
        discounted_total: regularDiscountedTotal, // Monto total con descuentos aplicados (sin envío)
        use_credit: paymentMethod === 'credit',
        pay_remainder_with_mercadopago: paymentMethod === 'credit', // Si paga con crédito y hay pendiente, pagar resto con MP
        // Descuentos del 20% y 10% adicional
        descuento1: descuento1 || 0, // 20% cuando total elegible >= 7000
        descuento2: descuento2 || 0  // 10% adicional cuando total elegible >= 15000
      };

      let response;
      
      if (paymentMethod === 'credit') {
        // Mostrar loading
        if (window.showToast) {
          window.showToast('Procesando pago con crédito...', 'info');
        }
        
        // Llamar al mismo endpoint pero con use_credit=true
        response = await api.post('/payment/create-preference', paymentData);
      } else {
        // Mostrar loading
        if (window.showToast) {
          window.showToast('Creando preferencia de pago...', 'info');
        }
        
        response = await api.post('/payment/create-preference', paymentData);
      }

      if (response.data.success) {
        const { data } = response.data;

        // Si es pago con crédito
        if (paymentMethod === 'credit') {
          // Limpiar carrito
          clearCart();
          
          if (data.amount_pending > 0) {
            // Hay saldo pendiente - mostrar opción de pagar con MercadoPago
            if (window.showToast) {
              window.showToast(`Orden creada. Crédito usado: $${data.credit_used.toFixed(2)}. Saldo pendiente: $${data.amount_pending.toFixed(2)}`, 'info');
            }
            
            // Si hay URL de pago pendiente, redirigir
            if (data.payment_url || data.init_point || data.sandbox_init_point) {
              setTimeout(() => {
                window.location.href = data.init_point || data.sandbox_init_point || data.payment_url;
              }, 2000);
            } else {
              // Redirigir a página de éxito o mis órdenes
              setTimeout(() => {
                navigate('/compra-exitosa', {
                  state: {
                    orderInfo: {
                      orderId: data.order_id,
                      creditUsed: data.credit_used,
                      amountPending: data.amount_pending
                    }
                  }
                });
              }, 2000);
            }
          } else {
            // Pago completo con crédito
            if (window.showToast) {
              window.showToast('¡Gracias por tu compra!', 'success');
            }
            
            setTimeout(() => {
              navigate('/compra-exitosa', {
                state: {
                  orderInfo: {
                    orderId: data.order_id,
                    creditUsed: data.credit_used,
                    amountPending: 0
                  }
                }
              });
            }, 800);
          }
        } else {
          // Pago con MercadoPago (flujo normal)
          if (window.showToast) {
            window.showToast('¡Redirigiendo a MercadoPago!', 'success');
          }

          // Guardar información del pedido en localStorage para cuando regrese
          localStorage.setItem('pending_order', JSON.stringify({
            orderId: data.order_id,
            externalReference: data.external_reference,
            totalAmount: totalPrice
          }));

          // Redirigir a MercadoPago
          setTimeout(() => {
            window.location.href = data.init_point || data.sandbox_init_point || data.payment_url;
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

  // Calcular descuento dayFortyFive (30% o 40%)
  // Calcular total elegible (solo productos con desc_promo = 0 y sin userOffer)
  const eligibleItems = cartItems.filter(item => {
    const hasNoPromo = item.desc_promo === 0 || item.desc_promo === null || item.desc_promo === undefined;
    const hasNoUserOffer = !item.userOffer || item.userOffer.discount_category === null;
    return hasNoPromo && hasNoUserOffer;
  });

  // Calcular total elegible (suma de precios de productos elegibles)
  const eligibleTotal = eligibleItems.reduce((sum, item) => {
    const itemPrice = item.precio || item.price || 0;
    const itemQuantity = item.quantity || 0;
    return sum + (itemPrice * itemQuantity);
  }, 0);

  // Determinar porcentaje de descuento según categoría del usuario
  const isDiamanteUser = user && user.seller_category === 'diamante';
  const mainDiscountRate = isDiamanteUser ? 0.33 : 0.20;
  const mainDiscountPercent = isDiamanteUser ? 33 : 20;

  let dayFortyFiveDiscountAmount = 0;
  let discountTwentyAmount = 0;
  let discountAdditionalTenAmount = 0;
  let descuento1 = 0;
  let descuento2 = 0;
  
  if (eligibleTotal >= 7000) {
    discountTwentyAmount = eligibleTotal * mainDiscountRate;
    descuento1 = mainDiscountPercent;
    dayFortyFiveDiscountAmount = discountTwentyAmount;
    
    if (eligibleTotal >= 15000) {
      const totalAfterMain = eligibleTotal - discountTwentyAmount;
      discountAdditionalTenAmount = totalAfterMain * 0.10;
      descuento2 = 10;
      dayFortyFiveDiscountAmount = discountTwentyAmount + discountAdditionalTenAmount;
    }
  }

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
    discount1: descuento1, // 20% cuando total elegible >= 7000
    discount2: descuento2, // 10% adicional cuando total elegible >= 15000
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
  const DISCOUNT_30_THRESHOLD = 7000;
  const DISCOUNT_40_THRESHOLD = 15000;
  const NEAR_THRESHOLD_PERCENT = 0.7; // 70% del umbral = "ya casi"
  
  // Calcular alertas para descuentos
  const getDiscountAlerts = () => {
    const alerts = [];
    
    // Solo mostrar alertas si hay productos elegibles (sin rebaja)
    if (eligibleTotal <= 0) return alerts;

    // Para usuarios Diamante: mensajes genéricos sin revelar la categoría
    const discountLabel = isDiamanteUser ? 'tu descuento especial' : 'tu descuento del 30%';
    const maxDiscountLabel = isDiamanteUser
      ? '¡Felicidades! Has alcanzado el descuento máximo disponible'
      : '¡Increíble! Tienes el descuento máximo del 30% + 10% adicional';
    
    if (eligibleTotal < DISCOUNT_30_THRESHOLD) {
      const remaining = DISCOUNT_30_THRESHOLD - eligibleTotal;
      const isNear = eligibleTotal >= (DISCOUNT_30_THRESHOLD * NEAR_THRESHOLD_PERCENT);
      
      if (isNear) {
        alerts.push({
          type: 'near',
          icon: '🔥',
          message: isDiamanteUser
            ? `¡Ya casi! Te faltan $${formatMoney(remaining)} para activar tu descuento`
            : `¡Ya casi! Te faltan $${formatMoney(remaining)} para obtener tu descuento del 30%`,
          color: '#ff9800'
        });
      } else {
        alerts.push({
          type: 'info',
          icon: '💰',
          message: isDiamanteUser
            ? `Te faltan $${formatMoney(remaining)} para activar tu descuento`
            : `Te faltan $${formatMoney(remaining)} para obtener un descuento del 30%`,
          color: '#2196f3'
        });
      }
    }
    else if (eligibleTotal >= DISCOUNT_30_THRESHOLD && eligibleTotal < DISCOUNT_40_THRESHOLD) {
      const remaining = DISCOUNT_40_THRESHOLD - eligibleTotal;
      const isNear = eligibleTotal >= (DISCOUNT_40_THRESHOLD * NEAR_THRESHOLD_PERCENT);
      
      alerts.push({
        type: 'success',
        icon: '✅',
        message: isDiamanteUser
          ? '¡Felicidades! Ya tienes tu descuento activado'
          : `¡Felicidades! Ya tienes ${discountLabel}`,
        color: '#4caf50'
      });
      
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
    else if (eligibleTotal >= DISCOUNT_40_THRESHOLD) {
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
    message: 'Recuerda que en productos con rebaja no se aplica el descuento del 30%+10% adicional',
    color: '#ff9800'
  }] : [];

  const discountAlerts = getDiscountAlerts();
  const shippingAlerts = getShippingAlerts();
  const allAlerts = [...discountWarningAlert, ...discountAlerts, ...shippingAlerts];

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
                key={`${product.sku}-${product.variants[0].color}`}
                {...product}
                onRemove={variantIdx => handleRemoveVariant(idx, variantIdx)}
                onQuantityChange={(variantIdx, newQty) => handleQuantityChange(idx, variantIdx, newQty)}
              />
            ))}
          </div>
          <div className="cart-details__summary-col">
            {/* Card 1: Monto del pedido */}
            <OrderAmountCard
              pieces={totalItems}
              subtotal={baseTotal}
              discount={dayFortyFiveDiscountAmount}
              discountThirtyAmount={discountTwentyAmount}
              discountAdditionalTenAmount={discountAdditionalTenAmount}
              shipping={shippingAmount}
              isFreeShipping={isFreeShippingApplied}
              total={parseFloat(finalTotalWithShipping)}
              deliveryType={deliveryType}
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
