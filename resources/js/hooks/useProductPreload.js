import { useEffect, useRef, useState } from 'react';
import { getCachedProducts, saveProductsToCache, isCacheExpired } from '../utils/productCache';
import { publicProductService } from '../services/api';

/**
 * Hook para precargar TODOS los productos en segundo plano
 * Se usa en HomePage para optimizar navegación futura
 */
const useProductPreload = () => {
  const [preloadStatus, setPreloadStatus] = useState({
    isPreloading: false,
    isComplete: false,
    productsCount: 0,
    error: null
  });
  
  const hasPreloaded = useRef(false);

  useEffect(() => {
    // Solo precargar una vez por sesión
    if (hasPreloaded.current) return;
    
    const preloadProducts = async () => {
      try {
        console.log('🚀 Iniciando precarga de productos en segundo plano...');
        setPreloadStatus(prev => ({ ...prev, isPreloading: true }));

        // 1. Verificar si ya tenemos caché válido
        const cacheExpired = await isCacheExpired();
        
        if (!cacheExpired) {
          const cachedProducts = await getCachedProducts();
          if (cachedProducts && cachedProducts.length > 0) {
            console.log(`✅ Ya existe caché válido con ${cachedProducts.length} productos`);
            setPreloadStatus({
              isPreloading: false,
              isComplete: true,
              productsCount: cachedProducts.length,
              error: null
            });
            hasPreloaded.current = true;
            return;
          }
        }

        // 2. Si no hay caché o está expirado, cargar todos los productos
        console.log('📦 Cargando todos los productos desde API...');
        
        // Cargar productos con paginación grande para obtener todos
        const response = await publicProductService.getAll({
          per_page: 10000, // Número alto para obtener todos los productos
          include_variants: true,
          include_images: true
        });

        const allProducts = response.data || [];

        if (allProducts.length > 0) {
          // 3. Guardar en caché
          console.log(`💾 Guardando ${allProducts.length} productos en caché...`);
          await saveProductsToCache(allProducts);
          
          setPreloadStatus({
            isPreloading: false,
            isComplete: true,
            productsCount: allProducts.length,
            error: null
          });
          
          console.log(`✅ Precarga completada: ${allProducts.length} productos en caché`);
        } else {
          console.warn('⚠️ No se encontraron productos para precargar');
          setPreloadStatus({
            isPreloading: false,
            isComplete: false,
            productsCount: 0,
            error: 'No hay productos disponibles'
          });
        }

        hasPreloaded.current = true;

      } catch (error) {
        console.error('❌ Error en precarga de productos:', error);
        setPreloadStatus({
          isPreloading: false,
          isComplete: false,
          productsCount: 0,
          error: error.message
        });
        
        // Marcar como intentado para no reintentar infinitamente
        hasPreloaded.current = true;
      }
    };

    // Ejecutar precarga con un pequeño delay para no bloquear la carga inicial
    const timeoutId = setTimeout(() => {
      preloadProducts();
    }, 1000); // 1 segundo después de cargar la página principal

    return () => clearTimeout(timeoutId);
  }, []);

  return preloadStatus;
};

export default useProductPreload;

