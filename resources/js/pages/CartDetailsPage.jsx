import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import './CartDetailsPage.css';
import CartDetailsProductCard from '../components/CartDetailsProductCard';
import CartOrderSummary from '../components/CartOrderSummary/CartOrderSummary';

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

  // Handle generate order
  const handleGenerateOrder = () => {
    navigate('/compra-exitosa');
  };

  // Order summary data
  const orderSummary = {
    responsable: '', // Add user info if available
    creditDays: '',
    discount1: 0,
    discount2: 0,
    pieces: totalItems,
    subtotal: totalPrice.toFixed(2),
    discountTotal: '0.00',
    total: totalPrice.toFixed(2),
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
            <CartOrderSummary {...orderSummary} />
          </div>
        </div>
      )}
    </div>
  );
};

export default CartDetailsPage; 