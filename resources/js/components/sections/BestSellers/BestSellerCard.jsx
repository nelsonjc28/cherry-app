import React from 'react';
import FavoriteButton from '../../FavoriteButton/FavoriteButton';
import './BestSellerCard.css';

const BestSellerCard = ({ id, title, image, price, rating, description, onFavoriteToggle }) => {
  // Generate stars based on rating
  const generateStars = (rating) => {
    return '★'.repeat(rating);
  };

  return (
    <div className="best-seller-card">
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
          <span className="stars">{generateStars(rating)}</span>
        </div>
        
        {/* Price */}
        <div className="best-seller-price">
          <span className="price-label">Desde:</span>
          <span className="price-value">${price}</span>
        </div>
      </div>
    </div>
  );
};

export default BestSellerCard; 