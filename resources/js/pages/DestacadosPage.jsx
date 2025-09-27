import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import CherryButton from '../components/CherryButton/CherryButton';
import { getIconPath } from '../utils/assetPaths';
import { getTopSellingProducts } from '../api/cherryApi';
import { applyUserOffersToProducts } from '../api/userOffers';
import useUserStore from '../store/userStore';
import './DestacadosPage.css';

const DestacadosPage = () => {
  const { user } = useUserStore();
  const [topSellingProducts, setTopSellingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTopSellingProducts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('🏆 DestacadosPage: Cargando productos más vendidos del mes...');
        
        // Obtener productos más vendidos del mes actual
        const products = await getTopSellingProducts(20);
        
        if (products.length === 0) {
          console.log('📊 DestacadosPage: No hay productos más vendidos este mes');
          setTopSellingProducts([]);
          setCurrentMonth(new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));
          return;
        }
        
        // Aplicar ofertas personalizadas si hay usuario logueado
        let finalProducts = products;
        if (user) {
          console.log('👤 DestacadosPage: Aplicando ofertas personalizadas...');
          finalProducts = await applyUserOffersToProducts(products);
        }
        
        setTopSellingProducts(finalProducts);
        setCurrentMonth(new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));
        
        console.log(`✅ DestacadosPage: ${finalProducts.length} productos más vendidos cargados`);
        
      } catch (error) {
        console.error('❌ DestacadosPage: Error al cargar productos más vendidos:', error);
        setError('Error al cargar los productos más vendidos');
        setTopSellingProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadTopSellingProducts();
  }, [user]);

  const handleFavoriteToggle = (productId) => {
    // TODO: Implementar toggle de favoritos
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Más Vendidos - Cherry Central</title>
        </Helmet>
        
        <main className="destacados-page">
          <div className="container">
            <div className="destacados-loading">
              <div className="loading-spinner"></div>
              <p>Cargando productos más vendidos...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Productos Más Vendidos - Cherry Central</title>
        <meta name="description" content="Descubre los 20 productos más vendidos del mes en Cherry Central. Los favoritos de nuestros clientes." />
      </Helmet>

      <main className="destacados-page">
        <div className="container">
          {/* Header */}
          <div className="destacados-header">
            <h1>Productos Más Vendidos</h1>
            <p>Los 20 productos favoritos de nuestros clientes en {currentMonth}</p>
          </div>


          {/* Productos más vendidos */}
          <div className="destacados-content">
            <div className="destacados-header-section">
              <h2>Ranking de Ventas - {currentMonth}</h2>
              <p>
                {topSellingProducts.length} productos más vendidos
              </p>
            </div>

            {error && (
              <div className="destacados-error">
                <div className="error-icon">
                  <img src={getIconPath('Alert.svg')} alt="Error" />
                </div>
                <h3>Error al cargar productos</h3>
                <p>{error}</p>
                <CherryButton 
                  variant="outline" 
                  size="medium"
                  onClick={() => window.location.reload()}
                >
                  Reintentar
                </CherryButton>
              </div>
            )}

            {!error && topSellingProducts.length === 0 ? (
              <div className="destacados-empty">
                <div className="empty-icon">
                  <img src={getIconPath('Bullhorn.svg')} alt="Sin ventas" />
                </div>
                <h3>No hay datos de ventas</h3>
                <p>No se encontraron productos vendidos en {currentMonth}</p>
                <Link to="/catalogo">
                  <CherryButton variant="outline" size="medium">
                    Ver catálogo completo
                  </CherryButton>
                </Link>
              </div>
            ) : (
              <div className="destacados-products-grid">
                {topSellingProducts.map((product, index) => (
                  <div key={product.id} className="product-ranking-item">
                    <div className="ranking-badge">
                      #{index + 1}
                    </div>
                    <ProductCard
                      product={product}
                      onFavoriteToggle={handleFavoriteToggle}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sección de información */}
          <div className="destacados-info">
            <div className="info-section">
              <h3>¿Por qué estos productos son los más vendidos?</h3>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Bullhorn.svg')} alt="Demanda" />
                  </div>
                  <h4>Alta demanda</h4>
                  <p>Productos con mayor número de ventas en {currentMonth}</p>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Award.svg')} alt="Calidad" />
                  </div>
                  <h4>Calidad comprobada</h4>
                  <p>Productos que nuestros clientes eligen una y otra vez</p>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Shopping Cart.svg')} alt="Tendencia" />
                  </div>
                  <h4>Tendencia actual</h4>
                  <p>Los favoritos del mes que marcan la moda</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  );
};

export default DestacadosPage; 

