import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import CategoryIcon from '../components/CategoryIcon/CategoryIcon';
import CherryButton from '../components/CherryButton/CherryButton';
import { getCategoryIconPath, getIconPath } from '../utils/assetPaths';
import useCategories from '../hooks/useCategories';
import useMenuCategories from '../hooks/useMenuCategories';
import './CategoriasPage.css';

const CategoriasPage = () => {
  const navigate = useNavigate();
  const { categories, loading, error } = useCategories();
  const { menuCategories, loading: menuLoading } = useMenuCategories();
  
  // Priorizar las categorías del menú si están disponibles
  const displayCategories = menuCategories.length > 0 ? menuCategories : categories;
  const displayLoading = menuLoading || loading;

  // Función para convertir nombre de categoría de plural a singular
  const pluralToSingular = (categoryName) => {
    // Mapeo de plurales a singulares específicos
    const pluralMap = {
      'pantalones': 'pantalón',
      'vestidos': 'vestido',
      'blusas': 'blusa',
      'faldas': 'falda',
      'chaquetas': 'chaqueta',
      'abrigos': 'abrigo',
      'trajes': 'traje',
      'zapatos': 'zapato',
      'bolsos': 'bolso',
      'accesorios': 'accesorio',
      'suéteres': 'suéter',
      'camisas': 'camisa',
      'playeras': 'playera',
      'chamarras': 'chamarra',
      'shorts': 'short',
      'calcetines': 'calcetín',
      'leggins': 'leggin',
      'jeans': 'jean'
    };

    const lowerName = categoryName.toLowerCase().trim();
    
    // Si existe en el mapeo, retornar el singular
    if (pluralMap[lowerName]) {
      return pluralMap[lowerName];
    }
    
    // Reglas generales para español
    // Si termina en "ones" (como "pantalones"), cambiar a "ón"
    if (lowerName.endsWith('ones')) {
      return lowerName.slice(0, -4) + 'ón';
    }
    
    // Si termina en "es" después de consonante, quitar "es"
    if (lowerName.endsWith('es') && lowerName.length > 3) {
      const beforeEs = lowerName[lowerName.length - 3];
      if (!'aeiou'.includes(beforeEs)) {
        return lowerName.slice(0, -2);
      }
    }
    
    // Si termina en "s" simple, quitarla
    if (lowerName.endsWith('s') && !lowerName.endsWith('ss')) {
      return lowerName.slice(0, -1);
    }
    
    // Si no se puede convertir, retornar el original
    return categoryName;
  };

  // Función para manejar clic en categoría (igual que en el header)
  const handleCategoryClick = (category, e) => {
    e.preventDefault();
    
    // Hacer búsqueda por nombre de categoría en singular
    const singularName = pluralToSingular(category.name);
    const searchParams = new URLSearchParams();
    searchParams.set('q', singularName);
    navigate(`/buscar?${searchParams.toString()}`);
  };


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
                  <Link 
                    to={`/categoria/${category.slug || category.name}`}
                    onClick={(e) => handleCategoryClick(category, e)}
                  >
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
