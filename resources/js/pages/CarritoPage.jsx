import React, { useState, useEffect } from 'react';
import useCartStore from '../store/cartStore';
import CartDetailsProductCard from '../components/CartDetailsProductCard';
import OrderSummaryTable from '../components/OrderSummaryTable/OrderSummaryTable';
import './CarritoPage.css';
import { validateStock } from '../services/inventoryService';

const CarritoPage = () => {
  const { items: cartItems, totalItems, totalPrice, removeItem, updateQuantity, initCart, refreshCartOffers } = useCartStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadCart = async () => {
      await initCart();
      await refreshCartOffers();
    };
    loadCart();
  }, [initCart, refreshCartOffers]);

  const handleClearCart = () => {
    const { clearCart } = useCartStore.getState();
    clearCart();
  };

  const handleUpdateQuantity = async (productId, newQuantity, color, size) => {
    if (newQuantity < 1) return;

    // Validar stock disponible
    try {
      const stockValidation = await validateStock(productId, size, color, newQuantity);

      if (!stockValidation.isValid) {
        // Mostrar mensaje de error con el stock disponible
        if (window.showToast) {
          window.showToast(stockValidation.message, 'error');
        }
        
        // Si hay stock disponible pero menos de lo solicitado, ajustar a lo disponible
        if (stockValidation.availableStock > 0) {
          updateQuantity(productId, stockValidation.availableStock, color, size);
        }
        return;
      }

      // Si la validación es exitosa, actualizar la cantidad
      updateQuantity(productId, newQuantity, color, size);
    } catch (error) {
      if (window.showToast) {
        window.showToast('Error al validar disponibilidad del producto', 'error');
      }
    }
  };

  const handleRemoveItem = (productId, color, size) => {
    removeItem(productId, color, size);
  };

  return (
    <div className="carrito-page">
      <div className="container">
        <div className="carrito-content">
          <div className="carrito-items-section">
            <div className="carrito-header">
              <h1>Carrito de Compras</h1>
              {cartItems.length > 0 && (
                <button 
                  className="clear-cart-btn" 
                  onClick={handleClearCart}
                >
                  Limpiar Carrito
                </button>
              )}
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
                quantity={totalItems}
                priceWithDiscount={totalPrice}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CarritoPage; 
