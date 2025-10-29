import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import CherryButton from '../components/CherryButton/CherryButton';
import InfiniteScrollLoader from '../components/InfiniteScrollLoader/InfiniteScrollLoader';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import { getIconPath } from '../utils/assetPaths';
import { getProductsWithRatings, isUserSessionActive } from '../api/cherryApi';
import { applyUserOffersToProducts } from '../api/userOffers';
import './PromocionesPage.css';

const PromocionesPage = () => {
  const [productsWithOffers, setProductsWithOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const hasActiveSession = isUserSessionActive();

  // Cargar productos con promociones (PRIMERO ofertas del admin, LUEGO API externa)
  useEffect(() => {
    const loadPromoProducts = async () => {
      setLoading(true);
      try {
        console.log('🎁 PromocionesPage: Cargando productos con promociones...');
        
        let allPromoProducts = [];
        let adminOfferProductIds = [];
        
        // PASO 1: Si hay usuario logueado, obtener productos con ofertas del ADMIN PRIMERO
        if (hasActiveSession) {
          const token = localStorage.getItem('token');
          if (token) {
            try {
              // Obtener IDs de productos que tienen ofertas del admin
              const offerResponse = await fetch('/api/user-offer-products', {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (offerResponse.ok) {
                const offerData = await offerResponse.json();
                if (offerData.success && offerData.product_ids && offerData.product_ids.length > 0) {
                  console.log(`🎯 ${offerData.product_ids.length} productos con ofertas del admin`);
                  adminOfferProductIds = offerData.product_ids;
                  
                  // Cargar TODOS los productos de la API para buscar los de las ofertas del admin
                  const allProductsResult = await getProductsWithRatings('Cherry 2025 - 2026', {
                    limit: null
                  });
                  const allProducts = allProductsResult.products || allProductsResult || [];
                  
                  // Filtrar productos que tienen ofertas del admin
                  const adminOfferProducts = allProducts.filter(product => {
                    const productId = (product.id_articulo || product.id || product.codigo).toString();
                    return adminOfferProductIds.includes(productId);
                  });
                  
                  console.log(`✅ ${adminOfferProducts.length} productos con ofertas del admin cargados`);
                  allPromoProducts = adminOfferProducts;
                }
              }
            } catch (error) {
              console.warn('⚠️ Error al cargar ofertas del admin:', error);
            }
          }
        }
        
        // PASO 2: Cargar productos con desc_promo de la API externa (que NO tengan oferta del admin)
        const result = await getProductsWithRatings('Cherry 2025 - 2026', {
          limit: null,
          onlyPromos: true,  // Solo productos con desc_promo
          random: true
        });
        
        const externalPromoProducts = result.products || result || [];
        console.log(`📦 ${externalPromoProducts.length} productos con desc_promo de API externa`);
        
        // Filtrar productos de API externa que NO tengan oferta del admin
        const filteredExternalPromos = externalPromoProducts.filter(product => {
          const productId = (product.id_articulo || product.id || product.codigo).toString();
          return !adminOfferProductIds.includes(productId);
        });
        
        console.log(`➕ Agregando ${filteredExternalPromos.length} productos de API externa (sin ofertas del admin)`);
        allPromoProducts = [...allPromoProducts, ...filteredExternalPromos];
        
        // PASO 3: Aplicar ofertas personalizadas del usuario a TODOS los productos
        const productsWithUserOffers = await applyUserOffersToProducts(allPromoProducts);
        
        console.log(`✅ Total: ${productsWithUserOffers.length} productos con promociones`);
        setProductsWithOffers(productsWithUserOffers);
      } catch (error) {
        console.error('❌ Error al cargar promociones:', error);
        setProductsWithOffers([]);
      } finally {
        setLoading(false);
      }
    };

    loadPromoProducts();
  }, [hasActiveSession]);

  const handleFavoriteToggle = (productId) => {
    // Implementar lógica de favoritos si es necesario
    };

  // Infinite scroll
  const infiniteScroll = useInfiniteScroll(productsWithOffers, 20);

  // Reset infinite scroll cuando cambian los productos
  useEffect(() => {
    infiniteScroll.reset();
  }, [productsWithOffers.length]);

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Rebajas - Cherry Central</title>
        </Helmet>
        
        <main className="promociones-page">
          <div className="container">
            <div className="promociones-loading">
              <div className="loading-spinner"></div>
              <p>Cargando rebajas...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Rebajas - Cherry Central</title>
        <meta name="description" content="Descubre las mejores rebajas y ofertas en Cherry Central. Descuentos especiales en moda femenina." />
      </Helmet>

      <main className="promociones-page">
        <div className="container">
          {/* Header */}
          <div className="promociones-header">
            <h1>
              {hasActiveSession ? 'Rebajas Personalizadas' : 'Rebajas Disponibles'}
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
                <img src={getIconPath('Bullhorn.svg')} alt="Sin rebajas" />
              </div>
              <h3>No hay rebajas disponibles</h3>
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
                  {hasActiveSession ? 'Rebajas Personalizadas' : 'Rebajas Especiales'}
                </h2>
                <p>
                  {productsWithOffers.length} producto{productsWithOffers.length !== 1 ? 's' : ''} en oferta
                </p>
              </div>


              {/* Grid de productos con ofertas */}
              <div className="promociones-products-grid">
                {infiniteScroll.displayedItems.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                ))}
              </div>

              {/* Infinite Scroll Loader */}
              <InfiniteScrollLoader
                isLoading={infiniteScroll.isLoading}
                hasMore={infiniteScroll.hasMore}
                observerTarget={infiniteScroll.observerTarget}
              />
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
              <h3>¿Cómo funcionan nuestras rebajas?</h3>
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