import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { favoriteService } from '../services/api';

const FavoritesContext = createContext();

export const useFavoritesContext = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavoritesContext must be used within a FavoritesProvider');
  }
  return context;
};

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const hasLoaded = useRef(false);

  // Cargar favoritos automáticamente cuando el usuario esté autenticado
  useEffect(() => {
    const checkAndLoadFavorites = () => {
      const token = localStorage.getItem('token');
      if (token && !hasLoaded.current) {
        loadFavorites();
      }
    };

    // Cargar inmediatamente si hay token
    checkAndLoadFavorites();

    // Escuchar cambios en el localStorage (cuando el usuario hace login/logout)
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        if (e.newValue) {
          // Usuario hizo login
          hasLoaded.current = false;
          checkAndLoadFavorites();
        } else {
          // Usuario hizo logout
          setFavorites(new Set());
          setInitialized(true);
          hasLoaded.current = true;
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // También escuchar eventos personalizados para cambios de token
    const handleTokenChange = () => {
      hasLoaded.current = false;
      checkAndLoadFavorites();
    };

    window.addEventListener('tokenChanged', handleTokenChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tokenChanged', handleTokenChange);
    };
  }, []);

  // Cargar todos los favoritos solo cuando sea necesario
  const loadFavorites = async () => {
    if (hasLoaded.current) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setInitialized(true);
        return;
      }

      setLoading(true);
      const response = await favoriteService.getAll();
      
      if (response.data.success) {
        const favoritesSet = new Set(
          response.data.favorites.map(fav => fav.product_id)
        );
        console.log('✅ Favoritos cargados exitosamente:', Array.from(favoritesSet));
        console.log('📊 Total de favoritos:', favoritesSet.size);
        setFavorites(favoritesSet);
      } else {
        console.error('❌ Error en respuesta de favoritos:', response.data);
      }
    } catch (error) {
      console.error('Error al cargar favoritos:', error);
      if (window.showToast) {
        window.showToast('Error al cargar favoritos', 'error');
      }
    } finally {
      setLoading(false);
      setInitialized(true);
      hasLoaded.current = true;
    }
  };

  // Verificar si un producto está en favoritos
  const isFavorited = (productId) => {
    if (!favorites || !(favorites instanceof Set)) {
      return false;
    }
    return favorites.has(productId);
  };

  // Toggle favorito
  const toggleFavorite = async (productId, productData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      // Cargar favoritos si no se han cargado aún
      if (!hasLoaded.current) {
        await loadFavorites();
      }

      const { product_title, product_image, product_price } = productData;
      
      // Asegurar que favorites sea un Set válido
      const currentFavorites = favorites instanceof Set ? favorites : new Set();
      const currentFavorited = currentFavorites.has(productId);
      
      // Optimistic update
      const newFavorites = new Set(currentFavorites);
      if (currentFavorited) {
        newFavorites.delete(productId);
      } else {
        newFavorites.add(productId);
      }
      setFavorites(newFavorites);

      const response = await favoriteService.toggle({
        product_id: productId,
        product_title,
        product_image,
        product_price
      });

      if (!response.data.success) {
        // Revertir si falló
        setFavorites(currentFavorites);
        throw new Error('Error al actualizar favoritos');
      }

      // Verificar que el estado esté correcto después de la operación
      const expectedFavorited = !currentFavorited;
      console.log(`🔄 Toggle favorito: ${currentFavorited} -> ${expectedFavorited}`);
      console.log(`📡 Respuesta del servidor: ${response.data.is_favorited}`);
      
      if (response.data.is_favorited !== expectedFavorited) {
        console.warn('⚠️ Estado de favorito no coincide, recargando...');
        await loadFavorites();
      } else {
        console.log('✅ Estado de favorito sincronizado correctamente');
      }

      return response.data.is_favorited;
    } catch (error) {
      // Revertir en caso de error
      const currentFavorites = favorites instanceof Set ? favorites : new Set();
      setFavorites(currentFavorites);
      throw error;
    }
  };

  // Función para recargar favoritos (útil para sincronización)
  const reloadFavorites = async () => {
    hasLoaded.current = false;
    await loadFavorites();
  };

  const value = {
    favorites,
    loading,
    initialized,
    isFavorited,
    toggleFavorite,
    loadFavorites,
    reloadFavorites
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}; 