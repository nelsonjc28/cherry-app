import { useState, useEffect, useCallback } from 'react';
import { useFavoritesContext } from '../contexts/FavoritesContext';

/**
 * Hook para verificar múltiples productos favoritos de una sola vez
 * @param {Array} productIds - Array de IDs de productos a verificar
 * @returns {Object} - Objeto con el estado de favoritos de cada producto
 */
export const useMultipleFavorites = (productIds = []) => {
  const { checkMultipleFavorites, initialized } = useFavoritesContext();
  const [favoritesMap, setFavoritesMap] = useState({});
  const [loading, setLoading] = useState(false);

  const checkFavorites = useCallback(async () => {
    if (!productIds || productIds.length === 0 || !initialized) {
      setFavoritesMap({});
      return;
    }

    setLoading(true);
    try {
      const result = await checkMultipleFavorites(productIds);
      setFavoritesMap(result);
    } catch (error) {
      console.error('Error checking multiple favorites:', error);
      setFavoritesMap({});
    } finally {
      setLoading(false);
    }
  }, [productIds, checkMultipleFavorites, initialized]);

  useEffect(() => {
    checkFavorites();
  }, [checkFavorites]);

  // Función para verificar si un producto específico está en favoritos
  const isFavorited = useCallback((productId) => {
    return favoritesMap[productId] || false;
  }, [favoritesMap]);

  return {
    favoritesMap,
    loading,
    isFavorited,
    refetch: checkFavorites
  };
};

export default useMultipleFavorites;












