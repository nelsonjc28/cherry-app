import { useState, useEffect } from 'react';
import ProductGrid from '../../ProductGrid/ProductGrid';
import ProductSlider from '../../ProductSlider/ProductSlider';
import { getFeaturedProducts } from '../../../api/cherryApi';
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
  const [loading, setLoading] = useState(true);

  // Load products from API if useApi is true
  useEffect(() => {
    if (useApi) {
      const loadProducts = async () => {
        setLoading(true);
        try {
          const productsData = await getFeaturedProducts(8);
          setApiProducts(productsData);
        } catch (error) {
  
          setApiProducts([]);
        } finally {
          setLoading(false);
        }
      };

      loadProducts();
    } else {
      setLoading(false);
    }
  }, [useApi]);

  // Use API products if available, otherwise use passed products
  const displayProducts = useApi ? apiProducts : products;

  // Handle favorite toggle callback
  const handleFavoriteToggle = (productId, isFavorited) => {

    // Here you would typically update your favorites state/API
  };

  if (loading) {
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

  return (
    <section className={`featured-products ${className}`}>
      <div className="container">

        {/* Desktop Grid */}
        <div className="desktop-view">
          <ProductGrid 
            title={title}
            viewAllLink={viewAllLink}
            viewAllText={viewAllText}
            products={displayProducts}
            onFavoriteToggle={handleFavoriteToggle}
            showTitle={false}
            showViewAll={false}
          />
        </div>
        
        {/* Mobile Slider */}
        <div className="mobile-view">
          <ProductSlider 
            products={displayProducts}
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