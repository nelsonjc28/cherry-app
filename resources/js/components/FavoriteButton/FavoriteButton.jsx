import React, { useState, useEffect } from 'react';
import { favoriteService } from '../../services/api';
import { useFavoritesContext } from '../../contexts/FavoritesContext';
import './FavoriteButton.css';

const FavoriteButton = ({ 
  productId, 
  productTitle, 
  productImage, 
  productPrice, 
  onToggle, 
  size = 'medium', 
  className = '' 
}) => {
  const { isFavorited, toggleFavorite, loadFavorites, initialized, favorites } = useFavoritesContext();
  const [loading, setLoading] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [localFavorited, setLocalFavorited] = useState(false);

  // Cargar favoritos solo cuando el componente se monta y no se han cargado aún
  useEffect(() => {
    if (!initialized && !localLoading) {
      setLocalLoading(true);
      loadFavorites().finally(() => setLocalLoading(false));
    }
  }, [initialized, loadFavorites]);

  // Sincronizar estado local con el contexto
  useEffect(() => {
    if (initialized) {
      const favorited = isFavorited(productId);
      setLocalFavorited(favorited);
    }
  }, [initialized, isFavorited, productId]);

  // Escuchar cambios en el contexto de favoritos
  useEffect(() => {
    if (initialized && favorites) {
      const favorited = favorites.has(productId);
      console.log(`Producto ${productId} - Favorito: ${favorited}`, Array.from(favorites || []));
      setLocalFavorited(favorited);
    }
  }, [favorites, productId, initialized]);

  // Sincronización adicional cuando cambia el contexto
  useEffect(() => {
    const syncWithContext = () => {
      if (initialized && favorites) {
        const favorited = favorites.has(productId);
        if (favorited !== localFavorited) {
          console.log(`Sincronizando producto ${productId}: ${localFavorited} -> ${favorited}`);
          setLocalFavorited(favorited);
        }
      }
    };

    // Sincronizar inmediatamente
    syncWithContext();

    // Sincronizar después de un pequeño delay para asegurar que el contexto esté actualizado
    const timeoutId = setTimeout(syncWithContext, 100);

    return () => clearTimeout(timeoutId);
  }, [favorites, productId, initialized, localFavorited]);

  const handleToggle = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      // Actualizar estado local inmediatamente para feedback visual
      const newFavoritedState = !localFavorited;
      setLocalFavorited(newFavoritedState);

      try {
        const result = await toggleFavorite(productId, {
          product_id: productId,
          product_title: productTitle,
          product_image: productImage,
          product_price: productPrice
        });

        // Asegurar que el estado local esté sincronizado con el resultado
        if (result !== undefined) {
          setLocalFavorited(result);
        }

        // Forzar una sincronización con el contexto después de un pequeño delay
        setTimeout(() => {
          if (initialized && favorites) {
            const contextFavorited = favorites.has(productId);
            if (contextFavorited !== result) {
              console.log(`Forzando sincronización: contexto=${contextFavorited}, resultado=${result}`);
              setLocalFavorited(contextFavorited);
            }
          }
        }, 200);
      } catch (error) {
        // En caso de error, mantener el estado anterior
        setLocalFavorited(!newFavoritedState);
        throw error;
      }

      if (onToggle) {
        onToggle(result);
      }
    } catch (error) {
      console.error('Error en toggleFavorite:', error);
      
      if (error.name === 'AbortError') {
        if (window.showToast) {
          window.showToast('La operación tardó demasiado. Inténtalo de nuevo.', 'warning');
        }
      } else if (error.response?.status === 401) {
        window.location.href = '/login';
      } else {
        if (window.showToast) {
          window.showToast('Error al actualizar favoritos: ' + error.message, 'error');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'large': return 24;
      default: return 20;
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'small': return 'btn-sm';
      case 'large': return 'btn-lg';
      default: return '';
    }
  };

  // No mostrar el botón si aún se están cargando los favoritos
  if (localLoading) {
    return null;
  }

  return (
    <button
      className={`favorite-button ${getButtonSize()} ${className}`}
      onClick={handleToggle}
      disabled={loading}
      title={localFavorited ? 'Quitar de favoritos' : 'Agregar a favoritos'}
    >
      {loading ? (
        <div className="favorite-button__loading">
          <div className="spinner-border spinner-border-sm" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      ) : (
        <svg
          width={getIconSize()}
          height={getIconSize()}
          viewBox="0 0 24 24"
          fill={localFavorited ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`favorite-button__icon ${localFavorited ? 'favorited' : ''}`}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      )}
    </button>
  );
};

export default FavoriteButton; 