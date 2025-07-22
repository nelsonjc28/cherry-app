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
    // Solo verificar si no hay un estado local previo
    if (isFavorited === false && !loading) {
      checkFavoriteStatus();
    }
  }, [productId]);

  const checkFavoriteStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsFavorited(false);
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // Reducir timeout a 3 segundos

      const response = await fetch('/api/favorites/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ product_id: productId }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setIsFavorited(data.is_favorited);
      } else if (response.status === 401) {
        // Usuario no autenticado
        setIsFavorited(false);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        // Timeout - no hacer nada, mantener el estado actual
        return;
      }
      // Error checking favorite status
      setIsFavorited(false);
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

      // Estado optimista - cambiar inmediatamente
      const newFavoritedState = !isFavorited;
      setIsFavorited(newFavoritedState);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Reducir timeout a 5 segundos

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
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        // Confirmar el estado del servidor
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
      } else if (response.status === 401) {
        // Usuario no autenticado, redirigir a login
        setIsFavorited(false); // Revertir estado optimista
        window.location.href = '/login';
      } else {
        // Error del servidor, revertir estado optimista
        setIsFavorited(!newFavoritedState);
        throw new Error('Error al actualizar favoritos');
      }
    } catch (error) {
      // Revertir estado optimista en caso de error
      setIsFavorited(!isFavorited);
      
      if (error.name === 'AbortError') {
        if (window.showToast) {
          window.showToast('La operación tardó demasiado, intenta de nuevo', 'error');
        }
      } else {
        if (window.showToast) {
          window.showToast('Error al actualizar favoritos', 'error');
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