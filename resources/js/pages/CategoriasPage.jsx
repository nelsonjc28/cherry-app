import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import CategoryIcon from '../components/CategoryIcon/CategoryIcon';
import CherryButton from '../components/CherryButton/CherryButton';
import { getIconPath } from '../utils/assetPaths';
import { getAvailableCategories } from '../api/cherryApi';
import './CategoriasPage.css';

const CategoriasPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      try {
        const categoriesData = await getAvailableCategories();
        setCategories(categoriesData);
      } catch (error) {

        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
  };

  const handleViewProducts = (category) => {
    // Navegar a la página de catálogo con filtro de categoría
    window.location.href = `/catalogo?categoria=${encodeURIComponent(category.name)}`;
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Categorías - Cherry Central</title>
        </Helmet>
        
        <main className="categorias-page">
          <div className="container">
            <div className="categorias-loading">
              <div className="loading-spinner"></div>
              <p>Cargando categorías...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Categorías - Cherry Central</title>
        <meta name="description" content="Explora todas las categorías de moda femenina en Cherry Central. Encuentra vestidos, blusas, pantalones y más." />
      </Helmet>

      <main className="categorias-page">
        <div className="container">
          {/* Header */}
          <div className="categorias-header">
            <h1>Nuestras Categorías</h1>
            <p>Explora nuestra amplia selección de moda femenina organizada por categorías</p>
          </div>

          {/* Grid de categorías */}
          <div className="categorias-grid">
            {categories.map((category) => (
              <div 
                key={category.id} 
                className={`categoria-card ${selectedCategory?.id === category.id ? 'selected' : ''}`}
                onClick={() => handleCategoryClick(category)}
              >
                <div className="categoria-icon">
                  <CategoryIcon category={category.name} />
                </div>
                <div className="categoria-content">
                  <h3>{category.name}</h3>
                  <p>{category.description || `${category.name} de moda femenina`}</p>
                  <div className="categoria-actions">
                    <CherryButton 
                      variant="red" 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewProducts(category);
                      }}
                    >
                      Ver productos
                    </CherryButton>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Categoría seleccionada */}
          {selectedCategory && (
            <div className="categoria-selected">
              <div className="selected-header">
                <h2>{selectedCategory.name}</h2>
                <button 
                  className="close-selected"
                  onClick={() => setSelectedCategory(null)}
                >
                  ×
                </button>
              </div>
              <div className="selected-content">
                <p>{selectedCategory.description || `Descubre nuestra colección de ${selectedCategory.name.toLowerCase()}.`}</p>
                <div className="selected-actions">
                  <CherryButton 
                    variant="red" 
                    size="large"
                    onClick={() => handleViewProducts(selectedCategory)}
                  >
                    Ver todos los productos
                  </CherryButton>
                  <Link to="/catalogo">
                    <CherryButton variant="outline" size="large">
                      Ver catálogo completo
                    </CherryButton>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Información adicional */}
          <div className="categorias-info">
            <div className="info-card">
              <div className="info-icon">
                <img src={getIconPath('File Alt.svg')} alt="Catálogos" />
              </div>
              <h3>Catálogos por categoría</h3>
              <p>Accede a catálogos especializados por cada categoría de productos</p>
            </div>
            
            <div className="info-card">
              <div className="info-icon">
                <img src={getIconPath('Bell.svg')} alt="Notificaciones" />
              </div>
              <h3>Nuevas colecciones</h3>
              <p>Recibe notificaciones cuando lleguen nuevos productos en tus categorías favoritas</p>
            </div>
            
            <div className="info-card">
              <div className="info-icon">
                <img src={getIconPath('Search.svg')} alt="Búsqueda" />
              </div>
              <h3>Búsqueda avanzada</h3>
              <p>Filtra productos por categoría, color, talla y más opciones</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default CategoriasPage; 