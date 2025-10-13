import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { favoriteService } from '../services/api';
import useUserStore from '../store/userStore';

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
  const loadingRef = useRef(false);
  const { isAdmin } = useUserStore();

  // Cargar todos los favoritos solo cuando sea necesario
  const loadFavorites = useCallback(async () => {
    if (hasLoaded.current || loadingRef.current) return;

    try {
      const token = localStorage.getItem('token');
      if (!token || isAdmin()) {
        setInitialized(true);
        return;
      }

      loadingRef.current = true;
      setLoading(true);
      const response = await favoriteService.getAll();
      
      if (response.data.success) {
        const favoritesSet = new Set(
          response.data.favorite_product_ids || []
        );
        setFavorites(favoritesSet);
      } else {
        // Error en respuesta de favoritos - no mostrar toast
      }
    } catch (error) {
      // Error al cargar favoritos - no mostrar toast
    } finally {
      setLoading(false);
      setInitialized(true);
      hasLoaded.current = true;
      loadingRef.current = false;
    }
  }, [isAdmin]); // Solo depender de isAdmin

  // Cargar favoritos automáticamente cuando el usuario esté autenticado
  useEffect(() => {
    const checkAndLoadFavorites = () => {
      const token = localStorage.getItem('token');
      
      // No cargar favoritos si es admin
      if (token && !hasLoaded.current && !isAdmin()) {
        loadFavorites();
      }
    };

    // Cargar inmediatamente si hay token
    checkAndLoadFavorites();

    // Escuchar cambios en el localStorage (cuando el usuario hace login/logout)
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        if (e.newValue) {
          // Usuario hizo login - solo cargar si no es admin
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
  }, [isAdmin, loadFavorites]); // Agregar dependencias necesarias

  // Verificar si un producto está en favoritos
  const isFavorited = useCallback((productId) => {
    if (!favorites || !(favorites instanceof Set)) {
      return false;
    }
    return favorites.has(productId);
  }, [favorites]);

  // Toggle favorito
  const toggleFavorite = useCallback(async (productId, productData) => {
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
      
      if (response.data.is_favorited !== expectedFavorited) {
        await loadFavorites();
      }

      return response.data.is_favorited;
    } catch (error) {
      // Revertir en caso de error
      const currentFavorites = favorites instanceof Set ? favorites : new Set();
      setFavorites(currentFavorites);
      throw error;
    }
  }, [favorites, loadFavorites]);

  // Función para recargar favoritos (útil para sincronización)
  const reloadFavorites = useCallback(async () => {
    hasLoaded.current = false;
    await loadFavorites();
  }, [loadFavorites]);

  // Función para verificar múltiples productos de una vez
  const checkMultipleFavorites = useCallback(async (productIds) => {
    if (!productIds || productIds.length === 0) return {};
    
    try {
      const token = localStorage.getItem('token');
      if (!token || isAdmin()) return {};
      
      // Si no se han cargado los favoritos, cargarlos primero
      if (!hasLoaded.current) {
        await loadFavorites();
      }
      
      // Crear un mapa de favoritos para respuesta rápida
      const favoritesMap = {};
      productIds.forEach(id => {
        favoritesMap[id] = favorites.has(id);
      });
      
      return favoritesMap;
    } catch (error) {
      console.error('Error checking multiple favorites:', error);
      return {};
    }
  }, [favorites, loadFavorites, isAdmin]);

  const value = {
    favorites,
    loading,
    initialized,
    isFavorited,
    toggleFavorite,
    loadFavorites,
    reloadFavorites,
    checkMultipleFavorites
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}; 
