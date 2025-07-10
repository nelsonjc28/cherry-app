import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getProductsByCategory } from '../api/cherryApi';
import ProductGrid from '../components/ProductGrid/ProductGrid';
import './CatalogosPage.css';

const CatalogosPage = () => {
  const { catalog } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalResults, setTotalResults] = useState(0);

  // Obtener el catálogo desde la URL
  const productCatalog = catalog || 'primavera-verano';

  useEffect(() => {
    const fetchCatalogProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Mapear catálogos a categorías específicas
        const categoryMap = {
          'primavera-verano': 'vestidos',
          'otono-invierno': 'blusas',
          'elegante': 'pantalones',
          'casual': 'vestidos',
          'fiesta': 'blusas',
          'edicion-limitada': 'accesorios',
          'colaboraciones': 'maquillaje'
        };

        const category = categoryMap[productCatalog] || 'vestidos';
        const response = await getProductsByCategory(category);
        
        if (response && response.length > 0) {
          setProducts(response);
          setTotalResults(response.length);
        } else {
          setError('No se pudieron cargar los productos del catálogo');
        }
      } catch (err) {
        setError('Error al cargar los productos del catálogo');
        console.error('Error fetching catalog products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalogProducts();
  }, [productCatalog]);

  const getPageTitle = () => {
    const titles = {
      'primavera-verano': 'Catálogo Primavera-Verano',
      'otono-invierno': 'Catálogo Otoño-Invierno',
      'elegante': 'Colección Elegante',
      'casual': 'Colección Casual',
      'fiesta': 'Colección Fiesta',
      'edicion-limitada': 'Edición Limitada',
      'colaboraciones': 'Colaboraciones Especiales'
    };
    return titles[productCatalog] || 'Catálogo';
  };

  const getPageDescription = () => {
    const descriptions = {
      'primavera-verano': 'Descubre nuestra colección de primavera-verano con diseños frescos y coloridos.',
      'otono-invierno': 'La colección otoño-invierno con estilos cálidos y elegantes.',
      'elegante': 'Una colección elegante para ocasiones especiales y eventos formales.',
      'casual': 'Estilos casuales y cómodos para el día a día.',
      'fiesta': 'Diseños festivos perfectos para celebraciones y eventos especiales.',
      'edicion-limitada': 'Una edición exclusiva y limitada con diseños únicos.',
      'colaboraciones': 'Colaboraciones especiales con diseñadores y marcas exclusivas.'
    };
    return descriptions[productCatalog] || 'Explora nuestro catálogo de productos seleccionados.';
  };

  if (loading) {
    return (
      <div className="catalogos-page">
        <div className="container">
          <div className="loading-container">
            <svg className="loading-spinner-svg" width="40" height="40" viewBox="0 0 40 40">
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="#f3f3f3"
                strokeWidth="4"
              />
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="4"
                strokeDasharray="113"
                strokeDashoffset="113"
                strokeLinecap="round"
                className="spinner-circle"
              />
            </svg>
            <p>Cargando productos del catálogo...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="catalogos-page">
        <div className="container">
          <div className="error-container">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Intentar de nuevo</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="catalogos-page">
      <div className="container">
        {/* Header Section */}
        <div className="catalogos-page__header">
          <div className="catalogos-page__title-section">
            <h1 className="catalogos-page__title">{getPageTitle()}</h1>
            <p className="catalogos-page__description">{getPageDescription()}</p>
            <div className="catalogos-page__results">
              <span className="catalogos-page__results-count">
                {totalResults} productos en el catálogo
              </span>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="catalogos-page__content">
            <ProductGrid products={products} />
          </div>
        ) : (
          <div className="catalogos-page__empty">
            <h3>No se encontraron productos en este catálogo</h3>
            <p>Pronto tendremos productos disponibles en este catálogo.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogosPage; 