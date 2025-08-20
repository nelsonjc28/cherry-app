import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import CategoryIcon from '../components/CategoryIcon/CategoryIcon';
import CherryButton from '../components/CherryButton/CherryButton';
import { getCategoryIconPath, getIconPath } from '../utils/assetPaths';
import useCategories from '../hooks/useCategories';
import './CategoriasPage.css';

const CategoriasPage = () => {
  const { categories, loading, error } = useCategories();

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

          {/* Iconos de categorías */}
          <div className="categorias-icons">
            {categories.map((category) => (
              <div key={category.id} className="categoria-icon-wrapper">
                <CategoryIcon name={category.name} icon={getCategoryIconPath(category.name)} />
              </div>
            ))}
          </div>

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