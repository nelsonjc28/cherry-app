import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import CatalogFilter from '../components/CatalogFilter/CatalogFilter';
import CherryButton from '../components/CherryButton/CherryButton';
import { getIconPath } from '../utils/assetPaths';
import { searchProductsAdvanced, getProductsWithRatings, mapApiProductToAppProduct } from '../api/cherryApi';
import './BuscarPage.css';

const BuscarPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const colorFilter = searchParams.get('color') || '';
  const skuFilter = searchParams.get('sku') || '';
  
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    catalog: 'Cherry 2025 - 2026',
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

  // Cargar productos
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        // Use advanced search if we have search parameters
        if (query || colorFilter || skuFilter) {
          const searchFilters = {
            ...filters,
            codigo: skuFilter,
            colors: colorFilter ? colorFilter.split(',').map(c => c.trim()) : []
          };
          const searchResults = await searchProductsAdvanced(query, searchFilters);
          setProducts(searchResults);
          setFilteredProducts(searchResults);
        } else {
          // Load all products if no search parameters
          const allProducts = await getProductsWithRatings();
          const mappedProducts = allProducts.map(mapApiProductToAppProduct);
          setProducts(mappedProducts);
          setFilteredProducts(mappedProducts);
        }
      } catch (error) {
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [query, colorFilter, skuFilter]);

  // Filtrar productos basado en filtros adicionales
  useEffect(() => {
    let filtered = [...products];

    // Aplicar filtros adicionales
    if (filters.category && filters.category !== 'Todas las categorías') {
      const categoryLower = filters.category.toLowerCase();
      filtered = filtered.filter(product => {
        const productCategory = product.category?.toLowerCase() || '';
        return productCategory.includes(categoryLower);
      });
    }

    // Filtrar por precio
    if (filters.priceRange.min > 0 || filters.priceRange.max > 0) {
      filtered = filtered.filter(product => {
        const price = product.price || 0;
        const minPrice = filters.priceRange.min || 0;
        const maxPrice = filters.priceRange.max || Infinity;
        
        if (maxPrice > 0) {
          return price >= minPrice && price <= maxPrice;
        } else {
          return price >= minPrice;
        }
      });
    }

    // Filtrar por colores adicionales
    if (filters.colors && filters.colors.length > 0) {
      filtered = filtered.filter(product => {
        if (!product.colors || product.colors.length === 0) return false;
        
        return filters.colors.some(filterColor => {
          const filterColorLower = filterColor.toLowerCase();
          return product.colors.some(productColor => {
            const productColorLower = productColor.toLowerCase();
            return productColorLower === filterColorLower || 
                   productColorLower.includes(filterColorLower);
          });
        });
      });
    }

    // Filtrar por código adicional
    if (filters.codigo && filters.codigo.trim() !== '') {
      const codigoLower = filters.codigo.trim().toLowerCase();
      filtered = filtered.filter(product => {
        return (
          (product.codigo && product.codigo.toLowerCase().includes(codigoLower)) ||
          (product.id && product.id.toString().toLowerCase().includes(codigoLower))
        );
      });
    }

    // Filtrar por DTU
    if (filters.dtu && filters.dtu.trim() !== '') {
      const dtuLower = filters.dtu.trim().toLowerCase();
      filtered = filtered.filter(product => {
        return (
          (product.dtu && product.dtu.toLowerCase().includes(dtuLower)) ||
          (product.DTU && product.DTU.toLowerCase().includes(dtuLower))
        );
      });
    }

    setFilteredProducts(filtered);
  }, [filters, products]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      catalog: 'Cherry 2025 - 2026',
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

  const handleFavoriteToggle = (productId) => {
    // Handle favorite toggle
  };

  // Build search description
  const getSearchDescription = () => {
    const parts = [];
    if (query) parts.push(`"${query}"`);
    if (colorFilter) parts.push(`color: ${colorFilter}`);
    if (skuFilter) parts.push(`SKU: ${skuFilter}`);
    return parts.join(', ');
  };

  return (
    <>
      <Helmet>
        <title>Búsqueda - Cherry Central</title>
        <meta name="description" content={`Resultados de búsqueda para "${getSearchDescription()}" en Cherry Central. Encuentra los mejores productos de moda femenina.`} />
      </Helmet>

      <main className="buscar-page">
        <div className="container">
          {/* Header de búsqueda */}
          <div className="buscar-header">
            <h1>Resultados de búsqueda</h1>
            {(query || colorFilter || skuFilter) && (
              <p className="buscar-query">
                Buscando: <strong>"{getSearchDescription()}"</strong>
              </p>
            )}
            <p className="buscar-results">
              {filteredProducts.length} productos encontrados
            </p>
          </div>

          <div className="buscar-content">
            {/* Filtros */}
            <aside className="buscar-filters">
              <CatalogFilter
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
              />
            </aside>

            {/* Resultados */}
            <div className="buscar-results-section">
              {loading ? (
                <div className="buscar-loading">
                  <div className="loading-spinner"></div>
                  <p>Buscando productos...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="buscar-no-results">
                  <div className="no-results-icon">
                    <img src={getIconPath('Search.svg')} alt="Sin resultados" />
                  </div>
                  <h3>No se encontraron productos</h3>
                  <p>Intenta ajustar los términos de búsqueda o usar filtros diferentes</p>
                  <CherryButton 
                    variant="outline" 
                    size="medium"
                    onClick={handleClearFilters}
                  >
                    Limpiar filtros
                  </CherryButton>
                </div>
              ) : (
                <div className="buscar-products-grid">
                  {filteredProducts.map((product, index) => (
                    <ProductCard
                      key={product.id || `product-${index}`}
                      product={product}
                      onFavoriteToggle={handleFavoriteToggle}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default BuscarPage; 