import React, { useState, useEffect } from 'react';
import { favoriteService } from '../../services/api';
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
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkFavoriteStatus();
  }, [productId]);

  const checkFavoriteStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsFavorited(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await favoriteService.check(productId);
      clearTimeout(timeoutId);
      
      setIsFavorited(response.data.is_favorited || false);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error checking favorite status:', error);
      }
      setIsFavorited(false);
    }
  };

  const handleToggle = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const newFavoritedState = !isFavorited;
      setIsFavorited(newFavoritedState); // Optimistic update

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await favoriteService.toggle({
        product_id: productId,
        product_title: productTitle,
        product_image: productImage,
        product_price: productPrice
      });

      clearTimeout(timeoutId);

      if (response.data.success) {
        if (onToggle) {
          onToggle(newFavoritedState);
        }
      } else {
        setIsFavorited(!newFavoritedState); // Revert optimistic update
        throw new Error('Error al actualizar favoritos');
      }
    } catch (error) {
      setIsFavorited(!isFavorited); // Revert optimistic update
      
      if (error.name === 'AbortError') {
        if (window.showToast) {
          window.showToast('La operación tardó demasiado. Inténtalo de nuevo.', 'warning');
        }
      } else if (error.response?.status === 401) {
        setIsFavorited(false);
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

  return (
    <button
      className={`favorite-button ${size} ${isFavorited ? 'favorited' : ''} ${loading ? 'loading' : ''} ${className}`}
      onClick={handleToggle}
      disabled={loading}
      aria-label={isFavorited ? 'Remover de favoritos' : 'Agregar a favoritos'}
      title={isFavorited ? 'Remover de favoritos' : 'Agregar a favoritos'}
    >
      <svg 
        width={getIconSize()} 
        height={getIconSize()} 
        viewBox="0 0 24 24" 
        fill={isFavorited ? 'currentColor' : 'none'} 
        stroke="currentColor" 
        strokeWidth="2"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
      </svg>
      
      {loading && (
        <div className="favorite-button__loading">
          <div className="favorite-button__spinner"></div>
        </div>
      )}
    </button>
  );
};

export default FavoriteButton; 