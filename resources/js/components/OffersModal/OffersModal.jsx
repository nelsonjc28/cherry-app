import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../config/axios';
import './OffersModal.css';
import { getIconPath } from '../../utils/assetPaths';
import { formatPrice } from '../../utils/formatters';
import { getProductImageUrl } from '../../utils/productImageUtils';
import useUserStore from '../../store/userStore';

const OffersModal = ({ isOpen, onClose }) => {
  const { user } = useUserStore();
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchOffers();
    }
  }, [isOpen, user]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Si hay usuario logueado, usar endpoint de ofertas de usuario
      // Si no hay usuario, usar endpoint público
      const endpoint = user ? '/user-offers' : '/active-offers';
      const offersResponse = await api.get(endpoint);
      console.log('🔍 [MODAL] Ofertas:', offersResponse.data);
      
      if (offersResponse.data.success && offersResponse.data.offers && offersResponse.data.offers.length > 0) {
        // Filtrar ofertas que estén dentro del rango de fechas
        const now = new Date();
        const activeOffers = offersResponse.data.offers.filter(offer => {
          const startDate = new Date(offer.start_date);
          const endDate = new Date(offer.end_date);
          return now >= startDate && now <= endDate;
        });
        
        // Si hay ofertas de catálogo activas, mostrarlas
        if (activeOffers.length > 0) {
          setOffers(activeOffers);
          setProducts([]);
        } else {
          // Si no hay ofertas activas, buscar productos con ofertas
          const productsResponse = await api.get('/products/with-offers');
          if (productsResponse.data.success && productsResponse.data.data?.products && productsResponse.data.data.products.length > 0) {
            const limitedProducts = productsResponse.data.data.products.slice(0, 12);
            setProducts(limitedProducts);
            setOffers([]);
          } else {
            setProducts([]);
            setOffers([]);
          }
        }
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
          {/* Sin título predeterminado - solo se muestra imagen y texto personalizados */}
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
                  
                  // Verificar que la oferta esté dentro del rango de fechas
                  const now = new Date();
                  const startDate = new Date(offer.start_date);
                  const endDate = new Date(offer.end_date);
                  const isWithinDateRange = now >= startDate && now <= endDate;
                  
                  // Solo mostrar si está dentro del rango de fechas
                  if (!isWithinDateRange) {
                    return null;
                  }
                  
                  return (
                    <div key={offer.id} className="offer-card-shein">
                      {/* Mostrar imagen personalizada si existe */}
                      {offer.modal_image && (
                        <div className="offer-modal-image-container">
                          <img 
                            src={`/storage/${offer.modal_image}`} 
                            alt={offer.title || 'Oferta'}
                            className="offer-modal-image"
                          />
                        </div>
                      )}
                      
                      {/* Mostrar texto personalizado si existe */}
                      {offer.modal_text && (
                        <div className="offer-modal-text">
                          {offer.modal_text}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <button className="offers-get-all-btn" onClick={() => {
                window.location.href = '/ofertas-personalizadas';
              }}>
                ¡Consiguelos Todos!
              </button>
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

