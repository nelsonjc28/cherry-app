import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import CherryButton from '../components/CherryButton/CherryButton';
import { getIconPath } from '../utils/assetPaths';
import { getProductsWithRatings, mapApiProductToAppProduct } from '../api/cherryApi';
import './PromocionesPage.css';

const PromocionesPage = () => {
  const [promotionalProducts, setPromotionalProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePromo, setActivePromo] = useState('all');

  const promociones = [
    {
      id: 'all',
      name: 'Todas las promociones',
      description: 'Ver todas las ofertas disponibles',
      discount: null
    },
    {
      id: 'summer',
      name: 'Colección de Verano',
      description: 'Hasta 40% de descuento',
      discount: 40
    },
    {
      id: 'new',
      name: 'Productos Nuevos',
      description: '20% de descuento en novedades',
      discount: 20
    },
    {
      id: 'clearance',
      name: 'Liquidación',
      description: 'Hasta 60% de descuento',
      discount: 60
    }
  ];

  useEffect(() => {
    const loadPromotionalProducts = async () => {
      setLoading(true);
      try {
        const allProducts = await getProductsWithRatings();
        const mappedProducts = allProducts.map(mapApiProductToAppProduct);
        
        // Filtrar productos promocionales
        const promotional = mappedProducts.filter(product => 
          product.discount && product.discount > 0
        );
        
        setPromotionalProducts(promotional);
      } catch (error) {

        setPromotionalProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadPromotionalProducts();
  }, []);

  const getFilteredProducts = () => {
    if (activePromo === 'all') {
      return promotionalProducts;
    }

    // Filtrar por tipo de promoción
    return promotionalProducts.filter(product => {
      const discount = product.discount || 0;
      
      switch (activePromo) {
        case 'summer':
          return discount >= 30 && discount <= 50;
        case 'new':
          return discount >= 15 && discount <= 25;
        case 'clearance':
          return discount >= 50;
        default:
          return true;
      }
    });
  };

  const handlePromoClick = (promoId) => {
    setActivePromo(promoId);
  };

  const handleFavoriteToggle = (productId) => {
    };

  const filteredProducts = getFilteredProducts();

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Promociones - Cherry Central</title>
        </Helmet>
        
        <main className="promociones-page">
          <div className="container">
            <div className="promociones-loading">
              <div className="loading-spinner"></div>
              <p>Cargando promociones...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Promociones - Cherry Central</title>
        <meta name="description" content="Descubre las mejores promociones y ofertas en Cherry Central. Descuentos especiales en moda femenina." />
      </Helmet>

      <main className="promociones-page">
        <div className="container">
          {/* Header */}
          <div className="promociones-header">
            <h1>Promociones y Ofertas</h1>
            <p>Descubre las mejores ofertas en moda femenina</p>
          </div>


          {/* Productos promocionales */}
          <div className="promociones-content">
            <div className="promociones-header-section">
              <h2>
                {activePromo === 'all' 
                  ? 'Todas las promociones'
                  : promociones.find(p => p.id === activePromo)?.name
                }
              </h2>
              <p>{filteredProducts.length} productos en oferta</p>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="promociones-empty">
                <div className="empty-icon">
                  <img src={getIconPath('Bullhorn.svg')} alt="Sin promociones" />
                </div>
                <h3>No hay promociones disponibles</h3>
                <p>
                  {activePromo === 'all' 
                    ? 'No hay promociones activas en este momento'
                    : `No hay productos en la promoción "${promociones.find(p => p.id === activePromo)?.name}"`
                  }
                </p>
                <CherryButton 
                  variant="outline" 
                  size="medium"
                  onClick={() => setActivePromo('all')}
                >
                  Ver todas las promociones
                </CherryButton>
              </div>
            ) : (
              <div className="promociones-products-grid">
                {filteredProducts.map((product) => (
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
          <div className="promociones-info">
            <div className="info-section">
              <h3>¿Cómo funcionan nuestras promociones?</h3>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Bell.svg')} alt="Notificaciones" />
                  </div>
                  <h4>Recibe notificaciones</h4>
                  <p>Te avisamos cuando hay nuevas promociones disponibles</p>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Shopping Cart.svg')} alt="Compras" />
                  </div>
                  <h4>Compra con descuento</h4>
                  <p>Los descuentos se aplican automáticamente al agregar al carrito</p>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Award.svg')} alt="Beneficios" />
                  </div>
                  <h4>Beneficios exclusivos</h4>
                  <p>Acceso a ofertas especiales para clientes registrados</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default PromocionesPage; 
