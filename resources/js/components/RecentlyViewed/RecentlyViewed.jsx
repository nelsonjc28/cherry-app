import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CatalogProductCard from '../CatalogProductCard/CatalogProductCard';
import { getRecentlyViewedIds } from '../../utils/recentlyViewed';
import productCache from '../../utils/productCacheInMemory';
import { applyUserOffersToProducts } from '../../api/userOffers';
import { isUserSessionActive } from '../../api/cherryApi';
import { getProductImageUrl } from '../../utils/productImageUtils';
import './RecentlyViewed.css';

const RecentlyViewed = ({ currentProductId }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecentlyViewedProducts = async () => {
      try {
        setLoading(true);
        
        // Obtener IDs de productos vistos recientemente
        const viewedIds = getRecentlyViewedIds();
        
        // Filtrar el producto actual
        const filteredIds = viewedIds.filter(id => id !== currentProductId);
        
        if (filteredIds.length === 0) {
          setProducts([]);
          setLoading(false);
          return;
        }

        // Obtener todos los productos desde el caché en memoria
        const allProducts = await productCache.getAllProducts();
        
        if (!allProducts || allProducts.length === 0) {
          setProducts([]);
          setLoading(false);
          return;
        }

        // Filtrar productos que están en la lista de vistos recientemente
        // Mantener el orden de más reciente a menos reciente
        const recentlyViewedProducts = filteredIds
          .map(id => {
            // Buscar el producto en el caché
            const product = allProducts.find(p => 
              String(p.id || p.id_articulo || '') === String(id)
            );
            return product;
          })
          .filter(Boolean) // Eliminar productos no encontrados
          .slice(0, 10); // Limitar a 10 productos

        if (recentlyViewedProducts.length === 0) {
          setProducts([]);
          setLoading(false);
          return;
        }

        // Aplicar ofertas de usuario si hay sesión activa
        let productsWithOffers = recentlyViewedProducts;
        const hasActiveSession = isUserSessionActive();
        
        if (hasActiveSession && productsWithOffers.length > 0) {
          productsWithOffers = await applyUserOffersToProducts(recentlyViewedProducts);
        }

        // Mapear productos al formato esperado por CatalogProductCard
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

          return {
            id: productId,
            id_articulo: productId,
            title: product.descripcion || product.title || '',
            description: product.descripcion || 'Sin descripción',
            image: getProductImageUrl(productId),
            price: finalPrice,
            originalPrice: originalPrice,
            discount: discountPercentage,
            colors: productColors.length > 0 ? productColors : ['black'],
            sizes: productSizes.length > 0 ? productSizes : ['M'],
            rating: product.rating || 0,
            ratingCount: product.ratingCount || product.totalRatings || 0,
            isNew: product.opc_nuevo === 'S' || product.isNew || false,
            fecha_alta: product.fecha_alta || null,
            fechaAlta: product.fecha_alta || null,
            inventario: product.inventario || 0,
            stock: product.inventario || 0,
            detalles: detalles,
            marca: product.marca || '',
            brand: product.marca || 'Sin marca',
            userOffer: product.userOffer || null,
            hasUserOffer: Boolean(product.userOffer),
            codigo: product.codigo || productId
          };
        });

        setProducts(mappedProducts);
      } catch (error) {
        console.error('Error al cargar productos vistos recientemente:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadRecentlyViewedProducts();
  }, [currentProductId]);

  const handleFavoriteToggle = (productId) => {
    // Implementar lógica de favoritos si es necesario
  };

  // No mostrar si no hay productos o está cargando
  if (loading || products.length === 0) {
    return null;
  }

  return (
    <section className="recently-viewed">
      <div className="container">
        <div className="recently-viewed__header">
          <h2 className="recently-viewed__title">Vistos Recientemente</h2>
        </div>
        <div className="recently-viewed__products">
          {products.map((product) => (
            <CatalogProductCard
              key={product.id || product.id_articulo}
              product={product}
              onFavoriteToggle={handleFavoriteToggle}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecentlyViewed;
