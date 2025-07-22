import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import CherryButton from '../components/CherryButton/CherryButton';
import { getIconPath } from '../utils/assetPaths';
import { getAllProducts, mapApiProductToAppProduct } from '../api/cherryApi';
import './NuevosPage.css';

const NuevosPage = () => {
  const [newProducts, setNewProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'Todos los nuevos', icon: 'Bell.svg' },
    { id: 'vestidos', name: 'Vestidos', icon: 'category/vestido-de-novio 1.svg' },
    { id: 'blusas', name: 'Blusas', icon: 'category/blusa 1.svg' },
    { id: 'pantalones', name: 'Pantalones', icon: 'category/pantalones-ajustados 1.svg' },
    { id: 'accesorios', name: 'Accesorios', icon: 'category/vestir 1.svg' }
  ];

  useEffect(() => {
    const loadNewProducts = async () => {
      setLoading(true);
      try {
        const allProducts = await getAllProducts();
        const mappedProducts = allProducts.map(mapApiProductToAppProduct);
        
        // Filtrar productos nuevos
        const newProducts = mappedProducts.filter(product => 
          product.isNew || (product.createdAt && isRecentlyCreated(product.createdAt))
        );
        
        setNewProducts(newProducts);
      } catch (error) {
        setNewProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadNewProducts();
  }, []);

  const isRecentlyCreated = (createdAt) => {
    const productDate = new Date(createdAt);
    const now = new Date();
    const daysDiff = (now - productDate) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30; // Productos de los últimos 30 días
  };

  const getFilteredProducts = () => {
    if (selectedCategory === 'all') {
      return newProducts;
    }

    return newProducts.filter(product => {
      const productCategory = product.category?.toLowerCase() || '';
      return productCategory.includes(selectedCategory);
    });
  };

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleFavoriteToggle = (productId) => {
    };

  const filteredProducts = getFilteredProducts();

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Nuevos Productos - Cherry Central</title>
        </Helmet>
        
        <main className="nuevos-page">
          <div className="container">
            <div className="nuevos-loading">
              <div className="loading-spinner"></div>
              <p>Cargando nuevos productos...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Nuevos Productos - Cherry Central</title>
        <meta name="description" content="Descubre los productos más nuevos de Cherry Central. Las últimas novedades en moda femenina." />
      </Helmet>

      <main className="nuevos-page">
        <div className="container">
          {/* Header */}
          <div className="nuevos-header">
            <h1>Nuevos Productos</h1>
            <p>Descubre las últimas novedades de la temporada</p>
          </div>

          {/* Banner de novedades */}
          <div className="nuevos-banner">
            <div className="banner-content">
              <h2>¡Novedades Llegando!</h2>
              <p>Los productos más recientes de nuestra colección</p>
              <div className="banner-stats">
                <div className="stat-item">
                  <span className="stat-number">{newProducts.length}</span>
                  <span className="stat-label">Nuevos productos</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">30</span>
                  <span className="stat-label">Días de novedad</span>
                </div>
              </div>
            </div>
            <div className="banner-image">
              <img src={getIconPath('Bell.svg')} alt="Nuevos productos" />
            </div>
          </div>

          {/* Filtros por categoría */}
          <div className="nuevos-filtros">
            <div className="filtros-grid">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`filtro-btn ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(category.id)}
                >
                  <div className="filtro-icon">
                    <img src={getIconPath(category.icon)} alt={category.name} />
                  </div>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Productos nuevos */}
          <div className="nuevos-content">
            <div className="nuevos-header-section">
              <h2>
                {categories.find(c => c.id === selectedCategory)?.name}
              </h2>
              <p>{filteredProducts.length} productos nuevos</p>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="nuevos-empty">
                <div className="empty-icon">
                  <img src={getIconPath('Bell.svg')} alt="Sin nuevos productos" />
                </div>
                <h3>No hay productos nuevos</h3>
                <p>
                  {selectedCategory === 'all' 
                    ? 'No hay productos nuevos en este momento'
                    : `No hay productos nuevos en la categoría "${categories.find(c => c.id === selectedCategory)?.name}"`
                  }
                </p>
                <Link to="/catalogo">
                  <CherryButton variant="outline" size="medium">
                    Ver catálogo completo
                  </CherryButton>
                </Link>
              </div>
            ) : (
              <div className="nuevos-products-grid">
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
          <div className="nuevos-info">
            <div className="info-section">
              <h3>¿Qué hace que un producto sea "nuevo"?</h3>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Bell.svg')} alt="Reciente" />
                  </div>
                  <h4>Recién llegados</h4>
                  <p>Productos que han llegado en los últimos 30 días</p>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Award.svg')} alt="Calidad" />
                  </div>
                  <h4>Alta calidad</h4>
                  <p>Productos seleccionados con los mejores materiales</p>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Bullhorn.svg')} alt="Tendencias" />
                  </div>
                  <h4>Últimas tendencias</h4>
                  <p>Diseños actuales y estilos de moda</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="nuevos-cta">
            <div className="cta-content">
              <h2>¿Quieres estar al día?</h2>
              <p>Suscríbete para recibir notificaciones de nuevos productos</p>
              <CherryButton variant="red" size="large">
                Suscribirse
              </CherryButton>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default NuevosPage; 