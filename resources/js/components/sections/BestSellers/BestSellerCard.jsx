import React from 'react';
import { Link } from 'react-router-dom';
import FavoriteButton from '../../FavoriteButton/FavoriteButton';
import StarRating from '../../StarRating/StarRating';
import { formatPrice } from '../../../utils/formatters';
import './BestSellerCard.css';

const BestSellerCard = ({ id, title, image, price, rating, description, onFavoriteToggle }) => {
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
        
        {/* Favorite Button */}
        <FavoriteButton 
          productId={id}
          productTitle={title}
          productImage={image}
          productPrice={price}
          onToggle={onFavoriteToggle}
          size="medium"
        />
      </div>

      {/* Product Info */}
      <div className="best-seller-info">
        {/* Description */}
        <p className="best-seller-description">{description}</p>
        
        {/* Title */}
        <h3 className="best-seller-title">{title}</h3>
        
        {/* Rating */}
        <div className="best-seller-rating">
          <StarRating rating={rating} />
        </div>
        
        {/* Price */}
        <div className="best-seller-price">
          <span className="price-label">Desde:</span>
          <span className="price-value">{formatPrice(price)}</span>
        </div>
      </div>
    </div>
  );
};

export default BestSellerCard; 
