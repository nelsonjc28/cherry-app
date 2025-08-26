import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import CategoryIcon from '../components/CategoryIcon/CategoryIcon';
import CherryButton from '../components/CherryButton/CherryButton';
import { getCategoryIconPath, getIconPath } from '../utils/assetPaths';
import useCategories from '../hooks/useCategories';
import useMenuCategories from '../hooks/useMenuCategories';
import './CategoriasPage.css';

const CategoriasPage = () => {
  const { categories, loading, error } = useCategories();
  const { menuCategories, loading: menuLoading } = useMenuCategories();
  
  // Priorizar las categorías del menú si están disponibles
  const displayCategories = menuCategories.length > 0 ? menuCategories : categories;
  const displayLoading = menuLoading || loading;


  if (displayLoading) {
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
            {displayCategories.map((category) => {
              const iconPath = getCategoryIconPath(category.slug || category.name);
              return (
                <div key={category.id} className="categoria-icon-wrapper">
                  <Link to={`/categoria/${category.slug || category.name}`}>
                    <CategoryIcon 
                      name={category.name} 
                      icon={iconPath} 
                    />
                  </Link>
                </div>
              );
            })}
          </div>

        </div>
      </main>
    </>
  );
};

export default CategoriasPage; 