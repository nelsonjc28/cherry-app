import { useState, useEffect } from 'react';
import HorizontalProductCarousel from '../HorizontalProductCarousel/HorizontalProductCarousel';
import { getProductImageUrl } from '../../utils/productImageUtils';
import { applyUserOffersToProducts } from '../../api/userOffers';
import { isUserSessionActive } from '../../api/cherryApi';
import useRecentProductsStore from '../../store/recentProductsStore';
import useUserStore from '../../store/userStore';
import productCache from '../../utils/productCacheInMemory';
import api from '../../services/api';
import { isProductNewLikeNuevosPage } from '../../utils/productNewRules';
import './RecentlyViewedSection.css';

const RecentlyViewedSection = ({ currentProductId }) => {
  const { user } = useUserStore();
  const { recentProductIds, loading: storeLoading, fetchRecentProducts } = useRecentProductsStore();
  const [products, setProducts] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar IDs de productos recientes cuando se monte el componente o cuando el usuario cambie
  useEffect(() => {
    // Solo intentar cargar si hay usuario autenticado
    if (user) {
      fetchRecentProducts();
    } else {
      // Si no hay usuario, limpiar productos
      setProducts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Ejecutar cuando el usuario cambie

  // Debug: Log para verificar estado
  useEffect(() => {
    console.log('[RecentlyViewedSection] Estado:', {
      hasUser: !!user,
      userId: user?.id,
      storeLoading,
      recentProductIdsCount: recentProductIds.length,
      productsCount: products.length,
      currentProductId
    });
  }, [user, storeLoading, recentProductIds, products, currentProductId]);

  // Cargar productos desde caché cuando cambien los IDs
  useEffect(() => {
    console.log('[RecentlyViewedSection] useEffect ejecutado:', {
      storeLoading,
      recentProductIdsCount: recentProductIds.length,
      currentProductId
    });

    const loadProductsFromCache = async () => {
      // Si está cargando el store, esperar
      if (storeLoading) {
        console.log('[RecentlyViewedSection] Store aún cargando, esperando...');
        return;
      }

      // Si no hay IDs, limpiar y salir
      if (recentProductIds.length === 0) {
        console.log('[RecentlyViewedSection] No hay IDs de productos recientes');
        setProducts([]);
        setLocalLoading(false);
        return;
      }

      // Filtrar el producto actual
      const filteredIds = recentProductIds.filter(id => String(id) !== String(currentProductId));
      
      console.log('[RecentlyViewedSection] Cargando desde caché:', {
        recentProductIdsCount: recentProductIds.length,
        currentProductId,
        filteredIdsCount: filteredIds.length,
        filteredIds
      });
      
      if (filteredIds.length === 0) {
        console.log('[RecentlyViewedSection] Todos los productos recientes son el producto actual, no se muestra');
        setProducts([]);
        setLocalLoading(false);
        return;
      }

      try {
        setLocalLoading(true);
        setError(null);

        // Primero intentar obtener desde el caché en memoria
        let allProducts = await productCache.getAllProducts();
        
        console.log('[RecentlyViewedSection] Productos en caché:', allProducts?.length || 0);
        
        // Si no hay productos en caché, obtener desde el backend
        if (!allProducts || !Array.isArray(allProducts) || allProducts.length === 0) {
          console.log('[RecentlyViewedSection] Caché vacío, obteniendo productos desde backend...');
          
          // Obtener productos individuales por ID desde el backend
          try {
            const productsPromises = filteredIds.map(id => 
              api.get(`/products/${id}`)
                .then(res => {
                  if (res.data.success && res.data.data) {
                    return res.data.data;
                  }
                  return null;
                })
                .catch(err => {
                  console.error(`[RecentlyViewedSection] Error al obtener producto ${id}:`, err);
                  return null;
                })
            );
            
            const individualProducts = await Promise.all(productsPromises);
            allProducts = individualProducts.filter(Boolean);
            
            console.log('[RecentlyViewedSection] Productos obtenidos desde backend:', allProducts.length);
            
            if (!Array.isArray(allProducts) || allProducts.length === 0) {
              console.log('[RecentlyViewedSection] No se pudieron obtener productos desde backend');
              setProducts([]);
              setLocalLoading(false);
              return;
            }
          } catch (backendError) {
            console.error('[RecentlyViewedSection] Error al obtener productos desde backend:', backendError);
            setProducts([]);
            setLocalLoading(false);
            return;
          }
        }
        
        // Asegurar que allProducts sea un array
        if (!Array.isArray(allProducts)) {
          console.error('[RecentlyViewedSection] allProducts no es un array:', typeof allProducts, allProducts);
          setProducts([]);
          setLocalLoading(false);
          return;
        }

        // Filtrar productos que están en la lista de vistos recientemente
        // Mantener el orden de más reciente a menos reciente
        const recentlyViewedProducts = filteredIds
          .map(id => {
            // Buscar el producto en el caché o productos obtenidos
            const product = allProducts.find(p => 
              String(p.id || p.id_articulo || '') === String(id)
            );
            if (!product) {
              console.log('[RecentlyViewedSection] Producto no encontrado:', id);
            }
            return product;
          })
          .filter(Boolean) // Eliminar productos no encontrados
          .slice(0, 10); // Limitar a 10 productos

        console.log('[RecentlyViewedSection] Productos encontrados:', recentlyViewedProducts.length);

        if (recentlyViewedProducts.length === 0) {
          console.log('[RecentlyViewedSection] No se encontraron productos para los IDs filtrados');
          setProducts([]);
          setLocalLoading(false);
          return;
        }

        // Aplicar ofertas de usuario si hay sesión activa
        let productsWithOffers = recentlyViewedProducts;
        const hasActiveSession = isUserSessionActive();
        
        if (hasActiveSession && productsWithOffers.length > 0) {
          productsWithOffers = await applyUserOffersToProducts(recentlyViewedProducts);
        }

        // Mapear productos al formato esperado por ProductGrid/ProductSlider
        const mappedProducts = productsWithOffers.map(product => {
          const productId = product.id || product.id_articulo || '';
          
          // Calcular precio final
          const basePrice = product.precio1 || product.price || 0;
          let finalPrice = basePrice;
          let originalPrice = null;
          let discountPercentage = 0;

          // Aplicar descuentos si existen
          if (product.userOffer && product.userOffer.discount_percentage > 0) {
            discountPercentage = product.userOffer.discount_percentage;
            originalPrice = basePrice;
            finalPrice = basePrice - (basePrice * (discountPercentage / 100));
          } else if (product.desc_promo && product.desc_promo > 0) {
            discountPercentage = Math.max(0, product.desc_promo - 10);
            if (discountPercentage > 0) {
              originalPrice = basePrice;
              finalPrice = basePrice - (basePrice * (discountPercentage / 100));
            }
          }

          // Extraer colores y tallas
          const colors = product.colors || product.colores || [];
          const sizes = product.sizes || [];

          // Obtener detalles si existen
          const detalles = product.detalles || [];
          const productColors = detalles.length > 0 
            ? [...new Set(detalles.map(d => d.nombreColor).filter(Boolean))]
            : colors;
          const productSizes = detalles.length > 0
            ? [...new Set(detalles.map(d => d.detalle).filter(Boolean))]
            : sizes;

          const isNewProduct = isProductNewLikeNuevosPage(product);

          return {
            id: productId,
            id_articulo: productId,
            title: product.descripcion || product.title || 'Sin nombre',
            description: product.descripcion || 'Sin descripción',
            price: finalPrice,
            originalPrice: originalPrice,
            discount: discountPercentage,
            image: getProductImageUrl(productId, 1),
            brand: product.marca || 'Sin marca',
            stock: product.inventario || 0,
            inventario: product.inventario || 0,
            colors: productColors.length > 0 ? productColors : ['black'],
            colores: productColors,
            sizes: productSizes.length > 0 ? productSizes : ['M'],
            tallas: productSizes,
            isNew: isNewProduct,
            rating: product.rating || 0,
            ratingCount: product.ratingCount || product.totalRatings || 0,
            id_linea: product.id_linea || product.linea,
            category_id: product.id_linea || product.linea,
            catalogoId: product.catalogoId || product.catalog || null,
            catalog: product.catalogoId || product.catalog || null,
            fecha_alta: product.fecha_alta,
            fechaAlta: product.fecha_alta,
            fecha_compra: product.fecha_compra ?? product.fechaCompra,
            fechaCompra: product.fecha_compra ?? product.fechaCompra,
            opcNuevo: product.opc_nuevo,
            opcPromo: product.opc_promo,
            descPromo: product.desc_promo,
            codigo: productId,
            detalles: detalles,
            linea: product.id_linea,
            precio1: finalPrice,
            userOffer: product.userOffer || null,
            hasUserOffer: Boolean(product.userOffer)
          };
        });

        setProducts(mappedProducts);
      } catch (err) {
        setError(err.message || 'Error al cargar productos');
        setProducts([]);
      } finally {
        setLocalLoading(false);
      }
    };

    // Ejecutar la función de carga
    loadProductsFromCache();
  }, [recentProductIds, currentProductId, storeLoading]);

  // Debug: Verificar por qué no se muestra (DEBE estar antes de los return)
  useEffect(() => {
    console.log('[RecentlyViewedSection] Render check:', {
      hasUser: !!user,
      userId: user?.id,
      storeLoading,
      localLoading,
      recentProductIdsCount: recentProductIds.length,
      productsCount: products.length,
      willRender: !!(user && (products.length > 0 || storeLoading || localLoading))
    });
    
    if (!user) {
      console.log('[RecentlyViewedSection] ❌ No se muestra: Usuario no autenticado');
    } else if (products.length === 0 && !storeLoading && !localLoading) {
      console.log('[RecentlyViewedSection] ❌ No se muestra: No hay productos recientes', {
        userId: user.id,
        recentProductIdsCount: recentProductIds.length,
        productsCount: products.length
      });
    } else {
      console.log('[RecentlyViewedSection] ✅ Se mostrará la sección');
    }
  }, [user, products, storeLoading, localLoading, recentProductIds]);

  const handleFavoriteToggle = (productId) => {
    // Implementar lógica de favoritos si es necesario
  };

  // No mostrar si no hay usuario autenticado
  if (!user) {
    return null;
  }

  // No mostrar si está cargando o no hay productos
  if (storeLoading || localLoading) {
    return (
      <section className="recently-viewed-section">
        <div className="container">
          <div className="loading-spinner">
            <p>Cargando productos vistos recientemente...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="recently-viewed-section">
        <div className="container">
          <div className="error-message">
            <p>Error al cargar productos: {error}</p>
          </div>
        </div>
      </section>
    );
  }

  // No mostrar si no hay productos y ya terminó de cargar
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="recently-viewed-section">
      <div className="container">
        <HorizontalProductCarousel
          title="Vistos Recientemente"
          viewAllLink="/catalogo"
          viewAllText="Ver Más"
          products={products}
          onFavoriteToggle={handleFavoriteToggle}
          showTitle={true}
          showViewAll={false}
          showFavoriteButton={false}
          variant="bestseller"
          useCatalogCard={true}
        />
      </div>
    </section>
  );
};

export default RecentlyViewedSection;
