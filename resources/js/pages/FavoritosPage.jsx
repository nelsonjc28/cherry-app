import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import FavoriteButton from '../components/FavoriteButton/FavoriteButton';
import { formatPrice } from '../utils/formatters';
import './FavoritosPage.css';

const FavoritosPage = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Debes iniciar sesión para ver tus favoritos');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/favorites', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFavorites(data.favorites || []);
      } else {
        throw new Error('Error al obtener favoritos');
      }
    } catch (error) {
      setError('Error al cargar tus favoritos');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = (productId) => {
    setFavorites(prev => prev.filter(fav => fav.product_id !== productId));
  };

  const handleProductClick = (productId) => {
    // Navegar a la página del producto
    window.location.href = `/producto/${productId}`;
  };

  if (loading) {
    return (
      <div className="favoritos-page">
        <div className="favoritos-page__loading">
          <div className="loading-spinner"></div>
          <p>Cargando tus favoritos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="favoritos-page">
        <div className="favoritos-page__error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.href = '/login'}>
            Iniciar Sesión
          </button>
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
          <h1>Mis Favoritos</h1>
          <p>{favorites.length} {favorites.length === 1 ? 'producto' : 'productos'} guardado{favorites.length !== 1 ? 's' : ''}</p>
        </div>

        {favorites.length === 0 ? (
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
            {favorites.map((favorite) => (
              <div key={favorite.id} className="favoritos-page__item">
                <div className="favoritos-page__item-image" onClick={() => handleProductClick(favorite.product_id)}>
                  <img 
                    src={favorite.product_image || '/placeholder-product.jpg'} 
                    alt={favorite.product_title}
                    onError={(e) => {
                      e.target.src = '/placeholder-product.jpg';
                    }}
                  />
                  <div className="favoritos-page__item-overlay">
                    <span>Ver Producto</span>
                  </div>
                </div>
                
                <div className="favoritos-page__item-content">
                  <h3 onClick={() => handleProductClick(favorite.product_id)}>
                    {favorite.product_title}
                  </h3>
                  
                  {favorite.product_price && (
                    <p className="favoritos-page__item-price">
                      {formatPrice(favorite.product_price)}
                    </p>
                  )}
                  
                  <div className="favoritos-page__item-actions">
                    <FavoriteButton
                      productId={favorite.product_id}
                      productTitle={favorite.product_title}
                      productImage={favorite.product_image}
                      productPrice={favorite.product_price}
                      size="small"
                      onToggle={(isFavorited) => {
                        if (!isFavorited) {
                          handleRemoveFavorite(favorite.product_id);
                        }
                      }}
                    />
                    
                    <button 
                      className="favoritos-page__item-view"
                      onClick={() => handleProductClick(favorite.product_id)}
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