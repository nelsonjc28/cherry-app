import React, { useState, useEffect } from 'react';
import useCartStore from '../store/cartStore';
import CartDetailsProductCard from '../components/CartDetailsProductCard';
import OrderSummaryTable from '../components/OrderSummaryTable/OrderSummaryTable';
import './CartDetailsPage.css';

const CartDetailsPage = () => {
  const { items: cartItems, totalItems, totalPrice, removeItem, updateQuantity, initCart } = useCartStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initCart();
  }, [initCart]);

  const handleUpdateQuantity = (productId, newQuantity, color, size) => {
    if (newQuantity >= 1) {
      updateQuantity(productId, newQuantity, color, size);
    }
  };

  const handleRemoveItem = (productId, color, size) => {
    removeItem(productId, color, size);
  };

  return (
    <div className="cart-details-page">
      <div className="container">
        <div className="cart-details-content">
          <div className="cart-items-section">
            <div className="cart-header">
              <h1>Detalles del Carrito</h1>
            </div>
            
            {cartItems.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-cart-icon">🛒</div>
                <h2>Tu carrito está vacío</h2>
                <p>Agrega algunos productos para comenzar a comprar</p>
                <a href="/" className="continue-shopping-btn">
                  Continuar Comprando
                </a>
              </div>
            ) : (
              <div className="cart-items">
                {cartItems.map((item, index) => (
                  <CartDetailsProductCard
                    key={`${item.id_articulo}-${item.selectedColor}-${item.selectedSize}`}
                    image={item.image}
                    sku={item.id_articulo}
                    title={item.title}
                    price={item.precio}
                    variants={[
                      {
                        color: item.selectedColor,
                        size: item.selectedSize,
                        quantity: item.quantity
                      }
                    ]}
                    summary={{
                      quantity: item.quantity,
                      priceWithDiscount: item.precio * item.quantity,
                      priceWithoutDiscount: item.precio * item.quantity
                    }}
                    onQuantityChange={handleUpdateQuantity}
                    onRemove={handleRemoveItem}
                  />
                ))}
              </div>
            )}
          </div>
          
          {cartItems.length > 0 && (
            <div className="order-summary-section">
              <OrderSummaryTable 
                summary={{
                  items: cartItems,
                  totalItems,
                  totalPrice
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartDetailsPage; 