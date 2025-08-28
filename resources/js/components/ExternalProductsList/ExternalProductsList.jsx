import React, { useState } from 'react';
import ExternalProductCard from '../ExternalProductCard';
import useExternalProducts from '../../hooks/useExternalProducts';
import './ExternalProductsList.css';

const ExternalProductsList = ({ categoryCode, onProductAdded }) => {
  const { products, category, loading, error, refreshProducts } = useExternalProducts(categoryCode);
  const [selectedTab, setSelectedTab] = useState('all');




  if (loading) {
    return (
      <div className="external-products-list__loading">
        <div className="loading-spinner"></div>
        <p>Cargando productos externos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="external-products-list__error">
        <p>Error al cargar productos: {error}</p>
        <button onClick={refreshProducts} className="retry-btn">
          Reintentar
        </button>
      </div>
    );
  }

  if (!products || (products.total_combined === 0)) {
    return (
      <div className="external-products-list__empty">
        <p>No hay productos disponibles para esta categoría</p>
      </div>
    );
  }

  const handleAddToCategory = async (product) => {
    if (onProductAdded) {
      await onProductAdded(product);
      // Refrescar la lista después de agregar
      refreshProducts();
    }
  };

  const getFilteredProducts = () => {
    let filteredProducts;
    switch (selectedTab) {
      case 'local':
        filteredProducts = products.local;
        break;
      case 'external':
        filteredProducts = products.external;
        break;
      default:
        filteredProducts = [...products.local, ...products.external];
        break;
    }
    
    return filteredProducts;
  };

  const filteredProducts = getFilteredProducts();

  return (
    <div className="external-products-list">
      {/* Header con estadísticas */}
      <div className="external-products-list__header">
        <div className="external-products-list__title">
          <h2>Productos de {category?.name || 'Categoría'}</h2>
          <p>Total: {products.total_combined} productos</p>
        </div>
        
        <div className="external-products-list__stats">
          <div className="stat-item">
            <span className="stat-label">En Categoría:</span>
            <span className="stat-value">{products.total_local}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Disponibles:</span>
            <span className="stat-value">{products.total_external}</span>
          </div>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div className="external-products-list__tabs">
        <button 
          className={`tab-btn ${selectedTab === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedTab('all')}
        >
          Todos ({products.total_combined})
        </button>
        <button 
          className={`tab-btn ${selectedTab === 'local' ? 'active' : ''}`}
          onClick={() => setSelectedTab('local')}
        >
          En Categoría ({products.total_local})
        </button>
        <button 
          className={`tab-btn ${selectedTab === 'external' ? 'active' : ''}`}
          onClick={() => setSelectedTab('external')}
        >
          Disponibles ({products.total_external})
        </button>
      </div>

      {/* Lista de productos */}
      <div className="external-products-list__grid">
        {filteredProducts.map((product, index) => {
          const isInCategory = products.local.some(localProduct => 
            localProduct.external_product_id === product.id_articulo
          );
          
          return (
            <ExternalProductCard
              key={product.id || product.id_articulo || index}
              product={product}
              onAddToCategory={handleAddToCategory}
              isInCategory={isInCategory}
            />
          );
        })}
      </div>

      {/* Mensaje si no hay productos en el tab seleccionado */}
      {filteredProducts.length === 0 && (
        <div className="external-products-list__empty-tab">
          <p>No hay productos en esta sección</p>
        </div>
      )}
    </div>
  );
};

export default ExternalProductsList;
