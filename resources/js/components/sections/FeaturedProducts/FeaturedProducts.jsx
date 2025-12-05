import { useState, useEffect } from 'react';
import ProductGrid from '../../ProductGrid/ProductGrid';
import ProductSlider from '../../ProductSlider/ProductSlider';
import api from '../../../services/api';
import { getProductImageUrl } from '../../../utils/productImageUtils';
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
            // Mapear productos al formato esperado por ProductCard
            const mappedProducts = response.data.data.map(product => {
              // Construir URL de imagen usando getProductImageUrl
              const imageUrl = product.image || 
                (product.id ? getProductImageUrl(product.id, 1) : null);
              
              return {
                id: product.id,
                id_articulo: product.id_articulo || product.id,
                title: product.title || product.description,
                description: product.description,
                price: product.price || 0,
                originalPrice: product.originalPrice,
                discount: product.discount || 0,
                image: imageUrl,
                brand: product.brand,
                stock: product.stock || product.inventario || 0,
                inventario: product.inventario || product.stock || 0,
                colors: product.colors || [],
                sizes: product.sizes || [],
                isNew: product.isNew !== undefined ? product.isNew : true,
                rating: product.rating || 0,
                ratingCount: product.ratingCount || 0,
                id_linea: product.id_linea,
                category_id: product.category_id || product.id_linea,
                catalogoId: product.catalogoId,
                fecha_alta: product.fecha_alta
              };
            });
            
            setApiProducts(mappedProducts);
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
