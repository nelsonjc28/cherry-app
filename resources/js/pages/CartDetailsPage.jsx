import { useState, useEffect } from 'react';
import './CartDetailsPage.css';
import CartDetailsProductCard from '../components/CartDetailsProductCard';
import CartOrderSummary from '../components/CartOrderSummary/CartOrderSummary';
import { useNavigate } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import { formatPrice } from '../utils/formatters';

const CartDetailsPage = () => {
  const navigate = useNavigate();
  const { items: cartItems, totalItems, totalPrice, removeItem, updateQuantity, initCart, clearCart } = useCartStore();

  // Initialize cart totals when component mounts
  useEffect(() => {
    initCart();
  }, [initCart]);

  // Debug: mostrar datos del carrito en localStorage

  // Mostrar todos los valores de localStorage de forma segura
  Object.keys(localStorage).forEach(key => {
    try {
      const value = localStorage.getItem(key);
      // Intentar parsear como JSON solo si parece ser JSON
      if (value && (value.startsWith('{') || value.startsWith('['))) {
      }
    } catch (error) {
    }
  });

  // Handle remove item
  const handleRemoveItem = (productId, selectedColor, selectedSize) => {
    removeItem(productId, selectedColor, selectedSize);
  };

  // Handle quantity change
  const handleQuantityChange = (productId, newQuantity, selectedColor, selectedSize) => {
    if (newQuantity >= 1) {
      updateQuantity(productId, newQuantity, selectedColor, selectedSize);
    }
  };

  const handleRemoveVariant = (productIdx, variantIdx) => {
    setProducts(prev => prev.map((p, i) =>
      i === productIdx
        ? { ...p, variants: p.variants.filter((_, vi) => vi !== variantIdx) }
        : p
    ));
  };
  
  // Handle clear cart
  const handleClearCart = () => {
    clearCart();
    alert('Carrito vaciado');
  };

  // Datos de resumen de pedido
  const orderSummary = {
    responsable: '(SIMCRE) Simón Credi',
    creditDays: '',
    discount1: 30,
    discount2: 0,
    pieces: totalItems,
    subtotal: totalPrice,
    discountTotal: totalPrice * 0.3, // 30% discount
    total: totalPrice * 0.7, // 70% of total
    onGenerateOrder: () => navigate('/compra-exitosa'),
    onClearCart: handleClearCart
  };

  if (cartItems.length === 0) {

    return (
      <div className="container cart-details__container">

        <div className="cart-details__empty">
          <h2>Tu carrito está vacío</h2>
          <p>No tienes productos en tu carrito de compras.</p>
          <button
            className="cart-details__continue-btn"
            onClick={() => navigate('/catalogo')}
          >
            Continuar Comprando
          </button>
        </div>
      </div>
    );
  }

  return (
    
    <div className="container cart-details__container">
        {/* <pre>{JSON.stringify(cartItems, null, 2)}</pre> */}
    
      <header className="cart-details__header">
        <h1 className="cart-details__title">Carrito de compras</h1>
        <div className="cart-details__header-actions">
          <span className="cart-details__items-count">
            ({cartItems.length}) <span className="cart-details__items-label">item agregados</span>
          </span>
          <button className="cart-details__continue-btn">
            <span className="cart-details__continue-icon">+</span>
            <span className="cart-details__continue-text"> Seguir comprando</span>
          </button>
        </div>
      </header>
      <div className="cart-details__content">
        <div className="cart-details__products-col">
          {cartItems.map((product) => (
            <CartDetailsProductCard
              key={product.id}
              {...product}
              onRemove={variantIdx => handleRemoveVariant(product.id, variantIdx)}
              onQuantityChange={(variantIdx, newQty) => handleQuantityChange(product.id, variantIdx, newQty)}
            />
          ))}
        </div>
        <div className="cart-details__summary-col">
          <CartOrderSummary {...orderSummary} />
        </div>
      </div>
    </div>

  );
};

export default CartDetailsPage; 