import { useState, useEffect } from 'react';
import ProductGrid from '../../ProductGrid/ProductGrid';
import ProductSlider from '../../ProductSlider/ProductSlider';
import api from '../../../services/api';
import { getProductImageUrl } from '../../../utils/productImageUtils';
import { applyUserOffersToProducts } from '../../../api/userOffers';
import './FeaturedProducts.css';

const FeaturedProducts = ({ 
  title = "Productos diseñados para reflejar tu estilo y personalidad.",
  products = [],
  viewAllLink = "/productos",
  viewAllText = "Ver Más",
  showViewAllButton = true,
  className = "",
  useApi = true
}) => {
  const [apiProducts, setApiProducts] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar productos nuevos desde la base de datos local
  useEffect(() => {
    const loadNewProducts = async () => {
      try {
        setLocalLoading(true);
        setError(null);
        
        if (useApi) {
          // Obtener productos nuevos (últimos 45 días) desde el backend local
          const response = await api.get('/products/new', {
            params: { limit: 4 }
          });
          
          if (response.data.success && response.data.data) {
            // Mapear productos al formato esperado por ProductCard (igual que en CatalogPage y otras páginas)
            const mappedProducts = response.data.data.map(product => {
              // Usar id_articulo o id para construir la URL de imagen desde S3 (igual que ProductCard)
              const productId = product.id_articulo || product.id;
              
              // Si hay imagen válida del backend, usarla; sino construir desde S3
              let imageUrl = null;
              if (product.image && 
                  product.image.trim() !== '' && 
                  !product.image.includes('placeholder') &&
                  !product.image.includes('Rectangle 4922')) {
                imageUrl = product.image;
              } else if (productId) {
                // Construir URL desde S3 usando el ID (igual que ProductCard)
                imageUrl = getProductImageUrl(productId, 1);
              }
              
              // Extraer colores y tallas de arrays o detalles
              const productColors = product.colors || [];
              const availableColors = productColors.length > 0 ? productColors : [];
              
              const productSizes = product.sizes || [];
              const availableSizes = productSizes.length > 0 ? productSizes : [];
              
              // Determinar si es nuevo
              const isNewProduct = product.isNew !== undefined ? product.isNew : 
                (product.opc_nuevo === 'S' || 
                 (product.fecha_alta && new Date(product.fecha_alta) > new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)));
              
              return {
                id: product.id,
                id_articulo: productId,
                title: product.title || product.description || 'Sin nombre',
                description: product.description || 'Sin descripción',
                price: product.price || 0,
                originalPrice: product.originalPrice,
                discount: product.discount || 0,
                image: imageUrl,
                brand: product.brand || 'Sin marca',
                stock: product.stock || product.inventario || 0,
                inventario: product.inventario || product.stock || 0,
                colors: availableColors,
                colores: productColors,
                sizes: availableSizes,
                tallas: productSizes,
                isNew: isNewProduct,
                rating: product.rating || 0,
                ratingCount: product.ratingCount || 0,
                id_linea: product.id_linea,
                category_id: product.category_id || product.id_linea,
                catalogoId: product.catalogoId,
                fecha_alta: product.fecha_alta,
                fechaAlta: product.fecha_alta,
                opcNuevo: product.opc_nuevo,
                opcPromo: product.opc_promo,
                descPromo: product.desc_promo,
                codigo: productId,
                detalles: product.detalles || [],
                linea: product.id_linea,
                precio1: product.price || 0
              };
            });
            
            // Aplicar ofertas de usuario (igual que en otras páginas)
            const productsWithOffers = await applyUserOffersToProducts(mappedProducts);
            
            setApiProducts(productsWithOffers);
          } else {
            setApiProducts([]);
          }
        } else {
          setApiProducts(products);
        }
      } catch (err) {
        console.error('Error cargando productos nuevos:', err);
        setError(err.message || 'Error al cargar productos');
        setApiProducts([]);
      } finally {
        setLocalLoading(false);
      }
    };

    loadNewProducts();
  }, [useApi]); // Se ejecuta cuando useApi cambia

  const handleFavoriteToggle = (productId) => {
    // Here you would typically update your favorites state/API
  };

  if (localLoading) {
    return (
      <section className={`featured-products ${className}`}>
        <div className="container">
          <div className="loading-spinner">
            <p>Cargando productos nuevos...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={`featured-products ${className}`}>
        <div className="container">
          <div className="error-message">
            <p>Error al cargar productos: {error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`featured-products ${className}`}>
      <div className="container">

        {/* Desktop Grid */}
        <div className="desktop-view">
          <ProductGrid 
            title={title}
            viewAllLink={viewAllLink}
            viewAllText={viewAllText}
            products={apiProducts}
            onFavoriteToggle={handleFavoriteToggle}
            showTitle={false}
            showViewAll={false}
            showFavoriteButton={false}
            variant="bestseller"
          />
        </div>
        
        {/* Mobile Slider */}
        <div className="mobile-view">
          <ProductSlider 
            products={apiProducts}
            onFavoriteToggle={handleFavoriteToggle}
            showTitle={false}
            showViewAll={false}
            slidesPerView={{ desktop: 4, tablet: 2, mobile: 1.2 }}
            showFavoriteButton={false}
            variant="bestseller"
          />
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts; 
