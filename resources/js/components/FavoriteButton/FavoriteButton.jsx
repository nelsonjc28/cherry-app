import React, { useState, useEffect } from 'react';
import './FavoriteButton.css';

const FavoriteButton = ({ 
  productId, 
  productTitle = '', 
  productImage = '', 
  productPrice = 0,
  size = 'medium',
  className = '',
  onToggle = null 
}) => {
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  // Verificar si el producto está en favoritos al cargar
  useEffect(() => {
    checkFavoriteStatus();
  }, [productId]);

  const checkFavoriteStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/favorites/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ product_id: productId })
      });

      if (response.ok) {
        const data = await response.json();
        setIsFavorited(data.is_favorited);
      }
    } catch (error) {
      // Error checking favorite status
    }
  };

  const handleToggle = async () => {
    if (loading) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        // Redirigir a login si no está autenticado
        window.location.href = '/login';
        return;
      }

      const response = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: productId,
          product_title: productTitle,
          product_image: productImage,
          product_price: productPrice
        })
      });

      if (response.ok) {
        const data = await response.json();
        setIsFavorited(data.is_favorited);
        
        // Mostrar notificación
        if (window.showToast) {
          window.showToast(
            data.is_favorited ? 'Agregado a favoritos' : 'Removido de favoritos',
            data.is_favorited ? 'success' : 'info'
          );
        }

        // Callback opcional
        if (onToggle) {
          onToggle(data.is_favorited);
        }
      } else {
        throw new Error('Error al actualizar favoritos');
      }
    } catch (error) {
      if (window.showToast) {
        window.showToast('Error al actualizar favoritos', 'error');
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