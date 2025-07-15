import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import CatalogFilter from '../components/CatalogFilter/CatalogFilter';
import CatalogProductCard from '../components/CatalogProductCard/CatalogProductCard';
import Pagination from '../components/Pagination/Pagination';
import { getIconPath } from '../utils/assetPaths';
import CustomButton from '../components/CustomButton';
import './CatalogPage.css';
import { getProductsByCategory, getAllProducts, getAvailableCategories, mapApiProductToAppProduct, getProductsByAvailability } from '../api/cherryApi';

const CatalogPage = () => {
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || 'all';
  
  // State management for filters and products
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('más recientes');
  const [allProducts, setAllProducts] = useState([]); // Store all products
  const [filteredProducts, setFilteredProducts] = useState([]); // Store filtered products
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    catalog: 'Cherry 2025 - 2026',
    availability: 'todos',
    category: 'Todas las categorías',
    department: 'Todos los departamentos',
    sector: 'Todos los sectores',
    sizes: [],
    colors: [],
    priceRange: { min: 0, max: 0 }
  });

  // Function to get available colors from products
  const getAvailableColors = (products) => {
    const colorSet = new Set();
    products.forEach(product => {
      if (product.colors && product.colors.length > 0) {
        product.colors.forEach(color => {
          if (color && color.trim()) {
            colorSet.add(color.trim());
          }
        });
      }
    });
    return Array.from(colorSet).sort();
  };

  // Function to filter products based on current filters
  const filterProducts = (products, currentFilters) => {
    if (!products || products.length === 0) return [];

    let filtered = [...products];

    // Filter by category (if not "Todas las categorías")
    if (currentFilters.category && currentFilters.category !== 'Todas las categorías') {
      const categoryLower = currentFilters.category.toLowerCase();
      filtered = filtered.filter(product => {
        const productCategory = product.category?.toLowerCase() || '';
        return productCategory.includes(categoryLower) || 
               product.title?.toLowerCase().includes(categoryLower);
      });
    }

    // Filter by price range
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

    // Filter by colors
    if (currentFilters.colors && currentFilters.colors.length > 0) {
      filtered = filtered.filter(product => {
        if (!product.colors || product.colors.length === 0) return false;
        
        return currentFilters.colors.some(filterColor => {
          const filterColorLower = filterColor.toLowerCase();
          return product.colors.some(productColor => {
            const productColorLower = productColor.toLowerCase();
            // Check for exact match or partial match
            return productColorLower === filterColorLower || 
                   productColorLower.includes(filterColorLower) ||
                   filterColorLower.includes(productColorLower);
          });
        });
      });
    }

    // Filter by sizes (if product has size information)
    if (currentFilters.sizes && currentFilters.sizes.length > 0) {
      filtered = filtered.filter(product => {
        // For now, we'll keep all products since size info might not be available
        // This can be enhanced when size data is available in the API
        return true;
      });
    }

    return filtered;
  };

  // Function to sort products
  const sortProducts = (products, sortOption) => {
    const sorted = [...products];
    
    switch (sortOption) {
      case 'precio-menor':
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'precio-mayor':
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'nombre-az':
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'nombre-za':
        return sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      case 'más recientes':
      default:
        return sorted; // Keep original order for "más recientes"
    }
  };

  // Load products based on category, catalog and availability
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        
        let productsData;
        if (category === 'all') {
          const rawProducts = await getProductsByAvailability(filters.availability, filters.catalog);
          productsData = rawProducts.map(mapApiProductToAppProduct);
        } else {
          // Para categorías específicas, primero obtener por categoría y luego filtrar por disponibilidad
          const rawProducts = await getProductsByCategory(category, filters.catalog);
          if (filters.availability === 'con-existencia') {
            const filteredByAvailability = rawProducts.filter(product => product.stock > 0);
            productsData = filteredByAvailability;
          } else {
            productsData = rawProducts;
          }
        }
        
        setAllProducts(productsData);
        setFilteredProducts(productsData);
      } catch (error) {
        console.error('Error loading products:', error);
        setAllProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [category, filters.catalog, filters.availability]); // Agregar filters.availability como dependencia

  // Apply filters and sorting when filters or sortBy changes
  useEffect(() => {
    if (allProducts.length > 0) {
      
      let filtered = filterProducts(allProducts, filters);
      filtered = sortProducts(filtered, sortBy);
      setFilteredProducts(filtered);
      setCurrentPage(1); // Reset to first page when filters change
      
    }
  }, [filters.category, filters.priceRange, filters.colors, filters.sizes, sortBy, allProducts]); // Excluir filters.availability y filters.catalog

  const totalResults = filteredProducts.length;
  const productsPerPage = 12;
  const totalPages = Math.ceil(totalResults / productsPerPage);

  // Get current page products
  const getCurrentPageProducts = () => {
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  };

  // Handle filter modal
  const toggleFilterModal = () => {
    setIsFilterModalOpen(!isFilterModalOpen);
  };

  // Handle sort change
  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setFilters({
      catalog: 'Cherry 2025 - 2026',
      availability: 'todos',
      category: 'Todas las categorías',
      department: 'Todos los departamentos',
      sector: 'Todos los sectores',
      sizes: [],
      colors: [],
      priceRange: { min: 0, max: 0 }
    });
  };

  // Handle favorite toggle
  const handleFavoriteToggle = (productId) => {
    // Implement favorite functionality here
  };

  if (loading) {
    return (
      <div className="catalog-page">
        <div className="container">
          <div className="loading-spinner">
            <p>Cargando productos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Catálogo de productos - Cherry</title>
        <meta name="description" content="Explora nuestro catálogo completo de productos Cherry. Encuentra las últimas tendencias en moda y accesorios." />
      </Helmet>

      <div className="catalog-page">
        <div className="container">
          {/* Header section with title and filters  -  MOBILE */}
          <div className="catalog-page__header-mobile">
            <div className="catalog-page__title-section">
              <h1 className="catalog-page__title">
                Catálogo de productos
                <span style={{ fontSize: '12px', color: '#7f8c8d', display: 'block', marginTop: '4px' }}>
                  {filters.catalog}
                </span>
              </h1>
              <div className='catalog-page__content-texts'>
                <span className="catalog-page__results-count">
                  ({totalResults})
                  <p className="catalog-page__text-results-count">Resultados</p>
                </span>
                <CustomButton
                  variant="filled"
                  size="small"
                  className="catalog-page__compare-clients-btn"
                  iconLeft={<img src={getIconPath('Whatsapp.svg')} alt="Comparar clientes" style={{ width: 16, height: 16 }} />}
                >
                  <span className="catalog-page__whatsapp-text">Compartir a clientes</span>
                </CustomButton>
              </div>
            </div>

            <div className="catalog-page__controls">
              {/* Sort dropdown */}
              <div className="catalog-page__sort-section">
                <div className="catalog-page__mobile-filter-controls">
                  <button
                    className="catalog-page__mobile-filter-btn"
                    onClick={toggleFilterModal}
                  >
                    <img src={getIconPath('Filter.svg')} alt="Filtros" />
                    <span style={{ fontSize: '12px', marginLeft: '4px' }}>Filtros</span>
                    <img src={getIconPath('Chevron Down.svg')} alt="Expandir" />
                  </button>
                </div>
                <label htmlFor="sort-select" className="catalog-page__sort-label">Ordenar por:</label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={handleSortChange}
                  className="catalog-page__sort-select"
                >
                  <option value="más recientes">más recientes</option>
                  <option value="precio-menor">Precio: menor a mayor</option>
                  <option value="precio-mayor">Precio: mayor a menor</option>
                  <option value="nombre-az">Nombre: A-Z</option>
                  <option value="nombre-za">Nombre: Z-A</option>
                </select>
              </div>
            </div>
          </div>

          {/* Header section with title and filters  -  DESKTOP */}
          <div className="catalog-page__header-desktop">
            <div className="catalog-page__title-section">
              <h1 className="catalog-page__title">
                Catálogo de productos
                <span style={{ fontSize: '12px', color: '#7f8c8d', display: 'block', marginTop: '4px' }}>
                  {filters.catalog}
                </span>
              </h1>
              <div className='catalog-page__content-texts'>
                <span className="catalog-page__results-count">
                  ({totalResults})
                  <p className="catalog-page__text-results-count">Resultados</p>
                </span>
              </div>
            </div>

            <div className="catalog-page__controls">
              <div className="catalog-page__sort-section">
                <label htmlFor="sort-select" className="catalog-page__sort-label">Ordenar por:</label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={handleSortChange}
                  className="catalog-page__sort-select"
                >
                  <option value="más recientes">más recientes</option>
                  <option value="precio-menor">Precio: menor a mayor</option>
                  <option value="precio-mayor">Precio: mayor a menor</option>
                  <option value="nombre-az">Nombre: A-Z</option>
                  <option value="nombre-za">Nombre: Z-A</option>
                </select>
              </div>
              <CustomButton
                variant="filled"
                size="medium"
                iconLeft={<img src={getIconPath('Whatsapp.svg')} alt="Comparar clientes" style={{ width: 16, height: 16 }} />}
              >
                <span className="catalog-page__whatsapp-text">Compartir a clientes</span>
              </CustomButton>
            </div>
          </div>

          <div className="catalog-page__content">
            {/* Sidebar filters - Desktop */}
            <aside className="catalog-page__sidebar">
              <CatalogFilter
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                isMobile={false}
              />
            </aside>

            {/* Main content area */}
            <main className="catalog-page__main">
              {/* Products grid */}
              <div className="catalog-page__products-grid">
                {getCurrentPageProducts().map((product) => (
                  <CatalogProductCard
                    key={product.id}
                    product={product}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                ))}
              </div>

              {/* No products message */}
              {totalResults === 0 && !loading && (
                <div className="no-products-message">
                  <p>No se encontraron productos para esta categoría.</p>
                  <p>Intenta con otra categoría o revisa los filtros.</p>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
              )}
            </main>
          </div>

          {/* Mobile Filter Modal */}
          {isFilterModalOpen && (
            <div className="filter-modal-overlay" onClick={toggleFilterModal}>
              <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
                <CatalogFilter
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onClearFilters={handleClearFilters}
                  isMobile={true}
                  onClose={toggleFilterModal}
                />
              </div>
            </div>
          )}
          
        </div>
      </div>
    </>
  );
};

export default CatalogPage; 