import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getProductsByCategory } from '../api/cherryApi';
import ProductGrid from '../components/ProductGrid/ProductGrid';
import './NuevosPage.css';

const NuevosPage = () => {
  const { type } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalResults, setTotalResults] = useState(0);

  // Obtener el tipo de productos nuevos desde la URL
  const productType = type || 'primavera';

  useEffect(() => {
    const fetchNewProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Mapear tipos a categorías específicas para productos nuevos
        const categoryMap = {
          'primavera': 'vestidos',
          'tendencias': 'blusas',
          'mas-vendido': 'pantalones',
          'accesorios': 'accesorios',
          'maquillaje': 'maquillaje',
          'cuidado-personal': 'cuidado-personal',
          'coleccion-limitada': 'vestidos',
          'edicion-especial': 'blusas'
        };

        const category = categoryMap[productType] || 'vestidos';
        const response = await getProductsByCategory(category);
        
        if (response && response.length > 0) {
          setProducts(response);
          setTotalResults(response.length);
        } else {
          setError('No se pudieron cargar los productos nuevos');
        }
      } catch (err) {
        setError('Error al cargar los productos nuevos');
        console.error('Error fetching new products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNewProducts();
  }, [productType]);

  const getPageTitle = () => {
    const titles = {
      'primavera': 'Colección Primavera',
      'tendencias': 'Últimas Tendencias',
      'mas-vendido': 'Lo Más Vendido',
      'accesorios': 'Nuevos Accesorios',
      'maquillaje': 'Nuevo Maquillaje',
      'cuidado-personal': 'Nuevo Cuidado Personal',
      'coleccion-limitada': 'Colección Limitada',
      'edicion-especial': 'Edición Especial'
    };
    return titles[productType] || 'Productos Nuevos';
  };

  const getPageDescription = () => {
    const descriptions = {
      'primavera': 'Descubre nuestra nueva colección de primavera con los diseños más frescos y elegantes.',
      'tendencias': 'Las últimas tendencias en moda femenina, siempre a la vanguardia del estilo.',
      'mas-vendido': 'Los productos más populares y solicitados por nuestras clientes.',
      'accesorios': 'Nuevos accesorios que complementan perfectamente tu estilo.',
      'maquillaje': 'Los productos de maquillaje más innovadores para realzar tu belleza.',
      'cuidado-personal': 'Nuevos productos para el cuidado personal que cuidan tu belleza natural.',
      'coleccion-limitada': 'Una colección exclusiva y limitada con diseños únicos.',
      'edicion-especial': 'Ediciones especiales con diseños únicos y exclusivos.'
    };
    return descriptions[productType] || 'Descubre los productos más nuevos y frescos de nuestra tienda.';
  };

  if (loading) {
    return (
      <div className="nuevos-page">
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
            <p>Cargando productos nuevos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="nuevos-page">
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
    <div className="nuevos-page">
      <div className="container">
        {/* Header Section */}
        <div className="nuevos-page__header">
          <div className="nuevos-page__title-section">
            <h1 className="nuevos-page__title">{getPageTitle()}</h1>
            <p className="nuevos-page__description">{getPageDescription()}</p>
            <div className="nuevos-page__results">
              <span className="nuevos-page__results-count">
                {totalResults} productos encontrados
              </span>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="nuevos-page__content">
            <ProductGrid products={products} />
          </div>
        ) : (
          <div className="nuevos-page__empty">
            <h3>No se encontraron productos nuevos</h3>
            <p>Pronto tendremos nuevos productos disponibles.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NuevosPage; 