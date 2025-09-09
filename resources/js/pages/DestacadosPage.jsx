import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import CherryButton from '../components/CherryButton/CherryButton';
import { getIconPath } from '../utils/assetPaths';
import { getProductsWithRatings, mapApiProductToAppProduct } from '../api/cherryApi';
import './DestacadosPage.css';

const DestacadosPage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filters = [
    { id: 'all', name: 'Todos los destacados', icon: 'Award.svg' },
    { id: 'new', name: 'Novedades', icon: 'Bell.svg' },
    { id: 'popular', name: 'Más populares', icon: 'Bullhorn.svg' },
    { id: 'trending', name: 'Tendencias', icon: 'Shopping Cart.svg' }
  ];

  useEffect(() => {
    const loadFeaturedProducts = async () => {
      setLoading(true);
      try {
        const allProducts = await getProductsWithRatings();
        const mappedProducts = allProducts.map(mapApiProductToAppProduct);
        
        // Filtrar productos destacados (nuevos, populares, etc.)
        const featured = mappedProducts.filter(product => 
          product.isNew || product.isPromo || product.rating >= 4
        );
        
        setFeaturedProducts(featured);
      } catch (error) {

        setFeaturedProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedProducts();
  }, []);

  const getFilteredProducts = () => {
    if (selectedFilter === 'all') {
      return featuredProducts;
    }

    return featuredProducts.filter(product => {
      switch (selectedFilter) {
        case 'new':
          return product.isNew;
        case 'popular':
          return product.rating >= 4;
        case 'trending':
          return product.isPromo || product.discount > 0;
        default:
          return true;
      }
    });
  };

  const handleFilterClick = (filterId) => {
    setSelectedFilter(filterId);
  };

  const handleFavoriteToggle = (productId) => {
    };

  const filteredProducts = getFilteredProducts();

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Destacados - Cherry Central</title>
        </Helmet>
        
        <main className="destacados-page">
          <div className="container">
            <div className="destacados-loading">
              <div className="loading-spinner"></div>
              <p>Cargando productos destacados...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Destacados - Cherry Central</title>
        <meta name="description" content="Descubre los productos más destacados de Cherry Central. Novedades, tendencias y los más populares." />
      </Helmet>

      <main className="destacados-page">
        <div className="container">
          {/* Header */}
          <div className="destacados-header">
            <h1>Productos Destacados</h1>
            <p>Descubre las mejores selecciones de moda femenina</p>
          </div>

          {/* Banner destacado */}
          <div className="destacados-banner">
            <div className="banner-content">
              <h2>Selección Especial</h2>
              <p>Los productos más populares y novedades de la temporada</p>
              <div className="banner-stats">
                <div className="stat-item">
                  <span className="stat-number">{featuredProducts.length}</span>
                  <span className="stat-label">Productos destacados</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">4.8</span>
                  <span className="stat-label">Calificación promedio</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">1000+</span>
                  <span className="stat-label">Clientes satisfechos</span>
                </div>
              </div>
            </div>
            <div className="banner-image">
              <img src={getIconPath('Award.svg')} alt="Productos destacados" />
            </div>
          </div>

          {/* Filtros */}
          <div className="destacados-filtros">
            <div className="filtros-grid">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  className={`filtro-btn ${selectedFilter === filter.id ? 'active' : ''}`}
                  onClick={() => handleFilterClick(filter.id)}
                >
                  <div className="filtro-icon">
                    <img src={getIconPath(filter.icon)} alt={filter.name} />
                  </div>
                  <span>{filter.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Productos destacados */}
          <div className="destacados-content">
            <div className="destacados-header-section">
              <h2>
                {filters.find(f => f.id === selectedFilter)?.name}
              </h2>
              <p>{filteredProducts.length} productos encontrados</p>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="destacados-empty">
                <div className="empty-icon">
                  <img src={getIconPath('Award.svg')} alt="Sin destacados" />
                </div>
                <h3>No hay productos destacados</h3>
                <p>
                  {selectedFilter === 'all' 
                    ? 'No hay productos destacados en este momento'
                    : `No hay productos en la categoría "${filters.find(f => f.id === selectedFilter)?.name}"`
                  }
                </p>
                <Link to="/catalogo">
                  <CherryButton variant="outline" size="medium">
                    Ver catálogo completo
                  </CherryButton>
                </Link>
              </div>
            ) : (
              <div className="destacados-products-grid">
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

          {/* Sección de información */}
          <div className="destacados-info">
            <div className="info-section">
              <h3>¿Por qué estos productos son destacados?</h3>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Bell.svg')} alt="Novedades" />
                  </div>
                  <h4>Novedades</h4>
                  <p>Productos recién llegados y las últimas tendencias</p>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Award.svg')} alt="Calidad" />
                  </div>
                  <h4>Alta calidad</h4>
                  <p>Productos con las mejores calificaciones de nuestros clientes</p>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Bullhorn.svg')} alt="Popularidad" />
                  </div>
                  <h4>Más populares</h4>
                  <p>Los productos más vendidos y solicitados</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="destacados-cta">
            <div className="cta-content">
              <h2>¿Quieres ver más productos?</h2>
              <p>Explora nuestro catálogo completo para encontrar todo lo que buscas</p>
              <div className="cta-actions">
                <Link to="/catalogo">
                  <CherryButton variant="red" size="large">
                    Ver catálogo completo
                  </CherryButton>
                </Link>
                <Link to="/categorias">
                  <CherryButton variant="outline" size="large">
                    Explorar categorías
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

export default DestacadosPage; 
