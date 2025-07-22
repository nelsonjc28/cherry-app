import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import CherryButton from '../components/CherryButton/CherryButton';
import { getIconPath } from '../utils/assetPaths';
import { getAllProducts, mapApiProductToAppProduct } from '../api/cherryApi';
import './DestacadosOfertasPage.css';

const DestacadosOfertasPage = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState('all');

  const offerTypes = [
    { id: 'all', name: 'Todas las ofertas', description: 'Ver todas las ofertas disponibles' },
    { id: 'flash', name: 'Ofertas Flash', description: 'Ofertas por tiempo limitado' },
    { id: 'clearance', name: 'Liquidación', description: 'Hasta 70% de descuento' },
    { id: 'bundle', name: 'Paquetes', description: 'Combo de productos con descuento' }
  ];

  useEffect(() => {
    const loadOffers = async () => {
      setLoading(true);
      try {
        const allProducts = await getAllProducts();
        const mappedProducts = allProducts.map(mapApiProductToAppProduct);
        
        // Filtrar productos con ofertas
        const productsWithOffers = mappedProducts.filter(product => 
          product.discount && product.discount > 0
        );
        
        setOffers(productsWithOffers);
      } catch (error) {

        setOffers([]);
      } finally {
        setLoading(false);
      }
    };

    loadOffers();
  }, []);

  const getFilteredOffers = () => {
    if (selectedOffer === 'all') {
      return offers;
    }

    return offers.filter(product => {
      const discount = product.discount || 0;
      
      switch (selectedOffer) {
        case 'flash':
          return discount >= 20 && discount <= 40;
        case 'clearance':
          return discount >= 50;
        case 'bundle':
          return product.isPromo || discount >= 30;
        default:
          return true;
      }
    });
  };

  const handleOfferClick = (offerId) => {
    setSelectedOffer(offerId);
  };

  const handleFavoriteToggle = (productId) => {
    };

  const filteredOffers = getFilteredOffers();

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Ofertas Destacadas - Cherry Central</title>
        </Helmet>
        
        <main className="destacados-ofertas-page">
          <div className="container">
            <div className="ofertas-loading">
              <div className="loading-spinner"></div>
              <p>Cargando ofertas destacadas...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Ofertas Destacadas - Cherry Central</title>
        <meta name="description" content="Descubre las mejores ofertas y descuentos en Cherry Central. Ofertas flash, liquidaciones y paquetes especiales." />
      </Helmet>

      <main className="destacados-ofertas-page">
        <div className="container">
          {/* Header */}
          <div className="ofertas-header">
            <h1>Ofertas Destacadas</h1>
            <p>Las mejores ofertas y descuentos especiales</p>
          </div>

          {/* Banner principal */}
          <div className="ofertas-banner">
            <div className="banner-content">
              <h2>¡Ofertas Imperdibles!</h2>
              <p>Descuentos especiales en productos seleccionados</p>
              <div className="banner-stats">
                <div className="stat-item">
                  <span className="stat-number">{offers.length}</span>
                  <span className="stat-label">Productos en oferta</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">Hasta 70%</span>
                  <span className="stat-label">De descuento</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">24h</span>
                  <span className="stat-label">Ofertas flash</span>
                </div>
              </div>
            </div>
            <div className="banner-image">
              <img src={getIconPath('Bullhorn.svg')} alt="Ofertas destacadas" />
            </div>
          </div>

          {/* Tipos de ofertas */}
          <div className="ofertas-tipos">
            <div className="tipos-grid">
              {offerTypes.map((offer) => (
                <button
                  key={offer.id}
                  className={`tipo-btn ${selectedOffer === offer.id ? 'active' : ''}`}
                  onClick={() => handleOfferClick(offer.id)}
                >
                  <div className="tipo-content">
                    <h3>{offer.name}</h3>
                    <p>{offer.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Productos en oferta */}
          <div className="ofertas-content">
            <div className="ofertas-header-section">
              <h2>
                {offerTypes.find(o => o.id === selectedOffer)?.name}
              </h2>
              <p>{filteredOffers.length} productos en oferta</p>
            </div>

            {filteredOffers.length === 0 ? (
              <div className="ofertas-empty">
                <div className="empty-icon">
                  <img src={getIconPath('Bullhorn.svg')} alt="Sin ofertas" />
                </div>
                <h3>No hay ofertas disponibles</h3>
                <p>
                  {selectedOffer === 'all' 
                    ? 'No hay ofertas activas en este momento'
                    : `No hay productos en "${offerTypes.find(o => o.id === selectedOffer)?.name}"`
                  }
                </p>
                <Link to="/catalogo">
                  <CherryButton variant="outline" size="medium">
                    Ver catálogo completo
                  </CherryButton>
                </Link>
              </div>
            ) : (
              <div className="ofertas-products-grid">
                {filteredOffers.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Información adicional */}
          <div className="ofertas-info">
            <div className="info-section">
              <h3>¿Cómo funcionan nuestras ofertas?</h3>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Bell.svg')} alt="Notificaciones" />
                  </div>
                  <h4>Ofertas Flash</h4>
                  <p>Descuentos por tiempo limitado, actúa rápido</p>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Award.svg')} alt="Liquidación" />
                  </div>
                  <h4>Liquidación</h4>
                  <p>Descuentos profundos en productos seleccionados</p>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Shopping Cart.svg')} alt="Paquetes" />
                  </div>
                  <h4>Paquetes</h4>
                  <p>Combos de productos con descuento especial</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="ofertas-cta">
            <div className="cta-content">
              <h2>¿No quieres perderte ninguna oferta?</h2>
              <p>Suscríbete para recibir notificaciones de ofertas especiales</p>
              <div className="cta-actions">
                <CherryButton variant="red" size="large">
                  Suscribirse
                </CherryButton>
                <Link to="/promociones">
                  <CherryButton variant="outline" size="large">
                    Ver todas las promociones
                  </CherryButton>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default DestacadosOfertasPage; 