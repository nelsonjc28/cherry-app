import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import FavoriteButton from '../../FavoriteButton/FavoriteButton';
import StarRating from '../../StarRating/StarRating';
import { formatPrice } from '../../../utils/formatters';
import { getProductCardStockStatus, getTotalInventoryFromProduct } from '../../../utils/productUtils';
import { hasCatalogOfferBadge, getCatalogOfferBadgeLabel } from '../../../utils/catalogOfferUtils';
import './BestSellerCard.css';

const BestSellerCard = ({ id, title, image, price, originalPrice, discount, userOffer, hasUserOffer, rating, totalRatings, description, stock = 0, isNew = false, onFavoriteToggle, product, stock_received_count = 0, stockReceivedCount = 0 }) => {
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
  const hasOffer = hasCatalogOfferBadge({ discountPercentage, hasUserOffer, userOffer });

  const cardProduct = {
    ...product,
    id: product?.id ?? id,
    id_articulo: String(product?.id_articulo ?? id),
    stock: product?.stock ?? stock,
    inventario: product?.inventario ?? product?.stock ?? stock,
    stock_received_count: product?.stock_received_count ?? stock_received_count ?? stockReceivedCount,
    desc_promo: product?.desc_promo,
    detalles: product?.detalles,
  };
  const stockStatus = getProductCardStockStatus(cardProduct);
  const totalInv = getTotalInventoryFromProduct(cardProduct);

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

        {/* Próximamente: misma regla que ficha / ProductCard */}
        {stockStatus === 'coming-soon' && (
          <span className="catalog-offer-badge catalog-out-of-stock-badge catalog-coming-soon-badge" style={{ backgroundColor: 'rgb(255, 152, 0)', color: 'rgb(255, 255, 255)' }}>Próximamente</span>
        )}

        {/* Nuevo: no mostrar si hay oferta ni si es "Próximamente" */}
        {isNew && !hasOffer && stockStatus !== 'coming-soon' && (
          <span className="catalog-offer-badge catalog-new-badge">Nuevo</span>
        )}

        {/* Out of stock badge - solo si no hay oferta y NO es "Próximamente" */}
        {!isNew && !hasOffer && stockStatus === 'out-of-stock' && (
          <span className="best-seller-out-of-stock-badge">Agotado</span>
        )}

        {/* Offer badge if product has discount */}
        {stockStatus !== 'coming-soon' && hasOffer && (
          <span className="best-seller-offer-badge">
            {hasUserOffer && userOffer
              ? getCatalogOfferBadgeLabel(userOffer, { discountPercentage, isMobile })
              : `${!isMobile && 'Rebaja '}${discountPercentage}%`}
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
