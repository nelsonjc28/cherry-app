import { useState, useEffect } from 'react';
import ProductGrid from '../../ProductGrid/ProductGrid';
import ProductSlider from '../../ProductSlider/ProductSlider';
import { useExternalApiContext } from '../../../contexts/ExternalApiContext';
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
  const { getRandomProductsCached, loading, error } = useExternalApiContext();
  const [apiProducts, setApiProducts] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);

  // Función para obtener calificaciones de productos desde la BD en una sola petición
  const fetchProductRatings = async (productIds) => {
    try {
      const response = await fetch('/api/products/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_ids: productIds })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.ratings) {
          return data.data.ratings;
        }
      }
      return {};
    } catch (error) {
      console.error('Error al obtener calificaciones:', error);
      return {};
    }
  };

  // Cargar productos desde la API si useApi es true
  useEffect(() => {
    const loadRandomProducts = async () => {
      try {
        setLocalLoading(true);
        
        const productsData = await getRandomProductsCached(4); // Cambio de 6 a 4 productos
        
        if (productsData && productsData.length > 0) {
          // Obtener calificaciones de la BD para los productos de la API externa
          const productIds = productsData.map(product => product.id);
          const ratings = await fetchProductRatings(productIds);
          
          // Actualizar productos con las calificaciones reales
          const productsWithRatings = productsData.map(product => {
            const localRating = ratings[product.id];
            const finalRating = localRating?.average || 0;
            const finalRatingCount = localRating?.count || 0;
            
            return {
              ...product,
              // Incluir rating y ratingCount si existen en la base de datos local
              rating: finalRating,
              ratingCount: finalRatingCount
            };
          });
          
          setApiProducts(productsWithRatings.slice(0, 4)); // Asegurar solo 4 productos
        } else {
          // Si no hay productos de la API, mostrar array vacío
          setApiProducts([]);
        }
      } catch (error) {
        setApiProducts([]);
      } finally {
        setLocalLoading(false);
      }
    };

    if (useApi) {
      loadRandomProducts();
    } else {
      setApiProducts(products);
      setLocalLoading(false);
    }
  }, []); // SOLO se ejecuta una vez al montar el componente

  const handleFavoriteToggle = (productId) => {
    // Here you would typically update your favorites state/API
  };

  if (localLoading) {
    return (
      <section className={`featured-products ${className}`}>
        <div className="container">
          <div className="loading-spinner">
            <p>Cargando productos más vendidos...</p>
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
          />
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts; 
