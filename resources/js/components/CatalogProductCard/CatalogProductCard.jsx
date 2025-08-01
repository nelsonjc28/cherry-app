import { useState } from 'react';
import { Link } from 'react-router-dom';
import FavoriteButton from '../FavoriteButton/FavoriteButton';
import StarRating from '../StarRating/StarRating';
import { formatPrice } from '../../utils/formatters';
import './CatalogProductCard.css';
import { getIconPath } from '../../utils/assetPaths';

const CatalogProductCard = ({ product, onFavoriteToggle }) => {
  // Destructure product properties with proper fallbacks
  const { 
    id, 
    title, 
    image, 
    price, 
    originalPrice,
    discount,
    colors = [], 
    isNew = false, 
    rating = 0, 
    ratingCount = 0,
    description,
    brand,
    category,
    stock = 0
  } = product;
  
  // State for selected color
  const [selectedColor, setSelectedColor] = useState(colors[0] || null);

  // Get current image based on selected color or use default image
  const getCurrentImage = () => {
    return image || '';
  };

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

  // Handle color selection
  const handleColorSelect = (color) => {
    setSelectedColor(color);
  };

  // Handle favorite toggle
  const handleFavoriteToggle = () => {
    if (onFavoriteToggle) {
      onFavoriteToggle(id);
    }
  };

  // Handle share functionality
  const handleShare = () => {
    const productUrl = `${window.location.origin}/producto/${id}`;
    
    if (navigator.share) {
      // Use native sharing if available
      navigator.share({
        title: title,
        text: `Mira este producto: ${title}`,
        url: productUrl
      });
    } else {
      // Fallback to clipboard copy
      navigator.clipboard.writeText(productUrl).then(() => {
        // You could add a toast notification here
        alert('Enlace copiado al portapapeles');
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = productUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Enlace copiado al portapapeles');
      });
    }
  };

  return (
    <div className="catalog-product-card">
      {/* Product image container */}
      <div className="catalog-product-image-container">
        <Link to={`/producto/${id}`} className="catalog-product-link">
          <img 
            src={getCurrentImage()} 
            alt={title} 
            className="catalog-product-image" 
            loading="lazy" 
          />
        </Link>
        
        {/* Favorite button positioned in top right */}
        <FavoriteButton 
          productId={id}
          productTitle={title}
          productImage={getCurrentImage()}
          productPrice={price}
          onToggle={handleFavoriteToggle}
          size="small"
          className="catalog-favorite-btn"
        />

        {/* New badge if product is new */}
        {isNew && (
          <span className="new-badge">Nuevo</span>
        )}
      </div>
      
      {/* Product information */}
      <div className="catalog-product-info">
        {/* Product ID */}
        <div className="catalog-product-id-icon">
          <div className="catalog-product-id">{id}</div>
          <button 
            onClick={handleShare}
            className="share-button"
            aria-label="Compartir producto"
            title="Compartir producto"
          >
            <img src={getIconPath('Share Alt.svg')} alt="Compartir" />
          </button>
        </div>
        
        {/* Product title */}
        <Link to={`/producto/${id}`} className="catalog-product-title-link">
          <h3 className="catalog-product-title">{title}</h3>
        </Link>
        
        {/* Rating */}
        <div className="catalog-product-rating">
          <StarRating
            rating={rating}
            size="small"
            readonly={true}
            showAverage={false}
            averageRating={rating}
            totalRatings={ratingCount}
          />
          {ratingCount > 0 && (
            <span className="catalog-product-rating-count">
              ({ratingCount})
            </span>
          )}
        </div>
        
        {/* Price */}
        <div className="catalog-product-price">{formatPrice(price)}</div>
        
        {/* Color selector */}
        {colors.length > 0 && (
          <div className="catalog-color-selector">
            {colors.map((color, index) => (
              <button
                key={index}
                className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                style={{ backgroundColor: colorMap[color] || color }}
                onClick={() => handleColorSelect(color)}
                aria-label={`Seleccionar color ${color}`}
                title={color}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogProductCard; 