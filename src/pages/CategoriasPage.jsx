import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getProductsByCategory } from '../api/cherryApi';
import ProductGrid from '../components/ProductGrid/ProductGrid';
import './CategoriasPage.css';

const CategoriasPage = () => {
  const { category } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalResults, setTotalResults] = useState(0);

  // Obtener la categoría desde la URL
  const productCategory = category || 'collares';

  useEffect(() => {
    const fetchCategoryProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Mapear categorías del menú a categorías de la API
        const categoryMap = {
          'collares': 'accesorios',
          'pulseras': 'accesorios',
          'aretes': 'accesorios',
          'anillos': 'accesorios',
          'labiales': 'maquillaje',
          'sombras': 'maquillaje',
          'bases': 'maquillaje',
          'cremas': 'cuidado-personal',
          'tratamientos': 'cuidado-personal',
          'mascarillas': 'cuidado-personal',
          'todas': 'vestidos'
        };

        const apiCategory = categoryMap[productCategory] || productCategory;
        const response = await getProductsByCategory(apiCategory);
        
        if (response && response.length > 0) {
          setProducts(response);
          setTotalResults(response.length);
        } else {
          setError('No se pudieron cargar los productos de esta categoría');
        }
      } catch (err) {
        setError('Error al cargar los productos de esta categoría');
        console.error('Error fetching category products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryProducts();
  }, [productCategory]);

  const getPageTitle = () => {
    const titles = {
      'collares': 'Collares',
      'pulseras': 'Pulseras',
      'aretes': 'Aretes',
      'anillos': 'Anillos',
      'labiales': 'Labiales',
      'sombras': 'Sombras',
      'bases': 'Bases',
      'cremas': 'Cremas',
      'tratamientos': 'Tratamientos',
      'mascarillas': 'Mascarillas',
      'todas': 'Todas las Categorías'
    };
    return titles[productCategory] || 'Categoría';
  };

  const getPageDescription = () => {
    const descriptions = {
      'collares': 'Descubre nuestra colección de collares elegantes y modernos.',
      'pulseras': 'Pulseras únicas que complementan perfectamente tu estilo.',
      'aretes': 'Aretes hermosos para realzar tu belleza natural.',
      'anillos': 'Anillos elegantes que expresan tu personalidad.',
      'labiales': 'Labiales de alta calidad en una amplia gama de colores.',
      'sombras': 'Sombras de ojos que crean looks espectaculares.',
      'bases': 'Bases que proporcionan una cobertura perfecta y natural.',
      'cremas': 'Cremas hidratantes para mantener tu piel saludable.',
      'tratamientos': 'Tratamientos especializados para diferentes tipos de piel.',
      'mascarillas': 'Mascarillas faciales para una piel radiante.',
      'todas': 'Explora todas nuestras categorías de productos.'
    };
    return descriptions[productCategory] || 'Descubre los mejores productos de esta categoría.';
  };

  if (loading) {
    return (
      <div className="categorias-page">
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
            <p>Cargando productos de la categoría...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="categorias-page">
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
    <div className="categorias-page">
      <div className="container">
        {/* Header Section */}
        <div className="categorias-page__header">
          <div className="categorias-page__title-section">
            <h1 className="categorias-page__title">{getPageTitle()}</h1>
            <p className="categorias-page__description">{getPageDescription()}</p>
            <div className="categorias-page__results">
              <span className="categorias-page__results-count">
                {totalResults} productos encontrados
              </span>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="categorias-page__content">
            <ProductGrid products={products} />
          </div>
        ) : (
          <div className="categorias-page__empty">
            <h3>No se encontraron productos en esta categoría</h3>
            <p>Pronto tendremos productos disponibles en esta categoría.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoriasPage; 