import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../../utils/formatters';
import './CartDetailsProductCard.css';

const DesktopView = ({ image, sku, title, price, variants = [], summary, onQuantityChange, onRemove }) => {
  if (!title || !image) return null;
  
  const [selectedColor, setSelectedColor] = useState(variants[0]?.color || null);

  // Color mapping for display
  const colorMap = {
    red: '#e74c3c',
    blue: '#3498db', 
    green: '#27ae60',
    yellow: '#f1c40f',
    black: '#373737',
    white: '#ecf0f1',
    pink: '#e91e63',
    purple: '#9b59b6',
    orange: '#f39c12',
    gray: '#95a5a6'
  };

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1) {
      onQuantityChange(sku, newQuantity); // Pass product ID (sku) instead of variant index
    }
  };

  const handleRemove = () => {
    onRemove(sku); // Pass product ID (sku) instead of variant index
  };

  return (
    <div className="cart-details-product-card">
      <div className="cart-details-product-card__image-container">
        <Link to={`/producto/${sku}`}>
          <img 
            src={image} 
            alt={title} 
            className="cart-details-product-card__image" 
          />
        </Link>
      </div>
      
      <div className="cart-details-product-card__content">
        <div className="cart-details-product-card__header">
          <Link to={`/producto/${sku}`} className="cart-details-product-card__title-link">
            <h3 className="cart-details-product-card__title">{title}</h3>
          </Link>
          <button 
            onClick={handleRemove}
            className="cart-details-product-card__remove-btn"
            aria-label="Eliminar producto"
          >
            ×
          </button>
        </div>
        
        <div className="cart-details-product-card__details">
          <div className="cart-details-product-card__unit-price">
            <span className="cart-details-product-card__unit-price-label">Precio unitario:</span>
            <div className="cart-details-product-card__unit-price-value">{formatPrice(price)}</div>
          </div>
          
          <div className="cart-details-product-card__quantity">
            <span className="cart-details-product-card__quantity-label">Cantidad:</span>
            <div className="cart-details-product-card__quantity-controls">
              <button 
                onClick={() => handleQuantityChange((summary?.quantity || 1) - 1)}
                className="cart-details-product-card__quantity-btn"
                disabled={(summary?.quantity || 1) <= 1}
              >
                -
              </button>
              <span className="cart-details-product-card__quantity-value">{summary?.quantity || 1}</span>
              <button 
                onClick={() => handleQuantityChange((summary?.quantity || 1) + 1)}
                className="cart-details-product-card__quantity-btn"
              >
                +
              </button>
            </div>
          </div>
          
          {variants.length > 0 && (
            <div className="cart-details-product-card__colors">
              <span className="cart-details-product-card__colors-label">Colores disponibles:</span>
              <div className="cart-details-product-card__color-options">
                {variants.map((variant, index) => (
                  <button
                    key={index}
                    className={`cart-details-product-card__color-option ${selectedColor === variant.color ? 'selected' : ''}`}
                    style={{ backgroundColor: colorMap[variant.color] || variant.color }}
                    onClick={() => setSelectedColor(variant.color)}
                    aria-label={`Seleccionar color ${variant.color}`}
                    title={variant.color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="cart-details-product-card__summary">
          <div className="cart-details-product-card__subtotal">
            <span className="cart-details-product-card__subtotal-label">Subtotal:</span>
            <span className="cart-details-product-card__subtotal-value">
              {formatPrice(price * (summary?.quantity || 1))}
            </span>
          </div>
          
          {summary && (
            <div className="cart-details-product-card__discount">
              <span className="cart-details-product-card__discount-label">Descuento:</span>
              <span className="cart-details-product-card__discount-value">
                {formatPrice(summary.priceWithoutDiscount - summary.priceWithDiscount)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesktopView; 