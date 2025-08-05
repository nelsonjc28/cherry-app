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

  // Cargar productos desde la API si useApi es true
  useEffect(() => {
    const loadRandomProducts = async () => {
      try {
        setLocalLoading(true);
        
        const productsData = await getRandomProductsCached(6);
        
        if (productsData && productsData.length > 0) {
          setApiProducts(productsData);
        } else {
          // Datos de prueba temporales mientras diagnosticamos la API
          const testProducts = [
            {
              id: 'TEST001',
              title: 'Vestido Elegante Cherry',
              image: 'https://cherry-fotos.s3.amazonaws.com/shopify/TEST001/TEST001_1.jpg',
              price: 129.00,
              rating: 5,
              description: 'Vestido elegante perfecto para ocasiones especiales',
              brand: 'Cherry',
              category: 'Vestidos',
              colors: ['Negro', 'Rojo'],
              stock: 10,
              isActive: true,
              isNew: true,
              isPromo: false
            },
            {
              id: 'TEST002',
              title: 'Blusa Moderna Cherry',
              image: 'https://cherry-fotos.s3.amazonaws.com/shopify/TEST002/TEST002_1.jpg',
              price: 89.99,
              rating: 4,
              description: 'Blusa moderna para el día a día',
              brand: 'Cherry',
              category: 'Blusas',
              colors: ['Blanco', 'Azul'],
              stock: 15,
              isActive: true,
              isNew: false,
              isPromo: true
            },
            {
              id: 'TEST003',
              title: 'Pantalón Elegante Cherry',
              image: 'https://cherry-fotos.s3.amazonaws.com/shopify/TEST003/TEST003_1.jpg',
              price: 149.00,
              rating: 5,
              description: 'Pantalón que resalta tu figura',
              brand: 'Cherry',
              category: 'Pantalones',
              colors: ['Negro', 'Gris'],
              stock: 8,
              isActive: true,
              isNew: true,
              isPromo: false
            },
            {
              id: 'TEST004',
              title: 'Accesorio Único Cherry',
              image: 'https://cherry-fotos.s3.amazonaws.com/shopify/TEST004/TEST004_1.jpg',
              price: 59.99,
              rating: 4,
              description: 'Accesorio único para completar tu outfit',
              brand: 'Cherry',
              category: 'Accesorios',
              colors: ['Dorado', 'Plateado'],
              stock: 20,
              isActive: true,
              isNew: false,
              isPromo: true
            },
            {
              id: 'TEST005',
              title: 'Suéter Elegante Cherry',
              image: 'https://cherry-fotos.s3.amazonaws.com/shopify/TEST005/TEST005_1.jpg',
              price: 99.00,
              rating: 5,
              description: 'Suéter elegante para el invierno',
              brand: 'Cherry',
              category: 'Suéteres',
              colors: ['Gris', 'Negro'],
              stock: 12,
              isActive: true,
              isNew: true,
              isPromo: false
            },
            {
              id: 'TEST006',
              title: 'Falda Elegante Cherry',
              image: 'https://cherry-fotos.s3.amazonaws.com/shopify/TEST006/TEST006_1.jpg',
              price: 79.99,
              rating: 4,
              description: 'Falda elegante para el día a día',
              brand: 'Cherry',
              category: 'Faldas',
              colors: ['Negro', 'Azul'],
              stock: 18,
              isActive: true,
              isNew: false,
              isPromo: true
            }
          ];
          setApiProducts(testProducts);
        }
      } catch (error) {
        console.error('❌ FeaturedProducts: Error loading random products:', error);
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