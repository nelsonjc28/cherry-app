import { useState, useEffect, useCallback } from 'react';
import { getCachedProducts, saveProductsToCache, isCacheExpired } from '../utils/productCache';

/**
 * Hook personalizado para cargar productos con sistema de caché
 * @param {Function} fetchFunction - Función para obtener productos de la API
 * @param {Array} dependencies - Dependencias para recargar productos
 * @returns {Object} - Estado de productos, loading y funciones
 */
const useProductsWithCache = (fetchFunction, dependencies = []) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadedFromCache, setLoadedFromCache] = useState(false);

  /**
   * Cargar productos con estrategia de caché
   */
  const loadProducts = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      // Estrategia: Cache-First con Background Refresh
      
      // 1. Intentar cargar desde caché primero
      if (!forceRefresh) {
        const cachedProducts = await getCachedProducts();
        
        if (cachedProducts && cachedProducts.length > 0) {
          console.log('⚡ Cargando productos desde caché (instantáneo)');
          setProducts(cachedProducts);
          setLoadedFromCache(true);
          setLoading(false);

          // Verificar si el caché está expirado en background
          const expired = await isCacheExpired();
          
          if (expired) {
            console.log('🔄 Caché expirado, actualizando en background...');
            // Actualizar en background sin mostrar loading
            try {
              const freshProducts = await fetchFunction();
              if (freshProducts && freshProducts.length > 0) {
                await saveProductsToCache(freshProducts);
                setProducts(freshProducts);
                console.log('✅ Caché actualizado en background');
              }
            } catch (bgError) {
              console.warn('⚠️ Error al actualizar caché en background:', bgError);
              // No mostramos error porque ya tenemos datos del caché
            }
          }

          return; // Terminar aquí porque ya cargamos desde caché
        }
      }

      // 2. Si no hay caché o se forzó refresh, cargar desde API
      console.log('🌐 Cargando productos desde API...');
      const freshProducts = await fetchFunction();

      if (freshProducts && freshProducts.length > 0) {
        setProducts(freshProducts);
        setLoadedFromCache(false);

        // Guardar en caché para futuras cargas
        await saveProductsToCache(freshProducts);
        console.log('✅ Productos cargados y guardados en caché');
      } else {
        setProducts([]);
      }

    } catch (err) {
      console.error('❌ Error al cargar productos:', err);
      setError(err.message || 'Error al cargar productos');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [fetchFunction]);

  /**
   * Forzar recarga desde API (bypass caché)
   */
  const forceRefresh = useCallback(() => {
    console.log('🔄 Forzando recarga desde API...');
    return loadProducts(true);
  }, [loadProducts]);

  /**
   * Cargar productos al montar o cuando cambien las dependencias
   */
  useEffect(() => {
    loadProducts();
  }, dependencies);

  return {
    products,
    loading,
    error,
    loadedFromCache,
    refresh: forceRefresh,
    reload: loadProducts
  };
};

export default useProductsWithCache;









