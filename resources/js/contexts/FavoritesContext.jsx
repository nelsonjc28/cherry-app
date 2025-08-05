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
        setFavorites(favoritesSet);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      // Asegurar que favorites siempre sea un Set válido
      setFavorites(new Set());
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

      return response.data.is_favorited;
    } catch (error) {
      // Revertir en caso de error
      const currentFavorites = favorites instanceof Set ? favorites : new Set();
      setFavorites(currentFavorites);
      throw error;
    }
  };

  const value = {
    favorites,
    loading,
    initialized,
    isFavorited,
    toggleFavorite,
    loadFavorites
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}; 