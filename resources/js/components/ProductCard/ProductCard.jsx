import { useState } from 'react';
import { Link } from 'react-router-dom';
import FavoriteButton from '../FavoriteButton/FavoriteButton';
import StarRating from '../StarRating/StarRating';
import { formatPrice } from '../../utils/formatters';
import { getIconPath } from '../../utils/assetPaths';
import colorConverter from '../../services/colorConverter';
import './ProductCard.css';

const ProductCard = ({ product, onFavoriteToggle, showFavoriteButton = true }) => {
  console.log('ProductCard: Received product:', product);
  
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
  
  console.log('ProductCard: Destructured values:', {
    id, title, image, price, rating, ratingCount, description, colors
  });
  
  console.log('ProductCard: Colors array:', colors, 'Length:', colors?.length);
  console.log('ProductCard: Will render colors?', colors && colors.length > 0);
  
  // TEMPORAL: Forzar colores de prueba si no hay colores
  const testColors = colors && colors.length > 0 ? colors : ['white', 'black', 'navy'];
  console.log('ProductCard: Using colors (test):', testColors);

  // State for selected color
  const [selectedColor, setSelectedColor] = useState(testColors[0] || null);

  // Get current image based on selected color or use default image
  const getCurrentImage = () => {
    return image || '';
  };

  // Función para obtener el color real del nombre
  const getRealColor = (colorName) => {
    return colorConverter.getColorHex(colorName);
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
      copyToClipboard(productUrl);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      if (window.showToast) {
        window.showToast('Enlace copiado al portapapeles', 'success');
      }
    } catch (err) {
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      if (window.showToast) {
        window.showToast('Enlace copiado al portapapeles', 'success');
      }
    }
  };

  return (
    <div className="product-card">
      {/* Product image container */}
      <div className="product-image-container">
        <Link to={`/producto/${id}`} className="product-link">
          <img 
            src={getCurrentImage()} 
            alt={title} 
            className="product-image" 
            loading="lazy" 
          />
        </Link>
        
        {/* Favorite button positioned in top right */}
        {showFavoriteButton && (
          <FavoriteButton 
            productId={id}
            productTitle={title}
            productImage={getCurrentImage()}
            productPrice={price}
            onToggle={handleFavoriteToggle}
            size="small"
            className="product-favorite-btn"
          />
        )}

        {/* New badge if product is new */}
        {isNew && (
          <span className="new-badge">Nuevo</span>
        )}
      </div>
      
      {/* Product information */}
      <div className="product-info">
        {/* Product ID */}
        <div className="product-id-icon">
          <div className="product-id">{id}</div>
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
        <Link to={`/producto/${id}`} className="product-title-link">
          <h3 className="product-title">{title}</h3>
        </Link>
        
        {/* Rating */}
        <div className="product-rating">
          <StarRating
            rating={rating}
            size="small"
            readonly={true}
            showAverage={false}
            averageRating={rating}
            totalRatings={ratingCount}
          />
          {ratingCount > 0 && (
            <span className="product-rating-count">
              ({ratingCount})
            </span>
          )}
        </div>
        
        {/* Price */}
        <div className="product-price">{formatPrice(price)}</div>
        
        {/* Color selector */}
        <div className="catalog-color-selector">
          {testColors.length > 0 ? (
            testColors.map((color, index) => {
              const realColor = getRealColor(color);
              const isLight = colorConverter.isLightColor(realColor);
              
              return (
                <button
                  key={index}
                  className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                  style={{ 
                    backgroundColor: realColor
                  }}
                  onClick={() => handleColorSelect(color)}
                  aria-label={`Seleccionar color ${color}`}
                  title={color}
                />
              );
            })
          ) : (
            <div className="color-option no-colors" title="Sin colores disponibles">
              <span>—</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard; 