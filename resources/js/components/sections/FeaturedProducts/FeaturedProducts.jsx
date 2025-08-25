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

  // Función para obtener calificaciones de productos desde la BD
  const fetchProductRatings = async (productIds) => {
    try {
      const ratingsPromises = productIds.map(async (productId) => {
        try {
          const response = await fetch(`/api/ratings/product?product_id=${productId}`);
          if (response.ok) {
            const data = await response.json();
            return {
              productId,
              rating: data.average_rating || 0
            };
          }
          return { productId, rating: 0 };
        } catch (error) {
          return { productId, rating: 0 };
        }
      });

      const ratings = await Promise.all(ratingsPromises);
      const ratingsMap = {};
      ratings.forEach(({ productId, rating }) => {
        ratingsMap[productId] = rating;
      });
      
      return ratingsMap;
    } catch (error) {
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
          const productsWithRatings = productsData.map(product => ({
            ...product,
            rating: ratings[product.id] || 0 // Si no hay calificación, usar 0 (estrellas vacías)
          }));
          
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
            <p>Cargando productos destacados...</p>
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
          />
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts; 