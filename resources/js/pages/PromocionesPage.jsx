import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import CherryButton from '../components/CherryButton/CherryButton';
import { getIconPath } from '../utils/assetPaths';
import { getSmartPromoProducts, isUserSessionActive } from '../api/cherryApi';
import useUserStore from '../store/userStore';
import './PromocionesPage.css';

const PromocionesPage = () => {
  const [productsWithOffers, setProductsWithOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, token } = useUserStore();
  const isLoggedIn = !!(user && token);
  const hasActiveSession = isUserSessionActive();

  useEffect(() => {
    const loadPromoProducts = async () => {
      setLoading(true);
      try {
        console.log('🔍 Cargando promociones...', { 
          isLoggedIn, 
          hasActiveSession,
          userStoreHasUser: !!user,
          userStoreHasToken: !!token,
          localStorageToken: !!localStorage.getItem('token')
        });
        
        
        // Usar la función inteligente que maneja automáticamente sesión activa o no
        const promoProducts = await getSmartPromoProducts(50);
        
        console.log('✅ Productos con promociones cargados:', {
          total: promoProducts.length,
          hasSession: hasActiveSession,
          sampleProducts: promoProducts.slice(0, 3).map(p => ({
            id: p.id,
            title: p.title,
            price: p.price,
            originalPrice: p.originalPrice,
            discount: p.discount,
            hasUserOffer: p.hasUserOffer,
            userDiscount: p.userDiscount
          }))
        });

        // Log detallado separando productos de API externa vs ofertas personalizadas
        if (promoProducts.length > 0) {
          console.log('🔍 PromocionesPage: SEPARANDO productos por tipo:');
          
          const externalProducts = promoProducts.filter(p => !p.hasUserOffer);
          const userOfferProducts = promoProducts.filter(p => p.hasUserOffer);
          
          console.log(`📊 Productos de API externa (${externalProducts.length}):`);
          externalProducts.slice(0, 5).forEach((product, index) => {
            console.log(`  ${index + 1}. ID: ${product.id || product.id_articulo}, Título: ${product.title || product.nombre}, Precio: ${product.price}, Descuento: ${product.discount}%`);
          });
          
          console.log(`🎯 Productos con ofertas personalizadas (${userOfferProducts.length}):`);
          userOfferProducts.forEach((product, index) => {
            console.log(`  ${index + 1}. ID: ${product.id || product.id_articulo}, Título: ${product.title || product.nombre}, Precio: ${product.price}, Descuento: ${product.discount}%, UserOffer: ${product.userOffer?.title}`);
          });
        } else {
          console.log('❌ PromocionesPage: NO se recibieron productos - array vacío');
        }
        
        setProductsWithOffers(promoProducts);
      } catch (error) {
        console.error('❌ Error al cargar productos con promociones:', error);
        setProductsWithOffers([]);
      } finally {
        setLoading(false);
      }
    };

    loadPromoProducts();
  }, [isLoggedIn, hasActiveSession]);

  const handleFavoriteToggle = (productId) => {
    // Implementar lógica de favoritos si es necesario
    console.log('Toggle favorite for product:', productId);
  };

  // Log del estado actual para debugging
  console.log('🔍 PromocionesPage: Estado actual del render:', {
    loading,
    productsCount: productsWithOffers?.length || 0,
    isLoggedIn,
    hasActiveSession,
    hasProducts: productsWithOffers && productsWithOffers.length > 0
  });

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
            <h1>
              {hasActiveSession ? 'Mis Promociones Personalizadas' : 'Promociones Disponibles'}
            </h1>
            <p>
              {hasActiveSession 
                ? 'Ofertas externas y descuentos exclusivos personalizados para ti'
                : 'Ofertas y descuentos especiales de nuestra colección'
              }
            </p>
          </div>

          {/* Mostrar productos con ofertas */}
          {productsWithOffers.length === 0 ? (
            <div className="promociones-empty">
              <div className="empty-icon">
                <img src={getIconPath('Bullhorn.svg')} alt="Sin promociones" />
              </div>
              <h3>No hay promociones disponibles</h3>
              <p>
                {hasActiveSession 
                  ? 'No tienes productos en promoción actualmente. ¡Mantente atento a futuras ofertas exclusivas!'
                  : 'No hay ofertas disponibles en este momento. ¡Revisa nuestro catálogo completo!'
                }
              </p>
              <Link to="/catalogo">
                <CherryButton variant="outline" size="medium">
                  Explorar Catálogo
                </CherryButton>
              </Link>
            </div>
          ) : (
            <div className="promociones-content">
              <div className="promociones-header-section">
                <h2>
                  {hasActiveSession ? 'Tus Ofertas Personalizadas' : 'Ofertas Especiales'}
                </h2>
                <p>
                  {productsWithOffers.length} producto{productsWithOffers.length !== 1 ? 's' : ''} en oferta
                </p>
              </div>


              {/* Grid de productos con ofertas */}
              <div className="promociones-products-grid">
                {(() => {
                  console.log('🔍 PromocionesPage: Renderizando productos:', {
                    productsCount: productsWithOffers?.length || 0,
                    userOfferProductsCount: productsWithOffers?.filter(p => p.hasUserOffer)?.length || 0,
                    externalProductsCount: productsWithOffers?.filter(p => !p.hasUserOffer)?.length || 0
                  });
                  
                  // Log específico de productos con ofertas personalizadas que se van a renderizar
                  const userOfferProducts = productsWithOffers?.filter(p => p.hasUserOffer) || [];
                  if (userOfferProducts.length > 0) {
                    console.log('🎯 PromocionesPage: Productos con ofertas personalizadas a renderizar:');
                    userOfferProducts.forEach((product, index) => {
                      console.log(`  ${index + 1}. ID: ${product.id}, hasUserOffer: ${product.hasUserOffer}, userOffer: ${product.userOffer?.title}`);
                    });
                  } else {
                    console.log('❌ PromocionesPage: NO hay productos con ofertas personalizadas para renderizar');
                  }
                  
                  return productsWithOffers.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onFavoriteToggle={handleFavoriteToggle}
                    />
                  ));
                })()}
              </div>
            </div>
          )}

          {/* Llamada a la acción para usuarios no logueados */}
          {!hasActiveSession && (
            <div className="login-cta">
              <div className="cta-content">
                <h3>¿Quieres ofertas personalizadas?</h3>
                <p>Inicia sesión para acceder a descuentos exclusivos y ofertas especiales solo para ti</p>
                <Link to="/login">
                  <CherryButton variant="primary" size="medium">
                    Iniciar Sesión
                  </CherryButton>
                </Link>
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="promociones-info">
            <div className="info-section">
              <h3>¿Cómo funcionan nuestras promociones?</h3>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Bell.svg')} alt="Notificaciones" />
                  </div>
                  <h4>Ofertas automáticas</h4>
                  <p>Las ofertas se muestran automáticamente según tu estado de sesión</p>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Shopping Cart.svg')} alt="Compras" />
                  </div>
                  <h4>Descuentos aplicados</h4>
                  <p>Los descuentos se aplican automáticamente al agregar productos al carrito</p>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Award.svg')} alt="Beneficios" />
                  </div>
                  <h4>Beneficios exclusivos</h4>
                  <p>Los usuarios registrados acceden a ofertas personalizadas adicionales</p>
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