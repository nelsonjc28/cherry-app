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
    inventario = 0,
    stock_received_count = 0,
    stockReceivedCount = 0,
    fecha_alta = null,
    fechaAlta = null,
    userOffer, // Información del descuento del usuario (puede venir como prop)
    hasUserOffer = false // Flag que indica si tiene descuento del usuario (puede venir como prop)
  } = product;
  
  // Hook para obtener descuentos personalizados del usuario (solo si no vienen como props)
  // Si el producto ya tiene userOffer o hasUserOffer como prop, NO hacer llamadas adicionales
  const { userDiscounts } = useUserDiscounts((hasUserOffer || userOffer) ? [] : [id]);
  
  // Usar la información que viene como props o la del hook
  const finalUserOffer = userOffer || userDiscounts[id];
  const finalHasUserOffer = hasUserOffer || Boolean(userOffer) || Boolean(userDiscounts[id]);
  
  
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
    // Si hay detalles, sumar todo el inventario de los detalles
    if (product?.detalles && product.detalles.length > 0) {
      const totalFromDetails = product.detalles.reduce((total, detalle) => {
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

  // Función para determinar si debe mostrar "Próximamente" o "Agotado"
  // REGLA DE NEGOCIO GLOBAL: Lógica de Etiquetas de Disponibilidad
  // - "Próximamente": Si el tercer dígito del ID (índice 2) coincide con el último dígito del año actual
  //   Y stock === 0 Y stock_received_count === 0
  // - "Agotado": Si stock === 0 Y (el tercer dígito del ID NO coincide con el último dígito del año actual O stock_received_count > 0)
  const getStockStatus = () => {
    const totalStock = calculateTotalStock();
    
    // Obtener stock_received_count del producto directamente del objeto product
    // Intentar múltiples fuentes para asegurar que obtenemos el valor correcto
    const stockReceivedCountValue = parseInt(
      product?.stock_received_count || 
      product?.stockReceivedCount || 
      stock_received_count || 
      stockReceivedCount || 
      0, 
      10
    );
    
    // Debug temporal para producto específico
    if (id === '14612611701' || String(id) === '14612611701') {
      const totalFromDetails = product?.detalles && product.detalles.length > 0
        ? product.detalles.reduce((total, detalle) => {
            return total + (parseFloat(detalle.inventario_d) || 0);
          }, 0)
        : 0;
      console.log('[ProductCard] Debug producto 14612611701:', {
        id,
        totalStock,
        stockReceivedCountValue,
        'product.stock_received_count': product?.stock_received_count,
        'product.stockReceivedCount': product?.stockReceivedCount,
        stock_received_count,
        stockReceivedCount,
        'stock (destructured)': stock,
        'inventario (destructured)': inventario,
        'product.stock': product?.stock,
        'product.inventario': product?.inventario,
        'totalFromDetails': totalFromDetails,
        'product.detalles': product?.detalles,
        'willShowComingSoon': stockReceivedCountValue === 0 && totalStock === 0,
        'willShowOutOfStock': stockReceivedCountValue > 0 && totalStock === 0
      });
    }
    
    // REGLA CRÍTICA: Si stock_received_count > 0 y stock === 0, SIEMPRE mostrar "Agotado"
    // independientemente del tercer dígito del ID
    if (stockReceivedCountValue > 0 && totalStock === 0) {
      return 'out-of-stock';
    }
    
    // Si tiene stock, no mostrar badge de stock
    if (totalStock > 0) {
      return null;
    }
    
    // Obtener el ID del producto como string y calcular el último dígito del año actual
    const productId = String(id || '');
    const tercerDigito = productId.length > 2 ? productId[2] : null;
    const currentYearLastDigit = String(new Date().getFullYear() % 10);
    const isComingSoon = tercerDigito === currentYearLastDigit;
    
    // PRIORIDAD 1: Si el tercer dígito del ID coincide con el último dígito del año actual
    // Y stock === 0 Y stock_received_count === 0, mostrar "Próximamente"
    if (isComingSoon && totalStock === 0 && stockReceivedCountValue === 0) {
      return 'coming-soon';
    }
    
    // PRIORIDAD 2: Si stock === 0 Y (el tercer dígito NO coincide con el último dígito del año actual O stock_received_count > 0), mostrar "Agotado"
    if (totalStock === 0 && (!isComingSoon || stockReceivedCountValue > 0)) {
      return 'out-of-stock';
    }
    
    // Fallback: Sin stock disponible - mostrar "Agotado"
    return 'out-of-stock';
  };

  const stockStatus = getStockStatus();

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
  const hasOffer = discountPercentage > 0 || (finalHasUserOffer && finalUserOffer && (finalUserOffer.discount_category === 'buy_x_get_y' || finalUserOffer.discount_category === 'order_discount'));
  
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
      // No mostrar badge para envío gratis
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
      <div className="product-card product-card--bestseller product-card--flex">
        {/* Product Image Container */}
        <div className="product-image-container product-image-container--bestseller" onClick={handleCardClick}>
          <img
            src={getCurrentImage()}
            alt={title}
            className="catalog-product-image"
            loading="lazy"
          />

        {/* Próximamente badge - misma posición que Nuevo (sobre la imagen) */}
        {stockStatus === 'coming-soon' && (
          <span className="catalog-offer-badge catalog-out-of-stock-badge catalog-coming-soon-badge" style={{ backgroundColor: 'rgb(255, 152, 0)', color: 'rgb(255, 255, 255)' }}>Próximamente</span>
        )}

        {/* Nuevo: no mostrar si el producto es "Próximamente" */}
        {isNew && stockStatus !== 'coming-soon' && (
          <span className="new-badge">Nuevo</span>
        )}

        {/* Out of stock badge - solo si no es nuevo y no es "Próximamente" */}
        {!isNew && stockStatus === 'out-of-stock' && (
          <span className="out-of-stock-badge">Agotado</span>
        )}

        {/* Offer badge if product has discount (and is not new, not coming soon, and has stock) */}
        {!isNew && stockStatus !== 'coming-soon' && calculateTotalStock() > 0 && hasOffer && (
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
              rating={parseFloat(rating) || 0} 
              totalRatings={parseInt(ratingCount) || 0}
              readonly={true}
              readOnly={true}
            />

            {/* Price: misma fila solo si hay rebaja; si no, precio normal sin desplazar */}
            {hasOffer && originalPrice && Number(originalPrice) > 0 && Number(originalPrice) > Number(price) ? (
              <div className="product-price-bestseller product-price-bestseller--with-offer">
                <span className="price-label">Desde:</span>
                <span className="price-value price-value--offer">${(price != null && typeof price === 'number') ? price.toFixed(2) : '0.00'}</span>
                <span className="original-price original-price--bestseller">${(originalPrice != null && typeof originalPrice === 'number') ? originalPrice.toFixed(2) : '0.00'}</span>
              </div>
            ) : (
              <div className="product-price-bestseller">
                <span className="price-label">Desde:</span>
                <div className="product-price-container--bestseller">
                  <span className="price-value">${(price && typeof price === 'number') ? price.toFixed(2) : '0.00'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render default variant
  return (
    <div className="product-card product-card--flex">
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

        {/* Próximamente badge - misma posición que Nuevo (sobre la imagen) */}
        {stockStatus === 'coming-soon' && (
          <span className="catalog-offer-badge catalog-out-of-stock-badge catalog-coming-soon-badge" style={{ backgroundColor: 'rgb(255, 152, 0)', color: 'rgb(255, 255, 255)' }}>Próximamente</span>
        )}

        {/* Nuevo: no mostrar si el producto es "Próximamente" */}
        {isNew && stockStatus !== 'coming-soon' && (
          <span className="new-badge">Nuevo</span>
        )}

        {/* Out of stock badge - solo si no es nuevo y no es "Próximamente" */}
        {!isNew && stockStatus === 'out-of-stock' && (
          <span className="out-of-stock-badge">Agotado</span>
        )}

        {/* Offer badge if product has discount (and is not new, not coming soon, and has stock) */}
        {!isNew && stockStatus !== 'coming-soon' && calculateTotalStock() > 0 && hasOffer && (
          <span className={`offer-badge ${finalHasUserOffer ? 'user-offer' : ''} ${
            finalHasUserOffer && finalUserOffer && finalUserOffer.discount_category === 'buy_x_get_y' ? 'buy-x-get-y' : 
            finalHasUserOffer && finalUserOffer && finalUserOffer.discount_category === 'order_discount' ? 'order-discount' : 
            finalHasUserOffer && finalUserOffer && finalUserOffer.discount_category === 'free_shipping' ? 'free-shipping' : ''
          }`}>
            {getDiscountLabel()}
          </span>
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
            style={{ display: 'none' }}
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
            rating={parseFloat(rating) || 0}
            size="small"
            readonly={true}
            readOnly={true}
            showAverage={false}
            averageRating={parseFloat(rating) || 0}
            totalRatings={parseInt(ratingCount) || 0}
          />
        </div>
        
        {/* Price: misma fila solo si hay rebaja; si no, precio normal sin desplazar */}
        {hasOffer && originalPrice && Number(originalPrice) > 0 && Number(originalPrice) > Number(price) ? (
          <div className="product-price-container product-price-container--with-offer">
            <span className="product-price product-price--offer">{formatPrice(price)}</span>
            <span className="original-price">{formatPrice(originalPrice)}</span>
          </div>
        ) : (
          <div className="product-price-container">
            <div className="product-price">{formatPrice(price)}</div>
          </div>
        )}
        
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
