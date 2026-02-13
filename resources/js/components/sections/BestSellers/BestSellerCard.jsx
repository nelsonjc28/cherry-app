import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import FavoriteButton from '../../FavoriteButton/FavoriteButton';
import StarRating from '../../StarRating/StarRating';
import { formatPrice } from '../../../utils/formatters';
import './BestSellerCard.css';

const BestSellerCard = ({ id, title, image, price, originalPrice, discount, userOffer, hasUserOffer, rating, totalRatings, description, stock = 0, isNew = false, onFavoriteToggle }) => {
  // Hook para detectar si es móvil
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  // Calculate discount percentage - Priorizar oferta personalizada
  const calculateDiscountPercentage = () => {
    // PRIORIDAD 1: Oferta personalizada del usuario
    if (hasUserOffer && userOffer && userOffer.percentage > 0) {
      return Math.round(userOffer.percentage);
    }
    
    // PRIORIDAD 2: Descuento general desde la API (desc_promo)
    if (discount && discount > 0) {
      return Math.round(discount);
    }

    // PRIORIDAD 3: Fallback usando originalPrice vs price
    if (originalPrice && price && originalPrice > price) {
      return Math.round(((originalPrice - price) / originalPrice) * 100);
    }

    return 0;
  };

  const discountPercentage = calculateDiscountPercentage();
  const hasOffer = discountPercentage > 0;

  // REGLA DE NEGOCIO GLOBAL: Lógica de Etiquetas de Disponibilidad
  // - "Próximamente": Si el tercer dígito del ID (índice 2) coincide con el último dígito del año actual, independientemente del stock
  // - "Agotado": Si stock === 0 Y el tercer dígito del ID NO coincide con el último dígito del año actual
  const productId = String(id || '');
  const tercerDigito = productId.length > 2 ? productId[2] : null;
  const currentYearLastDigit = String(new Date().getFullYear() % 10);
  const isComingSoon = tercerDigito === currentYearLastDigit;
  const isOutOfStock = stock === 0 && !isComingSoon;

  const handleCardClick = (e) => {
    // No navegar si se hace clic en el botón de favoritos
    if (e.target.closest('.favorite-button')) {
      return;
    }
    // Navegar al detalle del producto
    window.location.href = `/producto/${id}`;
  };

  return (
    <div className="best-seller-card">
      {/* Product Image Container */}
      <div className="best-seller-image-container" onClick={handleCardClick}>
        <img
          src={image}
          alt={title}
          className="best-seller-image"
          loading="lazy"
        />

        {/* New badge - highest priority if product is new */}
        {isNew && (
          <span className="best-seller-new-badge">Nuevo</span>
        )}

        {/* Próximamente badge - si el tercer dígito del ID es "6" */}
        {!isNew && isComingSoon && (
          <span className="best-seller-out-of-stock-badge" style={{ backgroundColor: 'rgb(255, 152, 0)', color: 'rgb(255, 255, 255)' }}>Próximamente</span>
        )}

        {/* Out of stock badge - solo si NO es nuevo y NO es "Próximamente" */}
        {!isNew && !isComingSoon && isOutOfStock && (
          <span className="best-seller-out-of-stock-badge">Agotado</span>
        )}

        {/* Offer badge if product has discount (and is not new) */}
        {!isNew && stock > 0 && hasOffer && (
          <span className="best-seller-offer-badge">
            {!isMobile && "Rebaja "}{discountPercentage}%
          </span>
        )}

        {/* Favorite Button */}
        {/* <FavoriteButton
          productId={id}
          productTitle={title}
          productImage={image}
          productPrice={price}
          onToggle={onFavoriteToggle}
          size="medium"
        /> */}
      </div>

      {/* Product Info */}
      <div className="best-seller-info">
        {/* Title */}
        <h3 className="best-seller-title">{title}</h3>

        {/* Description */}
        <p className="best-seller-description">{description}</p>

        {/* Rating and Price Row */}
        <div className="best-seller-rating">
          <StarRating 
            rating={rating || 0} 
            totalRatings={totalRatings || 0}
            readonly={true} 
          />

          {/* Price */}
          <div className="best-seller-price">
            <span className="price-label">Desde:</span>
            <div className="best-seller-price-container">
              <span className="price-value">${(price && typeof price === 'number') ? price.toFixed(2) : '0.00'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BestSellerCard; 
