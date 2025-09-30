import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import api from '../config/axios';
import './CartDetailsPage.css';
import CartDetailsProductCard from '../components/CartDetailsProductCard';
import CartOrderSummary from '../components/CartOrderSummary/CartOrderSummary';
import AddressSelector from '../components/AddressSelector/AddressSelector';
import BuyerInfo from '../components/BuyerInfo/BuyerInfo';

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

  // State for selected address
  const [selectedAddress, setSelectedAddress] = useState(null);
  
  // State for selected payment card
  const [selectedPaymentCard, setSelectedPaymentCard] = useState(null);

  // Initialize cart from localStorage
  useEffect(() => {
    initCart();
  }, [initCart]);

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
        totalPrice: 0
      };
    }
    
    // Add size variant
    groups[key].variants.push({
      color: item.selectedColor,
      size: item.selectedSize,
      quantity: item.quantity
    });
    
    // Update totals
    groups[key].totalQuantity += item.quantity;
    groups[key].totalPrice += item.precio * item.quantity;
    
    return groups;
  }, {});

  // Convert grouped products to array format
  const productsForDisplay = Object.values(groupedProducts).map((groupedProduct) => ({
    image: groupedProduct.image || '/images/placeholder.jpg',
    sku: groupedProduct.id_articulo,
    title: groupedProduct.title,
    price: groupedProduct.precio,
    variants: groupedProduct.variants,
    summary: {
      quantity: groupedProduct.totalQuantity,
      priceWithDiscount: groupedProduct.totalPrice
    }
  }));

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
  const handleQuantityChange = (productIdx, variantIdx, newQty) => {
    const product = productsForDisplay[productIdx];
    const variant = product.variants[variantIdx];
    
    if (newQty >= 1) {
      // Find the specific item in cart
      const itemToUpdate = cartItems.find(item => 
        item.id_articulo === product.sku &&
        item.selectedColor === variant.color &&
        item.selectedSize === variant.size
      );
      
      if (itemToUpdate) {
        updateQuantity(itemToUpdate.id_articulo, newQty, itemToUpdate.selectedColor, itemToUpdate.selectedSize);
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
            console.error('Item sin product_id:', item);
          }
          
          return mappedItem;
        }),
        address_id: selectedAddress.id,
        total_amount: totalPrice
      };

      console.log('Datos de pago preparados:', paymentData);

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
      console.error('Error creating payment preference:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Error al procesar el pago';
      
      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      }
    }
  };

  // Handle integrated payment success
  const handleIntegratedPaymentSuccess = (paymentData) => {
    console.log('Pago integrado exitoso:', paymentData);
    
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
    console.error('Error en pago integrado:', error);
    // El error ya se maneja en el componente IntegratedCheckout
  };

  // Order summary data
  const orderSummary = {
    creditDays: '',
    discount1: 0,
    discount2: 0,
    pieces: totalItems,
    subtotal: (totalPrice && typeof totalPrice === 'number') ? totalPrice.toFixed(2) : '0.00',
    discountTotal: '0.00',
    total: (totalPrice && typeof totalPrice === 'number') ? totalPrice.toFixed(2) : '0.00',
    selectedAddress: selectedAddress,
    onGenerateOrder: handleGenerateOrder,
    onClearCart: handleClearCart
  };

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
