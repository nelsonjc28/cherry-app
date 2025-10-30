import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import FavoriteButton from '../FavoriteButton/FavoriteButton';
import StarRating from '../StarRating/StarRating';
import { formatPrice } from '../../utils/formatters';
import { getIconPath } from '../../utils/assetPaths';
import colorConverter from '../../services/colorConverter';
import { useUserDiscounts } from '../../hooks/useUserDiscounts';
import './ProductCard.css';

const ProductCard = ({ product, onFavoriteToggle, showFavoriteButton = true, variant = 'default' }) => {
  // Hook para detectar si es móvil
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
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
    stock = 0,
    userOffer, // Información del descuento del usuario (puede venir como prop)
    hasUserOffer = false // Flag que indica si tiene descuento del usuario (puede venir como prop)
  } = product;
  
  // Hook para obtener descuentos personalizados del usuario (solo si no vienen como props)
  const { userDiscounts } = useUserDiscounts(hasUserOffer ? [] : [id]);
  
  // Usar la información que viene como props o la del hook
  const finalUserOffer = userOffer || userDiscounts[id];
  const finalHasUserOffer = hasUserOffer || Boolean(userDiscounts[id]);
  
  
  // TEMPORAL: Forzar colores de prueba si no hay colores
  const testColors = colors && colors.length > 0 ? colors : ['white', 'black', 'navy'];


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

  // Calculate discount percentage - Priorizar oferta personalizada
  const calculateDiscountPercentage = () => {
    // PRIORIDAD 1: Oferta personalizada del usuario
    if (finalHasUserOffer && finalUserOffer && finalUserOffer.discount_percentage > 0) {
      return Math.round(finalUserOffer.discount_percentage);
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
  
  
  // Determinar si hay oferta (incluyendo ofertas especiales que no tienen porcentaje)
  const hasOffer = discountPercentage > 0 || (finalHasUserOffer && finalUserOffer && (finalUserOffer.discount_category === 'buy_x_get_y' || finalUserOffer.discount_category === 'order_discount' || finalUserOffer.discount_category === 'free_shipping'));
  
  // Determinar el tipo de descuento para mostrar etiqueta apropiada
  const getDiscountLabel = () => {
    // PRIORIDAD 1: Si hay oferta personalizada del usuario, mostrar su etiqueta específica
    if (finalHasUserOffer && finalUserOffer) {
      // Para ofertas Buy X Get Y
      if (finalUserOffer.discount_category === 'buy_x_get_y') {
        return `🎁 Compra ${finalUserOffer.buy_quantity} por el precio de ${finalUserOffer.buy_quantity - finalUserOffer.get_quantity}`;
      }
      // Para ofertas de descuento en el pedido
      if (finalUserOffer.discount_category === 'order_discount') {
        return `💰 Descuento en pedido ${Math.round(finalUserOffer.discount_percentage)}%`;
      }
      // Para ofertas de envío gratis
      if (finalUserOffer.discount_category === 'free_shipping') {
        return `🚚 Envío gratis`;
      }
      // Para otras ofertas personalizadas, mostrar el porcentaje de descuento
      if (finalUserOffer.discount_percentage && finalUserOffer.discount_percentage > 0) {
        return (
          <>
            {!isMobile && "Rebaja "}{Math.round(finalUserOffer.discount_percentage)}%
          </>
        );
      }
    }
    
    // PRIORIDAD 2: Descuento general - mostrar "Rebaja X%"
    return (
      <>
        {!isMobile && "Rebaja "}{discountPercentage}%
      </>
    );
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

  // Render bestseller variant
  if (variant === 'bestseller') {
    const handleCardClick = (e) => {
      // No navegar si se hace clic en el botón de favoritos
      if (e.target.closest('.favorite-button')) {
        return;
      }
      // Navegar al detalle del producto
      window.location.href = `/producto/${id}`;
    };

    return (
      <div className="product-card product-card--bestseller">
        {/* Product Image Container */}
        <div className="product-image-container product-image-container--bestseller" onClick={handleCardClick}>
          <img
            src={getCurrentImage()}
            alt={title}
            className="catalog-product-image"
            loading="lazy"
          />

          {/* Offer badge if product has discount */}
          {hasOffer && (
            <span className="offer-badge">
              {getDiscountLabel()}
            </span>
          )}
        </div>

        {/* Product Info */}
        <div className="product-info product-info--bestseller">
          {/* Title */}
          <h3 className="product-title product-title--bestseller">{title}</h3>

          {/* Description */}
          {description && (
            <p className="product-description">{description}</p>
          )}

          {/* Rating and Price Row */}
          <div className="product-rating product-rating--bestseller">
            <StarRating 
              rating={rating || 0} 
              totalRatings={ratingCount || 0}
              readonly={true} 
            />

            {/* Price */}
            <div className="product-price-bestseller">
              <span className="price-label">Desde:</span>
              <div className="product-price-container--bestseller">
                <span className="price-value">${(price && typeof price === 'number') ? price.toFixed(2) : '0.00'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render default variant
  return (
    <div className="product-card">
      {/* Product image container */}
      <div className="product-image-container">
        <Link to={`/producto/${id}`} className="product-link">
          <img 
            src={getCurrentImage()} 
            alt={title} 
            className="catalog-product-image" 
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

        {/* Offer badge if product has discount */}
        {hasOffer && (
          <span className={`offer-badge ${finalHasUserOffer ? 'user-offer' : ''} ${
            finalHasUserOffer && finalUserOffer && finalUserOffer.discount_category === 'buy_x_get_y' ? 'buy-x-get-y' : 
            finalHasUserOffer && finalUserOffer && finalUserOffer.discount_category === 'order_discount' ? 'order-discount' : 
            finalHasUserOffer && finalUserOffer && finalUserOffer.discount_category === 'free_shipping' ? 'free-shipping' : ''
          }`}>
            {getDiscountLabel()}
          </span>
        )}


        {/* New badge if product is new */}
        {isNew && !hasOffer && (
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
        <div className="product-price-container">
          {hasOffer && originalPrice && (
            <div className="original-price">{formatPrice(originalPrice)}</div>
          )}
          <div className="product-price">{formatPrice(price)}</div>
        </div>
        
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
