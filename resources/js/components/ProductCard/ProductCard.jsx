import { Link } from 'react-router-dom';
import FavoriteButton from '../FavoriteButton/FavoriteButton';
import { formatPrice } from '../../utils/formatters';
import './ProductCard.css';

const ProductCard = ({ product, onFavoriteToggle }) => {
  // Destructure product properties
  const { id, title, image, price, rating, ratingCount, description } = product;

  // Generate rating stars
  const renderRatingStars = (rating) => {
    // Asegurar que rating sea un número
    const numericRating = parseFloat(rating) || 0;
    
    return Array(5)
      .fill()
      .map((_, index) => {
        const isFilled = index < numericRating;
        return (
          <span key={index} className={`star ${isFilled ? 'filled' : ''}`}>
            ★
          </span>
        );
      });
  };

  return (
    <div className="product-card">
      <div className="product-image-container">
        <Link to={`/producto/${id}`}>
          <img 
            src={image} 
            alt={title} 
            className="product-image" 
            loading="lazy" 
          />
        </Link>
        
        {/* Favorite button */}
        <FavoriteButton 
          productId={id}
          productTitle={title}
          productImage={image}
          productPrice={price}
          onToggle={onFavoriteToggle}
          size="medium"
        />
      </div>
      
      <div className="product-info">
        <Link to={`/producto/${id}`} className="product-title-link">
          <h3 className="product-title">{title}</h3>
        </Link>
        
        {description && (
          <p className="product-description">{description}</p>
        )}

        <div className="product-price-container">
          <div className="product-rating">
            {renderRatingStars(rating)}
            {ratingCount > 0 && (
              <span className="product-rating-count">
                ({ratingCount})
              </span>
            )}
          </div>
          
          <div className="price-container">
            <div className="price-info">
              <span className="price-label">Desde:</span>
              <span className="price">{formatPrice(price)}</span>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default ProductCard; 