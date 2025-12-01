import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import FavoriteButton from '../../FavoriteButton/FavoriteButton';
import StarRating from '../../StarRating/StarRating';
import { formatPrice } from '../../../utils/formatters';
import './BestSellerCard.css';

const BestSellerCard = ({ id, title, image, price, originalPrice, discount, userOffer, hasUserOffer, rating, totalRatings, description, stock = 0, onFavoriteToggle }) => {
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

        {/* Out of stock badge - highest priority */}
        {stock <= 0 && (
          <span className="best-seller-out-of-stock-badge">Agotado</span>
        )}

        {/* Offer badge if product has discount and is in stock */}
        {stock > 0 && hasOffer && (
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
