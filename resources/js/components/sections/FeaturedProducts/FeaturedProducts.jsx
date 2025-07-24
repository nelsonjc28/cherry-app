import { useState, useEffect } from 'react';
import ProductGrid from '../../ProductGrid/ProductGrid';
import ProductSlider from '../../ProductSlider/ProductSlider';
import { getRandomProducts } from '../../../api/cherryApi';
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
  const [error, setError] = useState(null);

  // Cargar productos desde la API si useApi es true
  useEffect(() => {
    if (useApi) {
      const loadProducts = async () => {
        console.log('🔄 Iniciando carga de productos aleatorios...');
        setLoading(true);
        setError(null);
        try {
          const productsData = await getRandomProducts(5);
          console.log('✅ Productos cargados:', productsData);
          
          if (productsData && productsData.length > 0) {
            console.log('✅ Usando productos reales de la API:', productsData.length);
            setApiProducts(productsData);
          } else {
            console.warn('⚠️ No se obtuvieron productos de la API, usando datos de prueba');
            // Datos de prueba temporales mientras diagnosticamos la API
            const testProducts = [
              {
                id: 'TEST001',
                title: 'Vestido Elegante Cherry',
                image: 'https://cherry-fotos.s3.amazonaws.com/shopify/TEST001/TEST001_1.jpg',
                price: 129.99,
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
                price: 149.99,
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
                price: 99.99,
                rating: 5,
                description: 'Suéter elegante para el invierno',
                brand: 'Cherry',
                category: 'Suéteres',
                colors: ['Beige', 'Gris'],
                stock: 12,
                isActive: true,
                isNew: true,
                isPromo: false
              }
            ];
            setApiProducts(testProducts);
          }
        } catch (err) {
          console.error('❌ Error cargando productos aleatorios:', err);
          setError(err.message);
          setApiProducts([]);
        } finally {
          setLoading(false);
        }
      };

      loadProducts();
    } else {
      console.log('ℹ️ Usando productos estáticos (useApi=false)');
      setLoading(false);
    }
  }, [useApi]);

  // Usar productos de la API si están disponibles, sino usar los productos pasados como props
  const displayProducts = useApi ? apiProducts : products;
  
  console.log('📦 Productos a mostrar:', displayProducts);
  console.log('🔧 Estado loading:', loading);
  console.log('❌ Estado error:', error);

  // Handle favorite toggle callback
  const handleFavoriteToggle = (productId) => {
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