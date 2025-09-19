import React from 'react';
import { Link } from 'react-router-dom';
import FavoriteButton from '../../FavoriteButton/FavoriteButton';
import StarRating from '../../StarRating/StarRating';
import { formatPrice } from '../../../utils/formatters';
import './BestSellerCard.css';

const BestSellerCard = ({ id, title, image, price, originalPrice, discount, rating, description, onFavoriteToggle }) => {
  // Calculate discount percentage - Nueva lógica usando desc_promo
  const calculateDiscountPercentage = () => {
    // Si ya viene calculado desde la API (desc_promo), usarlo
    if (discount && discount > 0) {
      return Math.round(discount);
    }

    // Fallback: calcular usando originalPrice vs price
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
    <div className="best-seller-card" onClick={handleCardClick}>
      {/* Product Image Container */}
      <div className="best-seller-image-container">
        <img
          src={image}
          alt={title}
          className="best-seller-image"
          loading="lazy"
        />

        {/* Offer badge if product has discount */}
        {hasOffer && (
          <span className="best-seller-offer-badge">
            Oferta {discountPercentage}%
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
          <StarRating rating={rating} />

          {/* Price */}
          <div className="best-seller-price">
            <span className="price-label">Desde:</span>
            <div className="best-seller-price-container">
              <span className="price-value">${price.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BestSellerCard; 
