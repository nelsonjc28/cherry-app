import { useEffect, useRef, useState } from 'react';
import { getCachedProducts, saveProductsToCache, isCacheExpired } from '../utils/productCache';
import { mapApiProductToAppProduct, getBulkRatings } from '../api/cherryApi';
import { applyUserOffersToProducts } from '../api/userOffers';
import axios from 'axios';

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

        // 2. Si no hay caché o está expirado, cargar TODOS los productos sin filtros
        console.log('📦 Cargando TODOS los productos desde API externa sin filtros...');
        
        // Obtener TODOS los productos directamente de la API externa (sin filtros de catálogo)
        const CHERRY_API_URL = 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/';
        const response = await axios.get(CHERRY_API_URL);
        const rawProducts = response.data || [];
        
        console.log(`📦 ${rawProducts.length} productos crudos obtenidos de API externa`);
        
        if (rawProducts.length === 0) {
          console.warn('⚠️ No se obtuvieron productos de la API externa');
          setPreloadStatus({
            isPreloading: false,
            isComplete: false,
            productsCount: 0,
            error: 'No hay productos disponibles'
          });
          hasPreloaded.current = true;
          return;
        }
        
        // Obtener IDs de productos para ratings en bulk
        const productIds = rawProducts.map(product => 
          product.id_articulo || product.id || product.codigo
        ).filter(Boolean);
        
        console.log('⭐ Obteniendo ratings para productos...');
        const ratingsCache = await getBulkRatings(productIds);
        
        // Mapear productos con ratings
        console.log('🔄 Mapeando productos con ratings...');
        const mappedProducts = await Promise.all(
          rawProducts.map(product => mapApiProductToAppProduct(product, ratingsCache))
        );
        
        // Filtrar productos nulos
        const allProducts = mappedProducts.filter(p => p !== null);
        
        console.log(`✅ ${allProducts.length} productos mapeados exitosamente`);
        
        // Aplicar ofertas de usuario a los productos
        console.log('💰 Aplicando ofertas personalizadas...');
        const productsWithOffers = await applyUserOffersToProducts(allProducts);

        if (productsWithOffers.length > 0) {
          // 3. Guardar en caché
          console.log(`💾 Guardando ${productsWithOffers.length} productos en caché...`);
          await saveProductsToCache(productsWithOffers);
          
          setPreloadStatus({
            isPreloading: false,
            isComplete: true,
            productsCount: productsWithOffers.length,
            error: null
          });
          
          console.log(`✅ Precarga completada: ${productsWithOffers.length} productos en caché`);
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

