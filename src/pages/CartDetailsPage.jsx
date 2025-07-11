import { useState } from 'react';
import './CartDetailsPage.css';
import CartDetailsProductCard from '../components/CartDetailsProductCard';
import CartOrderSummary from '../components/CartOrderSummary/CartOrderSummary';
import { useNavigate } from 'react-router-dom';

const mockProducts = [
  {
    image: '/images/catalogProductImages/Rectangle 4922.png',
    sku: '50521255112',
    title: 'Chamarra de mezclilla con detalles bordados',
    isDiscount: true,
    discountLabel: 'Descuento cliente',
    price: 29.00,
    variants: [
      { color: 'Azul', size: '6', quantity: 2 },
      { color: 'Azul', size: '8', quantity: 2 }
    ],
    summary: { quantity: 4, priceWithoutDiscount: 1899.00, priceWithDiscount: 1329.30 }
  },
  {
    image: '/images/catalogProductImages/Rectangle 4922 (1).png',
    sku: '50521255112',
    title: 'Chamarra de mezclilla con detalles bordados',
    isDiscount: false,
    discountLabel: 'Sin descuento',
    price: 29.00,
    variants: [
      { color: 'Azul', size: '6', quantity: 2 },
      { color: 'Azul', size: '8', quantity: 2 }
    ],
    summary: { quantity: 4, priceWithoutDiscount: 1899.00, priceWithDiscount: 1329.30 }
  },
  {
    image: '/images/HeroBanner/hero-slider1-girl.png',
    sku: '50521255112',
    title: 'Chamarra de mezclilla con detalles bordados',
    isDiscount: true,
    discountLabel: 'Descuento cliente',
    price: 29.00,
    variants: [
      { color: 'Azul', size: '6', quantity: 2 },
      { color: 'Azul', size: '8', quantity: 2 }
    ],
    summary: { quantity: 4, priceWithoutDiscount: 1899.00, priceWithDiscount: 1329.30 }
  }
];

const CartDetailsPage = () => {
  const [products, setProducts] = useState(mockProducts);
  const navigate = useNavigate();

  // Simulación de handlers para eliminar y cambiar cantidad
  const handleRemoveVariant = (productIdx, variantIdx) => {
    setProducts(prev => prev.map((p, i) =>
      i === productIdx
        ? { ...p, variants: p.variants.filter((_, vi) => vi !== variantIdx) }
        : p
    ));
  };
  
  const handleQuantityChange = (productIdx, variantIdx, newQty) => {
    setProducts(prev => prev.map((p, i) =>
      i === productIdx
        ? { ...p, variants: p.variants.map((v, vi) => vi === variantIdx ? { ...v, quantity: Math.max(1, newQty) } : v) }
        : p
    ));
  };

  // Datos de resumen de pedido (simulados)
  const orderSummary = {
    responsable: '(SIMCRE) Simón Credi',
    creditDays: '',
    discount1: 30,
    discount2: 0,
    pieces: 6,
    subtotal: 3798.00,
    discountTotal: 1899.00,
    total: 2658.60,
    onGenerateOrder: () => navigate('/compra-exitosa'),
    onClearCart: () => alert('Vaciar carrito')
  };

  return (
    <div className="container cart-details__container">
      <header className="cart-details__header">
        <h1 className="cart-details__title">Carrito de compras</h1>
        <div className="cart-details__header-actions">
          <span className="cart-details__items-count">
            ({products.length}) <span className="cart-details__items-label">item agregados</span>
          </span>
          <button className="cart-details__continue-btn">
            <span className="cart-details__continue-icon">+</span>
            <span className="cart-details__continue-text"> Seguir comprando</span>
          </button>
        </div>
      </header>
      <div className="cart-details__content">
        <div className="cart-details__products-col">
          {products.map((product, idx) => (
            <CartDetailsProductCard
              key={idx}
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
    </div>
  );
};

export default CartDetailsPage; 