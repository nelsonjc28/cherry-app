import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import CherryButton from '../components/CherryButton/CherryButton';
import { getIconPath } from '../utils/assetPaths';
import { getUserOffers, isUserLoggedIn } from '../api/userOffers';
import { fetchProducts } from '../api/cherryApi';
import './PromocionesPage.css';

const PromocionesPage = () => {
  const [userOffers, setUserOffers] = useState([]);
  const [productsWithOffers, setProductsWithOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const loadUserOffersAndProducts = async () => {
      setLoading(true);
      try {
        // Verificar si el usuario está logueado
        const loggedIn = isUserLoggedIn();
        console.log('🔐 Usuario logueado:', loggedIn);
        console.log('🔑 Token en localStorage:', !!localStorage.getItem('token'));
        
        setIsLoggedIn(loggedIn);
        
        if (loggedIn) {
          // Obtener ofertas específicas para el usuario
          console.log('📞 Llamando a getUserOffers...');
          const offers = await getUserOffers();
          console.log('📋 Ofertas recibidas:', offers);
          setUserOffers(offers);
          
          if (offers.length > 0) {
            // Obtener todos los productos de la API
            const allProducts = await fetchProducts();
            
            // Extraer todos los IDs de productos de las ofertas del usuario
            const offerProductIds = [];
            
            console.log('🔍 Procesando ofertas del usuario:', offers);
            
            offers.forEach(offer => {
              console.log('📋 Procesando oferta:', offer.title);
              
              if (offer.target_products && offer.target_products.length > 0) {
                console.log('   - Productos específicos encontrados:', offer.target_products.length);
                
                offer.target_products.forEach((targetProduct, index) => {
                  if (typeof targetProduct === 'string') {
                    console.log(`   - [${index}] String ID: ${targetProduct}`);
                    offerProductIds.push(targetProduct);
                  } else if (targetProduct && targetProduct.id) {
                    console.log(`   - [${index}] Objeto ID: ${targetProduct.id}`);
                    offerProductIds.push(targetProduct.id);
                  } else {
                    console.log(`   - [${index}] Formato no reconocido:`, targetProduct);
                  }
                });
              } else {
                console.log('   - Aplica a TODOS los productos');
                // Si target_products está vacío, la oferta aplica a todos los productos
                allProducts.forEach(product => {
                  if (product.hasUserOffer) {
                    offerProductIds.push(product.id || product.id_articulo);
                  }
                });
              }
            });
            
            const uniqueProductIds = [...new Set(offerProductIds)];
            console.log('🎯 IDs únicos de productos en ofertas:', uniqueProductIds);
            
            // Filtrar productos que están en las ofertas del usuario
            const productsInUserOffers = allProducts.filter(product => {
              const productId = product.id || product.id_articulo || product.codigo;
              const isInOffer = uniqueProductIds.includes(productId);
              const hasOffer = product.hasUserOffer;
              
              console.log(`🔍 Producto ${productId}:`, {
                isInOffer,
                hasOffer,
                willShow: isInOffer && hasOffer
              });
              
              return isInOffer && hasOffer;
            });
            
            setProductsWithOffers(productsInUserOffers);
          } else {
            setProductsWithOffers([]);
          }
        } else {
          setUserOffers([]);
          setProductsWithOffers([]);
        }
      } catch (error) {
        console.error('Error cargando ofertas de usuario:', error);
        setUserOffers([]);
        setProductsWithOffers([]);
      } finally {
        setLoading(false);
      }
    };

    loadUserOffersAndProducts();
  }, []);

  const handleFavoriteToggle = (productId) => {
    // Implementar lógica de favoritos si es necesario
  };

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
            <h1>Mis Productos en Promoción</h1>
            <p>Productos con descuentos exclusivos asignados para ti</p>
          </div>

          {/* Verificar si el usuario está logueado */}
          {!isLoggedIn ? (
            <div className="promociones-empty">
              <div className="empty-icon">
                <img src={getIconPath('User.svg')} alt="Iniciar sesión" />
              </div>
              <h3>Inicia sesión para ver tus promociones</h3>
              <p>Accede a ofertas exclusivas personalizadas para ti</p>
              <Link to="/login">
                <CherryButton variant="primary" size="medium">
                  Iniciar Sesión
                </CherryButton>
              </Link>
            </div>
          ) : productsWithOffers.length === 0 ? (
            <div className="promociones-empty">
              <div className="empty-icon">
                <img src={getIconPath('Bullhorn.svg')} alt="Sin promociones" />
              </div>
              <h3>No tienes productos en promoción</h3>
              <p>No has sido asignado a ninguna promoción actualmente. ¡Mantente atento a futuras ofertas exclusivas!</p>
              <Link to="/catalogo">
                <CherryButton variant="outline" size="medium">
                  Explorar Catálogo
                </CherryButton>
              </Link>
            </div>
          ) : (
            <div className="promociones-content">
              <div className="promociones-header-section">
                <h2>Tus Productos en Promoción</h2>
                <p>{productsWithOffers.length} producto{productsWithOffers.length !== 1 ? 's' : ''} en oferta exclusiva{productsWithOffers.length !== 1 ? 's' : ''}</p>
              </div>

              {/* Grid de productos con ofertas - SIN tarjetas de promoción */}
              <div className="promociones-products-grid">
                {productsWithOffers.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                ))}
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
