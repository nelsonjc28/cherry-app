import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import CatalogFilter from '../components/CatalogFilter/CatalogFilter';
import CherryButton from '../components/CherryButton/CherryButton';
import InfiniteScrollLoader from '../components/InfiniteScrollLoader/InfiniteScrollLoader';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import { getIconPath } from '../utils/assetPaths';
import { getTopSellingProducts } from '../api/cherryApi';
import { applyUserOffersToProducts } from '../api/userOffers';
import { publicCatalogService } from '../services/api';
import { getTotalInventoryFromProduct } from '../utils/productUtils';
import useUserStore from '../store/userStore';
import './DestacadosPage.css';

const DestacadosPage = () => {
  const { user } = useUserStore();
  const [topSellingProducts, setTopSellingProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState('');
  const [error, setError] = useState(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('más vendidos');
  const [catalogs, setCatalogs] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  // Recuperar filtros guardados de sessionStorage
  const getSavedFilters = () => {
    try {
      const saved = sessionStorage.getItem('destacadosPageFilters');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
    }
    return {
      catalog: 'Seleccione',
      availability: 'todos',
      category: '',
      department: 'Todos los departamentos',
      sector: 'Todos los sectores',
      sizes: [],
      colors: [],
      priceRange: { min: 0, max: 0 }
    };
  };

  const [filters, setFilters] = useState(getSavedFilters);

  // Function to filter products
  const filterProducts = useCallback((products, currentFilters) => {
    if (!products || products.length === 0) return [];

    let filtered = [...products];

    // Filtrar por categoría (soporta selección múltiple)
    const selectedCategories = Array.isArray(currentFilters.categories) && currentFilters.categories.length > 0
      ? currentFilters.categories.filter(cat => cat !== 'todos') // Excluir la opción "todos"
      : (currentFilters.category && currentFilters.category !== '' ? (Array.isArray(currentFilters.category) ? currentFilters.category.filter(cat => cat !== 'todos') : [String(currentFilters.category)]) : []);
    
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(product => {
        // Normalizar id_linea y categoryCode a números para comparación (ignorar ceros a la izquierda)
        const productLineaId = product.id_linea || product.linea?.id_linea || product.linea || product.category_id;
        const normalizedProductLineaId = productLineaId ? parseInt(String(productLineaId), 10) : null;
        return selectedCategories.some(categoryCode => {
          const normalizedCategoryCode = parseInt(String(categoryCode), 10);
          return normalizedProductLineaId !== null && normalizedCategoryCode === normalizedProductLineaId;
        });
      });
    }
    
    // Filtrar por catálogo (soporta selección múltiple)
    const selectedCatalogs = Array.isArray(currentFilters.catalogs) && currentFilters.catalogs.length > 0
      ? currentFilters.catalogs.filter(cat => cat !== 'todos' && cat !== 'Seleccione' && cat !== '') // Excluir la opción "todos", "Seleccione" y vacíos
      : (currentFilters.catalog && currentFilters.catalog !== '' && currentFilters.catalog !== 'Seleccione' ? [String(currentFilters.catalog)] : []);
    
    if (selectedCatalogs.length > 0) {
      filtered = filtered.filter(product => {
        const productCatalogoId = product.catalogoId || product.catalog || null;
        // Si el producto no tiene catalogoId, excluirlo del filtro
        if (productCatalogoId === null || productCatalogoId === undefined || productCatalogoId === '') {
          return false;
        }
        // Normalizar ambos valores para comparación (convertir a número si es posible, luego a string)
        const normalizeCatalogId = (id) => {
          if (id === null || id === undefined || id === '') return null;
          // Intentar convertir a número primero para normalizar
          const numId = Number(id);
          if (!isNaN(numId) && numId !== 0) {
            return String(numId);
          }
          return String(id).trim();
        };
        
        const productCatalogNormalized = normalizeCatalogId(productCatalogoId);
        if (!productCatalogNormalized) {
          return false;
        }
        
        return selectedCatalogs.some(catalogId => {
          const catalogIdNormalized = normalizeCatalogId(catalogId);
          return catalogIdNormalized && catalogIdNormalized === productCatalogNormalized;
        });
      });
    }
    // Filter by department
    if (currentFilters.department && currentFilters.department !== 'Todos los departamentos') {
      const departmentLower = currentFilters.department.toLowerCase();
      filtered = filtered.filter(product => {
        const productCategory = product.category?.toLowerCase() || '';
        const productTitle = product.title?.toLowerCase() || '';

        const departmentCategoryMap = {
          'ropa casual': ['blusa', 'camisa', 'pantalon', 'jeans', 'vestido casual'],
          'ropa formal': ['vestido', 'traje', 'blazer', 'camisa formal'],
          'ropa deportiva': ['deportivo', 'gym', 'fitness', 'running'],
          'accesorios': ['accesorio', 'bolsa', 'cartera', 'cinturon', 'collar'],
          'calzado': ['zapato', 'tenis', 'sandalias', 'botas']
        };

        const departmentCategories = departmentCategoryMap[departmentLower] || [];
        return departmentCategories.some(cat =>
          productCategory.includes(cat) || productTitle.includes(cat)
        );
      });
    }

    // Filter by price range
    if (currentFilters.priceRange && (currentFilters.priceRange.min > 0 || currentFilters.priceRange.max > 0)) {
      filtered = filtered.filter(product => {
        const price = product.price || 0;
        const minPrice = currentFilters.priceRange.min || 0;
        const maxPrice = currentFilters.priceRange.max || 0;

        if (maxPrice > 0) {
          return price >= minPrice && price <= maxPrice;
        } else {
          return price >= minPrice;
        }
      });
    }

    // ¿Está activo "Con existencia"? Si sí, la talla/color seleccionada también
    // debe tener stock (inventario_d > 0) en algún detalle.
    const soloConExistencia = currentFilters.availability === 'con-existencia';

    // Function helper: ¿el detalle tiene stock?
    const detalleConStock = (detalle) => {
      const inv = Number(detalle?.inventario_d ?? 0);
      return inv > 0.00001;
    };

    // Filter by availability
    if (currentFilters.availability === 'con-existencia') {
      filtered = filtered.filter(product => getTotalInventoryFromProduct(product) > 0);
    } else if (currentFilters.availability === 'sin-existencia') {
      filtered = filtered.filter(product => getTotalInventoryFromProduct(product) <= 0.00001);
    }

    // Filter by colors
    if (currentFilters.colors && currentFilters.colors.length > 0) {
      filtered = filtered.filter(product => {
        if (product.detalles && product.detalles.length > 0) {
          return currentFilters.colors.some(filterColor => {
            const filterColorLower = filterColor.toLowerCase();
            return product.detalles.some(detalle => {
              if (!detalle.nombreColor) return false;
              const productColorLower = detalle.nombreColor.toLowerCase();
              const colorMatch = productColorLower === filterColorLower || productColorLower.includes(filterColorLower);
              // Con "Con existencia": el detalle del color debe tener stock
              if (soloConExistencia && !detalleConStock(detalle)) {
                return false;
              }
              return colorMatch;
            });
          });
        }
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

    // Filter by sizes - EXACT MATCH ONLY (restrictive)
    if (currentFilters.sizes && currentFilters.sizes.length > 0) {
      filtered = filtered.filter(product => {
        if (product.detalles && product.detalles.length > 0) {
          return currentFilters.sizes.some(filterSize => {
            const filterSizeLower = filterSize.toLowerCase().trim();
            return product.detalles.some(detalle => {
              if (!detalle.detalle) return false;
              const productSizeLower = detalle.detalle.toString().toLowerCase().trim();
              const sizeMatch = productSizeLower === filterSizeLower;
              // Con "Con existencia": el detalle de la talla debe tener stock
              if (soloConExistencia && !detalleConStock(detalle)) {
                return false;
              }
              return sizeMatch;
            });
          });
        }
        if (!product.sizes || product.sizes.length === 0) return false;
        return currentFilters.sizes.some(filterSize => {
          const filterSizeLower = filterSize.toLowerCase().trim();
          return product.sizes.some(productSize => {
            const productSizeLower = productSize.toString().toLowerCase().trim();
            return productSizeLower === filterSizeLower;
          });
        });
      });
    }

    return filtered;
  }, []);

  // Function to sort products
  const sortProducts = useCallback((products, sortOption) => {
    if (!products || products.length === 0) return [];

    const sorted = [...products];

    switch (sortOption) {
      case 'más vendidos':
        // Mantener el orden original basado en el ranking (ya vienen ordenados por ventas)
        // Ordenar por ranking si está disponible, sino mantener el orden original
        return sorted.sort((a, b) => {
          const rankA = a.ranking || 999999;
          const rankB = b.ranking || 999999;
          return rankA - rankB;
        });
      case 'precio-menor':
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'precio-mayor':
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'nombre-a-z':
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'nombre-z-a':
        return sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      default:
        return sorted;
    }
  }, []);



  // Extraer colores y tallas de los productos cargados
  useEffect(() => {
    if (topSellingProducts.length === 0) return;
    
    const colorSet = new Set();
    const sizeSet = new Set();
    topSellingProducts.forEach(product => {
      if (product.detalles && product.detalles.length > 0) {
        product.detalles.forEach(detalle => {
          if (detalle.nombreColor) colorSet.add(detalle.nombreColor.trim());
          if (detalle.detalle) sizeSet.add(detalle.detalle.trim());
        });
      }
      if (product.colors) product.colors.forEach(c => colorSet.add(c));
      if (product.sizes) product.sizes.forEach(s => sizeSet.add(s));
    });

    setAvailableColors(Array.from(colorSet).sort());
    
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    const extractedSizes = Array.from(sizeSet);
    const sortedSizes = extractedSizes.sort((a, b) => {
      const indexA = sizeOrder.indexOf(a.toUpperCase());
      const indexB = sizeOrder.indexOf(b.toUpperCase());
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
    setAvailableSizes(sortedSizes);
  }, [topSellingProducts]);

  // Load catalogs
  useEffect(() => {
    const loadCatalogs = async () => {
      setCatalogLoading(true);
      try {
        const response = await publicCatalogService.getAll();

        let catalogsData = [];

        if (response.data) {
          if (response.data.success && Array.isArray(response.data.data)) {
            catalogsData = response.data.data;
          } else if (response.data.success && response.data.data && response.data.data.catalogs) {
            catalogsData = response.data.data.catalogs;
          } else if (response.data.success && response.data.catalogs) {
            catalogsData = response.data.catalogs;
          } else if (Array.isArray(response.data)) {
            catalogsData = response.data;
          }
        }

        if (catalogsData && catalogsData.length > 0) {
          setCatalogs(catalogsData);
        } else {
          setCatalogs([]);
        }
      } catch (error) {
        setCatalogs([]);
      } finally {
        setCatalogLoading(false);
      }
    };

    loadCatalogs();
  }, []);

  // Cargar productos más vendidos (SIN caché para no sobrescribir la caché principal)
  useEffect(() => {
    const loadTopSellingProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const products = await getTopSellingProducts(50);
        
        // Si no hay productos pero no hay error explícito, no mostrar error
        if (!products || products.length === 0) {
          setTopSellingProducts([]);
          setFilteredProducts([]);
          setError(null); // No mostrar error si simplemente no hay productos
        } else {
          const finalProducts = user ? await applyUserOffersToProducts(products) : products;
          setTopSellingProducts(finalProducts);
          setFilteredProducts(finalProducts);
          setCurrentMonth(new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }));
        }
      } catch (err) {
        // Solo mostrar error si es un error real, no si simplemente no hay productos
        if (err.response && err.response.data && err.response.data.error) {
          setError(err.response.data.error);
        } else {
          setError('Error al cargar productos más vendidos');
        }
        setTopSellingProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadTopSellingProducts();
  }, [user]);

  // Process products (filter and sort)
  const processedProducts = useMemo(() => {
    if (topSellingProducts.length === 0) return [];

    let filtered = filterProducts(topSellingProducts, filters);
    const sorted = sortProducts(filtered, sortBy);

    return sorted;
  }, [topSellingProducts, filters, sortBy, filterProducts, sortProducts]);

  // Update filtered products when processed products change
  useEffect(() => {
    setFilteredProducts(processedProducts);
  }, [processedProducts]);

  // Event handlers
  const toggleFilterModal = useCallback(() => {
    setIsFilterModalOpen(prev => !prev);
  }, []);

  const handleSortChange = useCallback((e) => {
    setSortBy(e.target.value);
  }, []);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    try {
      sessionStorage.setItem('destacadosPageFilters', JSON.stringify(newFilters));
    } catch (e) {
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    const defaultFilters = {
      catalog: 'Seleccione',
      availability: 'todos',
      category: '',
      department: 'Todos los departamentos',
      sector: 'Todos los sectores',
      sizes: [],
      colors: [],
      priceRange: { min: 0, max: 0 }
    };
    setFilters(defaultFilters);
    try {
      sessionStorage.removeItem('destacadosPageFilters');
    } catch (e) {
    }
  }, []);

  const handleFavoriteToggle = (productId) => {
    // TODO: Implementar toggle de favoritos
  };

  // Infinite scroll
  const infiniteScroll = useInfiniteScroll(filteredProducts, 20);

  // Reset infinite scroll cuando cambian los productos
  useEffect(() => {
    infiniteScroll.reset();
  }, [filteredProducts.length]);

  const totalResults = filteredProducts.length;

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Más Vendidos - Cherry Central</title>
        </Helmet>

        <main className="destacados-page">
          <div className="container">
            <div className="destacados-loading">
              <div className="loading-spinner"></div>
              <p>Cargando productos más vendidos...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  const location = useLocation();
  const canonicalUrl = `https://cherrydistribuidores.com.mx${location.pathname}`;

  return (
    <>
      <Helmet>
        <title>Productos Más Vendidos - Cherry Central</title>
        <meta name="description" content="Descubre los productos más vendidos del mes en Cherry Central. Los favoritos de nuestros clientes." />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      <main className="destacados-page">
        <div className="container">
          {/* Header section with title and filters - MOBILE */}
          <div className="destacados-page__header-mobile">
            <div className="destacados-page__title-section">
              <h1 className="destacados-page__title">Productos Más Vendidos</h1>
              <p className="destacados-page__subtitle">{currentMonth}</p>
              <div className='destacados-page__content-texts'>
                <span className="destacados-page__results-count">
                  ({totalResults})
                  <p className="destacados-page__text-results-count">Resultados</p>
                </span>
              </div>
            </div>

            <div className="destacados-page__controls">
              <div className="destacados-page__sort-section">
                <div className="destacados-page__mobile-filter-controls">
                  <button
                    className="destacados-page__mobile-filter-btn"
                    onClick={toggleFilterModal}
                  >
                    <img src={getIconPath('Filter.svg')} alt="Filtros" />
                    <img src={getIconPath('Chevron Down.svg')} alt="Expandir" />
                  </button>
                </div>
               {/*  <label htmlFor="sort-select" className="destacados-page__sort-label">Ordenar por:</label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={handleSortChange}
                  className="destacados-page__sort-select"
                >
                  <option value="más vendidos">Más vendidos</option>
                  <option value="precio-menor">Precio: menor a mayor</option>
                  <option value="precio-mayor">Precio: mayor a menor</option>
                  <option value="nombre-a-z">Nombre: A-Z</option>
                  <option value="nombre-z-a">Nombre: Z-A</option>
                </select> */}
              </div>
            </div>
          </div>

          {/* Header section with title and filters - DESKTOP */}
          <div className="destacados-page__header-desktop">
            <div className="destacados-page__title-section">
              <h1 className="destacados-page__title">Productos Más Vendidos</h1>
              <p className="destacados-page__subtitle">{currentMonth}</p>
              <div className='destacados-page__content-texts'>
                <span className="destacados-page__results-count">
                  ({totalResults})
                  <p className="destacados-page__text-results-count">Resultados</p>
                </span>
              </div>
            </div>

            <div className="destacados-page__controls">
              <div className="destacados-page__sort-section">
                <label htmlFor="sort-select-desktop" className="destacados-page__sort-label">Ordenar por:</label>
                <select
                  id="sort-select-desktop"
                  value={sortBy}
                  onChange={handleSortChange}
                  className="destacados-page__sort-select"
                >
                  <option value="más vendidos">Más vendidos</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="destacados-page__content">
            {/* Filters sidebar - DESKTOP */}
            <aside className="destacados-page__sidebar">
              <CatalogFilter
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                isMobile={false}
                availableColors={availableColors}
                availableSizes={availableSizes}
                catalogs={catalogs}
                catalogLoading={catalogLoading}
                hideCatalogSelector={false}
              />
            </aside>

            {/* Products grid */}
            <main className="destacados-page__products-section">
              {error && (
                <div className="destacados-error">
                  <div className="error-icon">
                    <img src={getIconPath('Alert.svg')} alt="Error" />
                  </div>
                  <h3>Error al cargar productos</h3>
                  <p>{error}</p>
                  <CherryButton
                    variant="outline"
                    size="medium"
                    onClick={() => window.location.reload()}
                  >
                    Reintentar
                  </CherryButton>
                </div>
              )}

              {!error && filteredProducts.length === 0 ? (
                <div className="destacados-empty">
                  <div className="empty-icon">
                    <img src={getIconPath('Bullhorn.svg')} alt="Sin productos" />
                  </div>
                  <h3>No se encontraron productos</h3>
                  <p>Intenta ajustar los filtros de búsqueda</p>
                  <CherryButton
                    variant="outline"
                    size="medium"
                    onClick={handleClearFilters}
                  >
                    Limpiar filtros
                  </CherryButton>
                </div>
              ) : (
                <>
                  <div className="destacados-products-grid">
                    {infiniteScroll.displayedItems.map((product) => (
                      <div key={product.id} className="product-ranking-item">
                        <ProductCard
                          product={product}
                          onFavoriteToggle={handleFavoriteToggle}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Infinite Scroll Loader */}
                  <InfiniteScrollLoader
                    isLoading={infiniteScroll.isLoading}
                    hasMore={infiniteScroll.hasMore}
                    observerTarget={infiniteScroll.observerTarget}
                  />
                </>
              )}
            </main>
          </div>

          {/* Mobile filter modal */}
          {isFilterModalOpen && (
            <div className="destacados-page__filter-modal-overlay" onClick={toggleFilterModal}>
              <div className="destacados-page__filter-modal" onClick={(e) => e.stopPropagation()}>
                <CatalogFilter
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onClearFilters={handleClearFilters}
                  isMobile={true}
                  onClose={toggleFilterModal}
                  availableColors={availableColors}
                  availableSizes={availableSizes}
                  catalogs={catalogs}
                  catalogLoading={catalogLoading}
                  hideCatalogSelector={false}
                />
              </div>
            </div>
          )}

          {/* Sección de información */}
          <div className="destacados-info">
            <div className="info-section">
              <h3>¿Por qué estos productos son los más vendidos?</h3>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Bullhorn.svg')} alt="Demanda" />
                  </div>
                  <h4>Alta demanda</h4>
                  <p>Productos con mayor número de ventas en {currentMonth}</p>
                </div>

                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Award.svg')} alt="Calidad" />
                  </div>
                  <h4>Calidad comprobada</h4>
                  <p>Productos que nuestros clientes eligen una y otra vez</p>
                </div>

                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Shopping Cart.svg')} alt="Tendencia" />
                  </div>
                  <h4>Tendencia actual</h4>
                  <p>Los favoritos del mes que marcan la moda</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </>
  );
};

export default DestacadosPage; 
