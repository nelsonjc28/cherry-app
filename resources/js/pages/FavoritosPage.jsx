import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useFavorites } from '../hooks/useFavorites';
import './FavoritosPage.css';

const FavoritosPage = () => {
  const { 
    favoriteProductIds, 
    loading, 
    error, 
    fetchFavorites,
    removeFromFavorites 
  } = useFavorites();

  const handleRemoveFavorite = async (productId) => {
    const success = await removeFromFavorites(productId);
    if (success && window.showToast) {
      window.showToast('Producto removido de favoritos', 'success');
    }
  };

  const handleProductClick = (productId) => {
    window.location.href = `/producto/${productId}`;
  };

  if (loading) {
    return (
      <div className="favoritos-page">
        <div className="favoritos-page__loading">
          <div className="loading-spinner"></div>
          <h2>Cargando tus favoritos</h2>
          <p>Estamos obteniendo tus productos favoritos...</p>

          

          

          

        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="favoritos-page">
        <div className="favoritos-page__error">
          <div className="favoritos-page__error-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h2>No se pudieron cargar los favoritos</h2>
          <p>{error}</p>
          <div className="favoritos-page__error-actions">
            {error.includes('iniciar sesión') ? (
              <button 
                className="btn btn-primary"
                onClick={() => window.location.href = '/login'}
              >
                Iniciar Sesión
              </button>
            ) : (
              <button 
                className="btn btn-outline-primary"
                onClick={fetchFavorites}
              >
                Intentar Nuevamente
              </button>
            )}
            <button 
              className="btn btn-outline-secondary"
              onClick={() => window.location.href = '/catalogo'}
            >
              Explorar Productos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Mis Favoritos - Cherry</title>
        <meta name="description" content="Tus productos favoritos guardados" />
      </Helmet>

      <div className="favoritos-page">
        <div className="favoritos-page__header">
          <div className="favoritos-page__header-content">
            <div>
              <h1>Mis Favoritos</h1>
              <p>{favoriteProductIds.length} {favoriteProductIds.length === 1 ? 'producto' : 'productos'} guardado{favoriteProductIds.length !== 1 ? 's' : ''}</p>
            </div>
            <button 
              className="btn btn-outline-primary"
              onClick={fetchFavorites}
              disabled={loading}
              title="Recargar favoritos"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M20.24 7.76a6 6 0 0 0-8.49-8.49L5 10.5"></path>
                <path d="M3.76 16.24a6 6 0 0 0 8.49 8.49L19 13.5"></path>
              </svg>
              Recargar
            </button>
          </div>
        </div>

        {favoriteProductIds.length === 0 ? (
          <div className="favoritos-page__empty">
            <div className="favoritos-page__empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </div>
            <h3>No tienes favoritos aún</h3>
            <p>Agrega productos a tus favoritos para verlos aquí</p>
            <button onClick={() => window.location.href = '/catalogo'}>
              Explorar Productos
            </button>
          </div>
        ) : (
          <div className="favoritos-page__grid">
            {favoriteProductIds.map((productId) => (
              <div key={productId} className="favoritos-page__item">
                <div className="favoritos-page__item-image" onClick={() => handleProductClick(productId)}>
                  <img 
                    src="/placeholder-product.jpg" 
                    alt="Producto"
                    onError={(e) => {
                      e.target.src = '/placeholder-product.jpg';
                    }}
                  />
                  <div className="favoritos-page__item-overlay">
                    <span>Ver Producto</span>
                  </div>
                </div>
                
                <div className="favoritos-page__item-content">
                  <h3 onClick={() => handleProductClick(productId)}>
                    Producto ID: {productId}
                  </h3>
                  
                  <div className="favoritos-page__item-actions">
                    <button 
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleRemoveFavorite(productId)}
                      title="Remover de favoritos"
                    >
                      ❌ Remover
                    </button>
                    
                    <button 
                      className="favoritos-page__item-view"
                      onClick={() => handleProductClick(productId)}
                    >
                      Ver Producto
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default FavoritosPage; 