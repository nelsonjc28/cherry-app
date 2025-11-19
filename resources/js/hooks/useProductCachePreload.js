import { useEffect, useState } from 'react';
import productCache from '../utils/productCacheInMemory';

/**
 * Hook para precargar productos en segundo plano
 * 
 * Uso: En HomePage para iniciar la descarga de productos en background
 * mientras el usuario ve el contenido principal
 */
const useProductCachePreload = () => {
  const [preloadStatus, setPreloadStatus] = useState({
    isPreloading: false,
    isComplete: false,
    productsCount: 0,
    error: null
  });

  useEffect(() => {
    const preloadProducts = async () => {
      // Si ya hay caché válido, no precargar
      const cacheInfo = productCache.getCacheInfo();
      if (cacheInfo.isValid) {
        setPreloadStatus({
          isPreloading: false,
          isComplete: true,
          productsCount: cacheInfo.productsCount,
          error: null
        });
        return;
      }

      setPreloadStatus(prev => ({ ...prev, isPreloading: true }));

      try {
        const products = await productCache.getAllProducts();
        
        setPreloadStatus({
          isPreloading: false,
          isComplete: true,
          productsCount: products.length,
          error: null
        });
      } catch (error) {
        setPreloadStatus({
          isPreloading: false,
          isComplete: false,
          productsCount: 0,
          error: error.message
        });
      }
    };

    // Iniciar precarga después de un pequeño delay para no bloquear render inicial
    const timeoutId = setTimeout(preloadProducts, 500);

    return () => clearTimeout(timeoutId);
  }, []);

  return preloadStatus;
};

export default useProductCachePreload;








