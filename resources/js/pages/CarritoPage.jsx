import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import useCartStore from '../store/cartStore';
import { formatPrice } from '../utils/formatters';
import './CarritoPage.css';
import CartDetailsProductCard from '../components/CartDetailsProductCard';

const CarritoPage = () => {
  console.log('=== CARRITO PAGE LOADING ===');
  
  const { items: cartItems, totalItems, totalPrice, removeItem, updateQuantity, initCart } = useCartStore();
  const [loading, setLoading] = useState(false);

  console.log('=== CART STORE DATA ===', { cartItems, totalItems, totalPrice });

  // Initialize cart totals when component mounts
  useEffect(() => {
    console.log('=== INIT CART CALLED ===');
    initCart();
  }, [initCart]);

  // Debug: mostrar datos del carrito en localStorage
  console.log('=== ALL LOCALSTORAGE KEYS ===', Object.keys(localStorage));
  console.log('=== CART DATA IN LOCALSTORAGE ===', JSON.parse(localStorage.getItem('cart') || '[]'));
  console.log('=== CHERRY CENTRAL CART IN LOCALSTORAGE ===', JSON.parse(localStorage.getItem('cherry-central-cart') || '{}'));
  
  // Mostrar todos los valores de localStorage
  Object.keys(localStorage).forEach(key => {
    console.log(`=== LOCALSTORAGE KEY: ${key} ===`, JSON.parse(localStorage.getItem(key) || '{}'));
  });

  // Función temporal para limpiar carrito (solo para debug)
  const clearCartDebug = () => {
    const { clearCart } = useCartStore.getState();
    clearCart();
  };

  // Handle quantity change
  const handleQuantityChange = (productId, newQuantity, selectedColor, selectedSize) => {
    if (newQuantity >= 1) {
      updateQuantity(productId, newQuantity, selectedColor, selectedSize);
    }
  };

  // Handle remove item
  const handleRemoveItem = (productId, selectedColor, selectedSize) => {
    removeItem(productId, selectedColor, selectedSize);
  };

  // Handle checkout
  const handleCheckout = async () => {
    setLoading(true);
    // Simulate checkout process
    setTimeout(() => {
      setLoading(false);
      // Navigate to checkout page or show success message
    }, 2000);
  };

  if (cartItems.length === 0) {
    return (
      <>
        <Helmet>
          <title>Carrito de Compras - Cherry</title>
          <meta name="description" content="Tu carrito de compras está vacío. Explora nuestros productos y agrega algo especial." />
        </Helmet>
        
        <div className="carrito-page">
          <div className="container">
            <div className="carrito-empty">
              <div className="carrito-empty-icon">
                <img src="/icons/Shopping Cart.svg" alt="Carrito vacío" />
              </div>
              <h1 className="carrito-empty-title">Tu carrito está vacío</h1>
              <p className="carrito-empty-description">
                Parece que aún no has agregado productos a tu carrito. 
                Explora nuestro catálogo y encuentra algo especial.
              </p>
              <Link to="/catalogo" className="carrito-empty-button">
                Explorar Productos
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Carrito de Compras - Cherry</title>
        <meta name="description" content="Revisa tu carrito de compras. Agrega, modifica o elimina productos antes de proceder al checkout." />
      </Helmet>

      <div className="carrito-page">
        <div className="container">
          <div className="carrito-header">
            <h1 className="carrito-title">Carrito de Compras</h1>
            <div className="carrito-summary">
              <span className="carrito-items-count">
                {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
              </span>
            </div>
            {/* Botón temporal para limpiar carrito */}
            <button onClick={clearCartDebug} style={{ marginLeft: '10px', padding: '5px 10px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px' }}>
              Limpiar Carrito (Debug)
            </button>
          </div>

          <div className="carrito-content">
            <div className="carrito-items">
              {cartItems.map((item) => (
                <CartDetailsProductCard
                  key={`${item.id}-${item.selectedColor || ''}-${item.selectedSize || ''}`}
                  image={item.image}
                  sku={item.id}
                  title={item.title}
                  price={item.price}
                  variants={[
                    {
                      color: item.selectedColor,
                      size: item.selectedSize,
                      quantity: item.quantity
                    }
                  ]}
                  summary={{}}
                  onRemove={() => handleRemoveItem(item.id, item.selectedColor, item.selectedSize)}
                  onQuantityChange={(id, newQuantity) => handleQuantityChange(id, newQuantity, item.selectedColor, item.selectedSize)}
                />
              ))}
            </div>

            <div className="carrito-summary-sidebar">
              <div className="carrito-summary-card">
                <h3 className="carrito-summary-title">Resumen del Pedido</h3>
                
                <div className="carrito-summary-row">
                  <span>Subtotal ({totalItems} {totalItems === 1 ? 'producto' : 'productos'}):</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                
                <div className="carrito-summary-row">
                  <span>Envío:</span>
                  <span>Gratis</span>
                </div>
                
                <div className="carrito-summary-total">
                  <span>Total:</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                
                <button 
                  onClick={handleCheckout}
                  disabled={loading}
                  className="carrito-checkout-button"
                >
                  {loading ? 'Procesando...' : 'Proceder al Pago'}
                </button>
                
                <Link to="/catalogo" className="carrito-continue-shopping">
                  Continuar Comprando
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CarritoPage; 