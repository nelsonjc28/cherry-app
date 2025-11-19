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
        setPreloadStatus(prev => ({ ...prev, isPreloading: true }));

        // 1. Verificar si ya tenemos caché válido
        const cacheExpired = await isCacheExpired();
        
        if (!cacheExpired) {
          const cachedProducts = await getCachedProducts();
          if (cachedProducts && cachedProducts.length > 0) {
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
        
        // Obtener TODOS los productos directamente de la API externa (sin filtros de catálogo)
        const CHERRY_API_URL = 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/';
        const response = await axios.get(CHERRY_API_URL);
        const rawProducts = response.data || [];
        
        
        if (rawProducts.length === 0) {
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
        
        const ratingsCache = await getBulkRatings(productIds);
        
        // Mapear productos con ratings
        const mappedProducts = await Promise.all(
          rawProducts.map(product => mapApiProductToAppProduct(product, ratingsCache))
        );
        
        // Filtrar productos nulos
        const allProducts = mappedProducts.filter(p => p !== null);
        
        
        // Aplicar ofertas de usuario a los productos
        const productsWithOffers = await applyUserOffersToProducts(allProducts);

        if (productsWithOffers.length > 0) {
          // 3. Guardar en caché
          await saveProductsToCache(productsWithOffers);
          
          setPreloadStatus({
            isPreloading: false,
            isComplete: true,
            productsCount: productsWithOffers.length,
            error: null
          });
          
        } else {
          setPreloadStatus({
            isPreloading: false,
            isComplete: false,
            productsCount: 0,
            error: 'No hay productos disponibles'
          });
        }

        hasPreloaded.current = true;

      } catch (error) {
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

