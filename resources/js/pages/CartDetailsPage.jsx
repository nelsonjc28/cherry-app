import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import api from '../config/axios';
import './CartDetailsPage.css';
import CartDetailsProductCard from '../components/CartDetailsProductCard';
import CartOrderSummary from '../components/CartOrderSummary/CartOrderSummary';
import AddressSelector from '../components/AddressSelector/AddressSelector';
import BuyerInfo from '../components/BuyerInfo/BuyerInfo';
import { validateStock } from '../services/inventoryService';
import useUserStore from '../store/userStore';





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

  // Initialize cart from localStorage
  useEffect(() => {
    initCart();
  }, [initCart]);

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
    
    return {
      image: groupedProduct.image || '/images/placeholder.jpg',
      sku: groupedProduct.id_articulo,
      title: groupedProduct.title,
      price: parseFloat(groupedProduct.precio).toFixed(2),
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

  // Handle generate order with MercadoPago
  const handleGenerateOrder = async () => {
    if (!selectedAddress) {
      if (window.showToast) {
        window.showToast('Por favor selecciona una dirección de entrega', 'warning');
      }
      return;
    }

    if (cartItems.length === 0) {
      if (window.showToast) {
        window.showToast('No hay productos en el carrito', 'warning');
      }
      return;
    }

    try {
      // Mostrar loading
      if (window.showToast) {
        window.showToast('Creando preferencia de pago...', 'info');
      }

      // Preparar datos para MercadoPago
      const paymentData = {
        items: cartItems.map(item => {
          const mappedItem = {
            product_id: item.id_articulo || item.product_id || item.id,
            name: item.title || item.name,
            quantity: item.quantity,
            price: item.precio || item.price,
            size: item.selectedSize || null,
            color: item.selectedColor || null,
            barcode: item.barcode || null
          };

          // Debug: verificar que todos los campos requeridos estén presentes
          if (!mappedItem.product_id) {
          }

          return mappedItem;
        }),
        address_id: selectedAddress.id,
        total_amount: totalPrice
      };;

      const response = await api.post('/payment/create-preference', paymentData);

      if (response.data.success) {
        const { data } = response.data;

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

    // Mostrar mensaje de éxito
    if (window.showToast) {
      window.showToast('¡Pago procesado exitosamente!', 'success');
    }

    // Redirigir a página de éxito
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
    }, 1500);
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

  // Calcular monto del descuento dayFortyFive
  let dayFortyFiveDiscountAmount = 0;
  if (eligibleTotal >= 7000) {
    if (eligibleTotal >= 15000) {
      // 40% descuento sobre el total elegible
      dayFortyFiveDiscountAmount = eligibleTotal * 0.40;
    } else if (eligibleTotal >= 7000) {
      // 30% descuento sobre el total elegible
      dayFortyFiveDiscountAmount = eligibleTotal * 0.30;
    }
  }

  // El total SIN descuento (CartOrderSummary aplicará el descuento internamente)
  const baseTotal = (totalPrice && typeof totalPrice === 'number') ? totalPrice : 0;

  // Order summary data
  const orderSummary = {
    creditDays: '',
    discount1: 0,
    discount2: 0,
    pieces: totalItems,
    subtotal: baseTotal.toFixed(2),
    discountTotal: dayFortyFiveDiscountAmount > 0 ? dayFortyFiveDiscountAmount.toFixed(2) : '0.00',
    total: baseTotal.toFixed(2), // Total SIN descuento - CartOrderSummary lo aplicará
    daysFortyFive: user?.day_forty_five,
    freeShipping: user?.free_shipping,
    freeShippingMinAmount: user?.free_shipping_min_amount || 0,
    selectedAddress: selectedAddress,
    onGenerateOrder: handleGenerateOrder,
    onClearCart: handleClearCart
  };

  console.log(orderSummary);

  


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
            <BuyerInfo className="cart-details__buyer-info" />
            <AddressSelector
              selectedAddressId={selectedAddress?.id}
              onAddressChange={handleAddressChange}
              className="cart-details__address-selector"
            />

            {/* Resumen de la orden con formulario integrado */}
            <CartOrderSummary
              {...orderSummary}
              cartItems={cartItems}
              selectedAddress={selectedAddress}
              selectedPaymentCard={selectedPaymentCard}
              onPaymentCardChange={setSelectedPaymentCard}
              onIntegratedPaymentSuccess={handleIntegratedPaymentSuccess}
              onIntegratedPaymentError={handleIntegratedPaymentError}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CartDetailsPage; 
