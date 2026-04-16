import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import FavoriteButton from '../FavoriteButton/FavoriteButton';
import StarRating from '../StarRating/StarRating';
import { formatPrice } from '../../utils/formatters';
import { getProductCardStockStatus } from '../../utils/productUtils';
import './CatalogProductCard.css';
import { getIconPath } from '../../utils/assetPaths';
import colorConverter from '../../services/colorConverter';

const CatalogProductCard = ({ product, onFavoriteToggle }) => {
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
    inventario = 0,
    stock_received_count = 0,
    stockReceivedCount = 0,
    fecha_alta = null,
    fechaAlta = null,
    userOffer, // Información del descuento del usuario (puede venir como prop)
    hasUserOffer = false // Flag que indica si tiene descuento del usuario (puede venir como prop)
  } = product;
  



  
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

  // Función para calcular el stock total del producto
  const calculateTotalStock = () => {
    // Si hay detalles en el producto, sumar todo el inventario de los detalles
    const detalles = product?.detalles || [];
    if (detalles.length > 0) {
      const totalFromDetails = detalles.reduce((total, detalle) => {
        return total + (parseFloat(detalle.inventario_d) || 0);
      }, 0);
      // Si la suma de detalles es > 0, usar ese valor
      if (totalFromDetails > 0) {
        return totalFromDetails;
      }
    }
    
    // Si no hay detalles o la suma es 0, usar el inventario general del producto
    return parseFloat(stock || inventario || 0);
  };

  const getStockStatus = () =>
    getProductCardStockStatus({
      ...product,
      id: id ?? product?.id,
      stock,
      inventario,
      stock_received_count,
      stockReceivedCount
    });

  const stockStatus = getStockStatus();

  // Calculate discount percentage - Priorizar oferta personalizada
  const calculateDiscountPercentage = () => {
    // PRIORIDAD 1: Oferta personalizada del usuario (solo si tiene porcentaje)
    if (hasUserOffer && userOffer && userOffer.discount_percentage > 0) {
      return Math.round(userOffer.discount_percentage);
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
  const hasOffer = discountPercentage > 0 || (hasUserOffer && userOffer && (userOffer.discount_category === 'buy_x_get_y' || userOffer.discount_category === 'order_discount'));
  
  // Determinar el tipo de descuento para mostrar etiqueta apropiada
  const getDiscountLabel = () => {
    // PRIORIDAD 1: Si hay oferta personalizada del usuario, mostrar su etiqueta específica
    if (hasUserOffer && userOffer) {
      // Para ofertas Buy X Get Y
      if (userOffer.discount_category === 'buy_x_get_y') {
        return `🎁 Compra ${userOffer.buy_quantity} por el precio de ${userOffer.buy_quantity - userOffer.get_quantity}`;
      }
      // Para ofertas de descuento en el pedido
      if (userOffer.discount_category === 'order_discount') {
        return `💰 Descuento en pedido ${Math.round(userOffer.discount_percentage)}%`;
      }
      // No mostrar badge para envío gratis
      // Para otras ofertas personalizadas, mostrar el porcentaje de descuento
      if (userOffer.discount_percentage && userOffer.discount_percentage > 0) {
        return `${!isMobile ? "Rebaja " : ""}${Math.round(userOffer.discount_percentage)}%`;
      }
    }
    
    // PRIORIDAD 2: Descuento general - mostrar "Rebaja X%"
    return `${!isMobile ? "Rebaja " : ""}${discountPercentage}%`;
  };

  // Handle share functionality
  const handleShare = async () => {
    // Importar función de compartir con imágenes
    const { shareProductWithImages } = await import('../../utils/shareProductUtils');
    
    // Compartir producto con todas sus imágenes
    await shareProductWithImages({
      id,
      title,
      price,
      image
    });
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

        {/* Próximamente badge - misma posición que Nuevo (sobre la imagen) */}
        {stockStatus === 'coming-soon' && (
          <span className="catalog-offer-badge catalog-out-of-stock-badge catalog-coming-soon-badge" style={{ backgroundColor: 'rgb(255, 152, 0)', color: 'rgb(255, 255, 255)' }}>Próximamente</span>
        )}

        {/* New badge - no mostrar si el producto es "Próximamente" */}
        {isNew && stockStatus !== 'coming-soon' && (
          <span className="catalog-offer-badge catalog-new-badge">Nuevo</span>
        )}

        {/* Out of stock badge - solo si no es nuevo y no es "Próximamente" */}
        {!isNew && stockStatus === 'out-of-stock' && (
          <span className="catalog-offer-badge catalog-out-of-stock-badge">Agotado</span>
        )}

        {/* Offer badge if product has discount (and is not new, not coming soon, and has stock) */}
        {!isNew && stockStatus !== 'coming-soon' && stock > 0 && hasOffer && (
          <div className={`catalog-offer-badge ${hasUserOffer ? 'user-offer' : ''} ${
            hasUserOffer && userOffer && userOffer.discount_category === 'buy_x_get_y' ? 'buy-x-get-y' : 
            hasUserOffer && userOffer && userOffer.discount_category === 'order_discount' ? 'order-discount' : 
            hasUserOffer && userOffer && userOffer.discount_category === 'free_shipping' ? 'free-shipping' : ''
          }`}>
            {getDiscountLabel()}
          </div>
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
            style={{ display: 'none' }}
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
        </div>
        
        {/* Price */}
        <div className="catalog-product-price-container">
          {hasOffer && originalPrice && (
            <div className="catalog-original-price">{formatPrice(originalPrice)}</div>
          )}
          <div className="catalog-product-price">{formatPrice(price)}</div>
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

export default CatalogProductCard; 
