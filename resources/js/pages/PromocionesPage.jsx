import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import CherryButton from '../components/CherryButton/CherryButton';
import { getIconPath } from '../utils/assetPaths';
import { fetchProducts, getPromoProducts } from '../api/cherryApi';
import { checkUserDiscounts } from '../api/userDiscounts';
import useUserStore from '../store/userStore';
import './PromocionesPage.css';

const PromocionesPage = () => {
  const [productsWithOffers, setProductsWithOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, token } = useUserStore();
  const isLoggedIn = !!(user && token);

  useEffect(() => {
    const loadProductsWithDiscounts = async () => {
      setLoading(true);
      try {
        
        if (isLoggedIn) {
          
          // Probar con TODOS los productos de TODAS las ofertas
          const allOfferProductIds = [
            // Oferta 1 (descuento 30%)
            '515422585712', '40552080604', '9755184512', '50552258912',
            // Oferta 5 (buy x get y)
            '415580090408', '50552257112', '9755194006', '50552252707',
            // Oferta 6 (descuento en el pedido 20%)
            '9755959704', '50552254404', '40552090804',
            // Oferta 7 (envío gratis)
            '515422525006', '415588090708', '46552510107'
          ];
          
          try {
            const testDiscountsResponse = await checkUserDiscounts(allOfferProductIds);
            
                    if (testDiscountsResponse.success && Object.keys(testDiscountsResponse.discounts || {}).length > 0) {
                      
            // Obtener todos los productos de la API
            const allProducts = await fetchProducts();
            
                      // También obtener productos con promoción desde la API externa
                      const promoProducts = await getPromoProducts(50); // Obtener hasta 50 productos en promoción
              
              if (allProducts.length > 0 || promoProducts.length > 0) {
                // 1. Filtrar productos con descuentos de usuario
                const productsWithUserDiscounts = allProducts
                  .filter(product => {
                    const productId = product.id || product.id_articulo || product.codigo;
                    return !!testDiscountsResponse.discounts[productId];
                  })
                  .map(product => {
                    const productId = product.id || product.id_articulo || product.codigo;
                    const discount = testDiscountsResponse.discounts[productId];
                    
                    
                    return {
                      ...product,
                      userOffer: discount,
                      hasUserOffer: true,
                      offerType: 'user_discount'
                    };
                  });
                
                // 2. Filtrar productos con desc_promo de la API (que no estén ya en descuentos de usuario)
                const userDiscountProductIds = new Set(productsWithUserDiscounts.map(p => p.id || p.id_articulo || p.codigo));
                
                const productsWithApiPromo = promoProducts
                  .filter(product => {
                    const productId = product.id || product.id_articulo || product.codigo;
                    const hasApiDiscount = (product.desc_promo && product.desc_promo > 0);
                    const notInUserDiscounts = !userDiscountProductIds.has(productId);
                    
                    return hasApiDiscount && notInUserDiscounts;
                  })
                  .map(product => {
                    
                    return {
                      ...product,
                      hasUserOffer: false,
                      offerType: 'api_promo'
                    };
                  });
                
                // 3. Combinar ambos tipos de productos
                const allPromotionalProducts = [...productsWithUserDiscounts, ...productsWithApiPromo];
                
                
                setProductsWithOffers(allPromotionalProducts);
              } else {
                setProductsWithOffers([]);
              }
            } else {
              
                      // Fallback: obtener todos los productos y verificar descuentos
                      const allProducts = await fetchProducts();
                      
                      // También obtener productos con promoción desde la API externa
                      const promoProducts = await getPromoProducts(50);
                      
                      if (allProducts.length > 0 || promoProducts.length > 0) {
                        // Verificar descuentos de usuario
                        let productsWithUserDiscounts = [];
                        if (allProducts.length > 0) {
                          const productIds = allProducts.map(product => 
                            product.id || product.id_articulo || product.codigo
                          ).filter(Boolean);
                          
                          const discountsResponse = await checkUserDiscounts(productIds);
                          
                          if (discountsResponse.success && discountsResponse.discounts) {
                            productsWithUserDiscounts = allProducts
                              .filter(product => {
                                const productId = product.id || product.id_articulo || product.codigo;
                                return !!discountsResponse.discounts[productId];
                              })
                              .map(product => {
              const productId = product.id || product.id_articulo || product.codigo;
                                const discount = discountsResponse.discounts[productId];
                                
                                return {
                                  ...product,
                                  userOffer: discount,
                                  hasUserOffer: true,
                                  offerType: 'user_discount'
                                };
                              });
                          }
                        }
                        
                        // Filtrar productos con desc_promo de la API
                        const userDiscountProductIds = new Set(productsWithUserDiscounts.map(p => p.id || p.id_articulo || p.codigo));
                        const productsWithApiPromo = promoProducts
                          .filter(product => {
                            const productId = product.id || product.id_articulo || product.codigo;
                            const hasApiDiscount = (product.desc_promo && product.desc_promo > 0);
                            const notInUserDiscounts = !userDiscountProductIds.has(productId);
                            
                            return hasApiDiscount && notInUserDiscounts;
                          })
                          .map(product => {
                            
                            return {
                              ...product,
                              hasUserOffer: false,
                              offerType: 'api_promo'
                            };
                          });
                        
                        // Combinar ambos tipos
                        const allPromotionalProducts = [...productsWithUserDiscounts, ...productsWithApiPromo];
                        setProductsWithOffers(allPromotionalProducts);
          } else {
                setProductsWithOffers([]);
              }
            }
          } catch (error) {
            console.error('❌ Error en verificación de descuentos:', error);
            setProductsWithOffers([]);
          }
        } else {
          setProductsWithOffers([]);
        }
      } catch (error) {
        console.error('❌ Error cargando productos con descuentos:', error);
        setProductsWithOffers([]);
      } finally {
        setLoading(false);
      }
    };

    loadProductsWithDiscounts();
  }, [isLoggedIn, user?.id, token]);

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
