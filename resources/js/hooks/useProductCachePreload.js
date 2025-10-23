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
        console.log('✅ Caché ya disponible, skip precarga');
        setPreloadStatus({
          isPreloading: false,
          isComplete: true,
          productsCount: cacheInfo.productsCount,
          error: null
        });
        return;
      }

      console.log('🚀 Iniciando precarga de productos...');
      setPreloadStatus(prev => ({ ...prev, isPreloading: true }));

      try {
        const products = await productCache.getAllProducts();
        
        console.log('✅ Precarga completa:', products.length, 'productos');
        setPreloadStatus({
          isPreloading: false,
          isComplete: true,
          productsCount: products.length,
          error: null
        });
      } catch (error) {
        console.error('❌ Error en precarga:', error);
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






