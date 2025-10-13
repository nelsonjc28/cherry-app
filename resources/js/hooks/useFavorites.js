import { useState, useEffect, useCallback } from 'react';
import { favoriteService } from '../services/api';
import useUserStore from '../store/userStore';

export const useFavorites = () => {
  const [favoriteProductIds, setFavoriteProductIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAdmin } = useUserStore();

  const fetchFavorites = useCallback(async () => {
    // No cargar favoritos si es admin
    if (isAdmin()) {
      setFavoriteProductIds([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await favoriteService.getAll();
      const favoriteIds = response.data.favorite_product_ids || [];
      setFavoriteProductIds(favoriteIds);
      
    } catch (error) {
      // En caso de error, no mostrar mensaje, solo array vacío
      setFavoriteProductIds([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const addToFavorites = useCallback(async (productId, productData) => {
    try {
      await favoriteService.add({
        product_id: productId,
        ...productData
      });
      
      setFavoriteProductIds(prev => [...prev, productId]);
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const removeFromFavorites = useCallback(async (productId) => {
    try {
      await favoriteService.remove(productId);
      setFavoriteProductIds(prev => prev.filter(id => id !== productId));
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const toggleFavorite = useCallback(async (productId, productData) => {
    const isFavorited = favoriteProductIds.includes(productId);
    
    if (isFavorited) {
      return await removeFromFavorites(productId);
    } else {
      return await addToFavorites(productId, productData);
    }
  }, [favoriteProductIds, addToFavorites, removeFromFavorites]);

  const isFavorited = useCallback((productId) => {
    return favoriteProductIds.includes(productId);
  }, [favoriteProductIds]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]); // Depender de fetchFavorites que ya tiene isAdmin

  return {
    favoriteProductIds,
    loading,
    error,
    fetchFavorites,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorited
  };
};



































