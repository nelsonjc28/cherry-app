import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../config/axios';
import './OffersModal.css';
import { getIconPath } from '../../utils/assetPaths';
import { formatPrice } from '../../utils/formatters';
import { getProductImageUrl } from '../../utils/productImageUtils';

const OffersModal = ({ isOpen, onClose }) => {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchOffers();
    }
  }, [isOpen]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Primero intentar obtener ofertas de catálogo
      const offersResponse = await api.get('/active-offers');
      console.log('🔍 [MODAL] Ofertas de catálogo:', offersResponse.data);
      
      if (offersResponse.data.success && offersResponse.data.offers && offersResponse.data.offers.length > 0) {
        // Si hay ofertas de catálogo, mostrarlas
        setOffers(offersResponse.data.offers);
        setProducts([]);
      } else {
        // Si no hay ofertas de catálogo, obtener productos con ofertas
        console.log('🔍 [MODAL] No hay ofertas de catálogo, obteniendo productos con ofertas...');
        const productsResponse = await api.get('/products/with-offers');
        console.log('🔍 [MODAL] Productos con ofertas:', productsResponse.data);
        
        if (productsResponse.data.success && productsResponse.data.data?.products && productsResponse.data.data.products.length > 0) {
          // Limitar a los primeros 12 productos para no sobrecargar el modal
          const limitedProducts = productsResponse.data.data.products.slice(0, 12);
          setProducts(limitedProducts);
          setOffers([]);
        } else {
          setProducts([]);
          setOffers([]);
        }
      }
    } catch (err) {
      console.error('Error al cargar ofertas:', err);
      setError('Error al cargar las ofertas');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDiscount = (offer) => {
    if (offer.isProductOffer) {
      return `${offer.productCount} Productos`;
    }
    if (offer.discount_category === 'free_shipping') {
      return 'Envío Gratis';
    }
    if (offer.discount_category === 'buy_x_get_y') {
      return `Compra ${offer.buy_quantity} y lleva ${offer.get_quantity} gratis`;
    }
    if (offer.discount_percentage) {
      return `${offer.discount_percentage}% OFF`;
    }
    return 'Oferta Especial';
  };

  const handleClose = () => {
    // Cerrar el modal sin guardar en sessionStorage (se mostrará siempre que haya ofertas)
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="offers-modal-overlay" onClick={handleClose}>
      <div className="offers-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="offers-modal-header">
          <h2 className="offers-modal-title">🎉 Ofertas Especiales</h2>
          <button className="offers-modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="offers-modal-body">
          {loading ? (
            <div className="offers-modal-loading">
              <div className="spinner"></div>
              <p>Cargando ofertas...</p>
            </div>
          ) : error ? (
            <div className="offers-modal-error">
              <p>{error}</p>
            </div>
          ) : offers.length === 0 && products.length === 0 ? (
            <div className="offers-modal-empty">
              <p>No hay ofertas disponibles en este momento</p>
            </div>
          ) : products.length > 0 ? (
            <div className="offers-products-grid">
              {products.map((product) => {
                const productImage = getProductImageUrl(product.id_articulo || product.id);
                const hasDiscount = product.discount > 0 || product.descPromo > 0;
                const discountPercentage = product.discount || product.descPromo || 0;
                const originalPrice = product.originalPrice || product.precio1 || product.price;
                const finalPrice = product.price || (originalPrice && discountPercentage > 0 
                  ? originalPrice - (originalPrice * discountPercentage / 100) 
                  : originalPrice);
                
                return (
                  <Link 
                    key={product.id_articulo || product.id} 
                    to={`/producto/${product.id_articulo || product.id}`}
                    className="offers-product-card"
                    onClick={handleClose}
                  >
                    <div className="offers-product-image-container">
                      <img 
                        src={productImage} 
                        alt={product.descripcion || product.title || 'Producto'}
                        className="offers-product-image"
                        onError={(e) => {
                          e.target.src = getIconPath('placeholder-product.svg');
                        }}
                      />
                      {hasDiscount && (
                        <span className="offers-product-badge">
                          {discountPercentage}% OFF
                        </span>
                      )}
                    </div>
                    <div className="offers-product-info">
                      <h3 className="offers-product-title">
                        {product.descripcion || product.title || 'Sin nombre'}
                      </h3>
                      <div className="offers-product-price-container">
                        {hasDiscount && originalPrice && (
                          <span className="offers-product-original-price">
                            {formatPrice(originalPrice)}
                          </span>
                        )}
                        <span className="offers-product-price">
                          {formatPrice(finalPrice)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="offers-list">
              {offers.map((offer) => (
                <div key={offer.id} className="offer-card">
                  {offer.banner_image && (
                    <div className="offer-banner">
                      <img 
                        src={offer.banner_image} 
                        alt={offer.title}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="offer-content">
                    <div className="offer-header">
                      <h3 className="offer-title">{offer.title}</h3>
                      <span className="offer-badge">{formatDiscount(offer)}</span>
                    </div>
                    {offer.description && (
                      <p className="offer-description">{offer.description}</p>
                    )}
                    {offer.offer_code && (
                      <div className="offer-code">
                        <strong>Código: </strong>
                        <code>{offer.offer_code}</code>
                      </div>
                    )}
                    {offer.min_purchase_amount && (
                      <p className="offer-condition">
                        Compra mínima: ${parseFloat(offer.min_purchase_amount).toFixed(2)}
                      </p>
                    )}
                    <div className="offer-dates">
                      <small>
                        Válido hasta: {formatDate(offer.end_date)}
                      </small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="offers-modal-footer">
          <button className="offers-modal-close-btn" onClick={handleClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default OffersModal;

