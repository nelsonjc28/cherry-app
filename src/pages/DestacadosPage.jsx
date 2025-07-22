import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getProductsByCategory } from '../api/cherryApi';
import ProductGrid from '../components/ProductGrid/ProductGrid';
import './DestacadosPage.css';

const DestacadosPage = () => {
  const { type } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalResults, setTotalResults] = useState(0);

  // Obtener el tipo de productos destacados desde la URL
  const productType = type || 'accesorios-populares';

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Mapear tipos a categorías específicas para productos destacados
        const categoryMap = {
          'accesorios-populares': 'accesorios',
          'maquillaje-favorito': 'maquillaje',
          'mas-buscado': 'vestidos',
          'por-estilo': 'blusas',
          'por-temporada': 'pantalones',
          'por-ocasion': 'vestidos',
          'descuentos': 'blusas',
          'packs': 'accesorios'
        };

        const category = categoryMap[productType] || 'vestidos';
        const response = await getProductsByCategory(category);
        
        if (response && response.length > 0) {
          setProducts(response);
          setTotalResults(response.length);
        } else {
          setError('No se pudieron cargar los productos destacados');
        }
      } catch (err) {
        setError('Error al cargar los productos destacados');

      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, [productType]);

  const getPageTitle = () => {
    const titles = {
      'accesorios-populares': 'Accesorios Populares',
      'maquillaje-favorito': 'Maquillaje Favorito',
      'mas-buscado': 'Lo Más Buscado',
      'por-estilo': 'Por Estilo',
      'por-temporada': 'Por Temporada',
      'por-ocasion': 'Por Ocasión',
      'descuentos': 'Productos con Descuento',
      'packs': 'Packs Especiales'
    };
    return titles[productType] || 'Productos Destacados';
  };

  const getPageDescription = () => {
    const descriptions = {
      'accesorios-populares': 'Los accesorios más populares y solicitados por nuestras clientes.',
      'maquillaje-favorito': 'Los productos de maquillaje favoritos de nuestras clientes.',
      'mas-buscado': 'Los productos más buscados y populares de nuestra tienda.',
      'por-estilo': 'Productos organizados por estilo para facilitar tu elección.',
      'por-temporada': 'Productos perfectos para cada temporada del año.',
      'por-ocasion': 'Productos ideales para diferentes ocasiones y eventos.',
      'descuentos': 'Productos con descuentos especiales y ofertas únicas.',
      'packs': 'Packs especiales con productos complementarios.'
    };
    return descriptions[productType] || 'Descubre nuestros productos más destacados y populares.';
  };

  if (loading) {
    return (
      <div className="destacados-page">
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
            <p>Cargando productos destacados...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="destacados-page">
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
    <div className="destacados-page">
      <div className="container">
        {/* Header Section */}
        <div className="destacados-page__header">
          <div className="destacados-page__title-section">
            <h1 className="destacados-page__title">{getPageTitle()}</h1>
            <p className="destacados-page__description">{getPageDescription()}</p>
            <div className="destacados-page__results">
              <span className="destacados-page__results-count">
                {totalResults} productos encontrados
              </span>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="destacados-page__content">
            <ProductGrid products={products} />
          </div>
        ) : (
          <div className="destacados-page__empty">
            <h3>No se encontraron productos destacados</h3>
            <p>Pronto tendremos productos destacados disponibles.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DestacadosPage; 