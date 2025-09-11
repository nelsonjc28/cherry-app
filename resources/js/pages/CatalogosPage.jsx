import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getProductsByCategory, mapApiProductToAppProduct } from '../api/cherryApi';
import ProductGrid from '../components/ProductGrid/ProductGrid';
import CatalogFilter from '../components/CatalogFilter/CatalogFilter';
import './CatalogosPage.css';

const CatalogosPage = () => {
  const { catalog } = useParams();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalResults, setTotalResults] = useState(0);
  const [filters, setFilters] = useState({
    catalog: catalog || 'primavera-verano',
    availability: 'todos',
    category: 'Todas las categorías',
    department: 'Todos los departamentos',
    sector: 'Todos los sectores',
    sizes: [],
    colors: [],
    priceRange: { min: 0, max: 0 },
    codigo: '',
    dtu: ''
  });

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
        const mapped = response.map(mapApiProductToAppProduct).filter(p => p !== null);
        setProducts(mapped);
        setFilteredProducts(mapped);
        setTotalResults(mapped.length);
      } catch (err) {
        setError('Error al cargar los productos del catálogo');
        setProducts([]);
        setFilteredProducts([]);
        setTotalResults(0);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalogProducts();
  }, [productCatalog]);

  // Filtro local igual que en CatalogPage.jsx
  const filterProducts = (products, currentFilters) => {
    if (!products || products.length === 0) return [];
    let filtered = [...products];
    // Filtros igual que en CatalogPage.jsx
    if (currentFilters.category && currentFilters.category !== 'Todas las categorías') {
      const categoryLower = currentFilters.category.toLowerCase();
      filtered = filtered.filter(product => {
        const productCategory = product.category?.toLowerCase() || '';
        return productCategory.includes(categoryLower) || 
               product.title?.toLowerCase().includes(categoryLower);
      });
    }
    if (currentFilters.priceRange.min > 0 || currentFilters.priceRange.max > 0) {
      filtered = filtered.filter(product => {
        const price = product.price || 0;
        const minPrice = currentFilters.priceRange.min || 0;
        const maxPrice = currentFilters.priceRange.max || Infinity;
        if (maxPrice > 0) {
          return price >= minPrice && price <= maxPrice;
        } else {
          return price >= minPrice;
        }
      });
    }
    if (currentFilters.colors && currentFilters.colors.length > 0) {
      filtered = filtered.filter(product => {
        if (!product.colors || product.colors.length === 0) return false;
        return currentFilters.colors.some(filterColor => {
          const filterColorLower = filterColor.toLowerCase();
          return product.colors.some(productColor => {
            const productColorLower = productColor.toLowerCase();
            return productColorLower === filterColorLower || 
                   productColorLower.includes(filterColorLower) ||
                   filterColorLower.includes(productColorLower);
          });
        });
      });
    }
    if (currentFilters.sizes && currentFilters.sizes.length > 0) {
      filtered = filtered.filter(product => true);
    }
    // Filtro por código
    if (currentFilters.codigo && currentFilters.codigo.trim() !== '') {
      const codigoLower = currentFilters.codigo.trim().toLowerCase();
      filtered = filtered.filter(product => {
        return (
          (product.codigo && product.codigo.toLowerCase().includes(codigoLower)) ||
          (product.id && product.id.toString().toLowerCase().includes(codigoLower)) ||
          (product.id_articulo && product.id_articulo.toString().toLowerCase().includes(codigoLower))
        );
      });
    }
    // Filtro por dtu
    if (currentFilters.dtu && currentFilters.dtu.trim() !== '') {
      const dtuLower = currentFilters.dtu.trim().toLowerCase();
      filtered = filtered.filter(product => {
        return (
          (product.dtu && product.dtu.toLowerCase().includes(dtuLower)) ||
          (product.DTU && product.DTU.toLowerCase().includes(dtuLower))
        );
      });
    }
    return filtered;
  };

  // Actualizar productos filtrados cuando cambian los filtros
  useEffect(() => {
    setFilteredProducts(filterProducts(products, filters));
    setTotalResults(filterProducts(products, filters).length);
  }, [filters, products]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      catalog: productCatalog,
      availability: 'todos',
      category: 'Todas las categorías',
      department: 'Todos los departamentos',
      sector: 'Todos los sectores',
      sizes: [],
      colors: [],
      priceRange: { min: 0, max: 0 },
      codigo: '',
      dtu: ''
    });
  };

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

        {/* Filtros */}
        <CatalogFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          isMobile={false}
        />

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="catalogos-page__content">
            <ProductGrid products={filteredProducts} />
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
