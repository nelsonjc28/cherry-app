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
        <button className="offers-modal-close" onClick={handleClose}>
          ×
        </button>
        
        <div className="offers-modal-header">
          <div className="offers-modal-ribbon">
            <span className="offers-modal-star">✨</span>
            <span className="offers-modal-star">✨</span>
            <span className="offers-modal-star">✨</span>
          </div>
          <h2 className="offers-modal-title">Ofertas especiales solo para ti</h2>
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
          ) : offers.length > 0 ? (
            <>
              <div className="offers-grid-shein">
                {offers.map((offer) => {
                  const discountPercentage = offer.discount_percentage || 0;
                  const minPurchase = offer.min_purchase_amount ? parseFloat(offer.min_purchase_amount) : null;
                  const maxDiscount = offer.max_discount_amount ? parseFloat(offer.max_discount_amount) : null;
                  
                  return (
                    <div key={offer.id} className="offer-card-shein">
                      <div className="offer-card-left">
                        <div className="offer-discount-large">
                          {discountPercentage}% DE DESCUENTO
                        </div>
                        {minPurchase && (
                          <div className="offer-condition-large">
                            Pedidos de +${minPurchase.toFixed(0)}
                          </div>
                        )}
                      </div>
                      <div className="offer-card-right">
                        <div className="offer-detail-item">
                          Cupón válido en todo el sitio
                        </div>
                        {maxDiscount && (
                          <div className="offer-detail-item">
                            Límite de ${maxDiscount.toFixed(0)}
                          </div>
                        )}
                        <div className="offer-detail-item offer-time-limited">
                          Por tiempo limitado
                          <span className="offer-dropdown-arrow">▼</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <button className="offers-get-all-btn" onClick={handleClose}>
                ¡Consiguelos Todos!
              </button>
              
              <p className="offers-confirmation-text">
                Cupones confirmados después de iniciar sesión
              </p>
            </>
          ) : (
            <div className="offers-modal-empty">
              <p>No hay ofertas disponibles en este momento</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OffersModal;

