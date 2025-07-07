import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import CatalogFilter from '../components/CatalogFilter/CatalogFilter';
import CatalogProductCard from '../components/CatalogProductCard/CatalogProductCard';
import Pagination from '../components/Pagination/Pagination';
import { getIconPath } from '../utils/assetPaths';
import CustomButton from '../components/CustomButton';
import './CatalogPage.css';
import { getProductsByCategory, getAllProducts, getAvailableCategories } from '../api/cherryApi';

const CatalogPage = () => {
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || 'all';
  
  // State management for filters and products
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('más recientes');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    catalog: 'Cherry 2025 - 2026',
    availability: 'todos',
    category: 'all',
    department: 'all',
    sector: 'all',
    sizes: [],
    colors: [],
    priceRange: { min: 0, max: 0 }
  });

  // Load products based on category
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        console.log('Cargando productos para categoría:', category);
        
        // Debug: obtener categorías disponibles
        if (category !== 'all') {
          await getAvailableCategories();
        }
        
        let productsData;
        if (category === 'all') {
          productsData = await getAllProducts();
          console.log('Todos los productos cargados:', productsData.length);
        } else {
          productsData = await getProductsByCategory(category);
          console.log('Productos filtrados cargados:', productsData.length);
        }
        
        setProducts(productsData);
      } catch (error) {
        console.error('Error loading products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [category]);

  const totalResults = products.length;
  const productsPerPage = 12;
  const totalPages = Math.ceil(totalResults / productsPerPage);

  // Get current page products
  const getCurrentPageProducts = () => {
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    return products.slice(startIndex, endIndex);
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
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setFilters({
      catalog: 'Cherry 2025 - 2026',
      availability: 'todos',
      category: 'all',
      department: 'all',
      sector: 'all',
      sizes: [],
      colors: [],
      priceRange: { min: 0, max: 0 }
    });
    setCurrentPage(1);
  };

  // Handle favorite toggle
  const handleFavoriteToggle = (productId) => {
    console.log('Toggle favorite for product:', productId);
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
          {/* Debug info */}
          {category !== 'all' && (
            <div style={{ background: '#f0f0f0', padding: '10px', margin: '10px 0', borderRadius: '4px' }}>
              <p><strong>Debug:</strong> Categoría: {category} | Productos encontrados: {totalResults}</p>
            </div>
          )}

          {/* Header section with title and filters  -  MOBILE */}
          <div className="catalog-page__header-mobile">
            <div className="catalog-page__title-section">
              <h1 className="catalog-page__title">Catálogo de productos</h1>
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
              <h1 className="catalog-page__title">Catálogo de productos</h1>
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