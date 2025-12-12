import { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import CatalogFilter from '../components/CatalogFilter/CatalogFilter';
import CatalogProductCard from '../components/CatalogProductCard/CatalogProductCard';
import InfiniteScrollLoader from '../components/InfiniteScrollLoader/InfiniteScrollLoader';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import { getIconPath } from '../utils/assetPaths';
import CustomButton from '../components/CustomButton';
import './NuevosPage.css';
import { applyUserOffersToProducts } from '../api/userOffers';
import { publicCatalogService } from '../services/api';
import api from '../services/api';
import { getProductImageUrl } from '../utils/productImageUtils';

const NuevosPage = () => {
  // State management for filters and products
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('más recientes');
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogs, setCatalogs] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  // Recuperar filtros guardados de sessionStorage
  const getSavedFilters = () => {
    try {
      const saved = sessionStorage.getItem('nuevosPageFilters');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error recuperando filtros:', e);
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

    // Filter by category (usando código)
    if (currentFilters.category && currentFilters.category !== '') {
      filtered = filtered.filter(product => {
        const productLineaId = product.id_linea || product.category_id || product.linea?.id_linea;
        const matches = String(productLineaId) == String(currentFilters.category);
        
        // Debug para primeros productos
        if (filtered.indexOf(product) < 3) {
          console.log('🔍 DEBUG NuevosPage - Filtro de categoría:', {
            productId: product.id,
            productLineaId,
            filterCategory: currentFilters.category,
            matches
          });
        }
        
        return matches;
      });
    }

    // Filter by catalog
    if (currentFilters.catalog && currentFilters.catalog !== '' && currentFilters.catalog != 'Seleccione') {
      filtered = filtered.filter(product => {
        const productCatalogoId = product.catalogoId || product.catalog;
        return String(productCatalogoId) == String(currentFilters.catalog);
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

    // Filter by availability
    if (currentFilters.availability === 'con-existencia') {
      filtered = filtered.filter(product => (product.stock || product.inventario || 0) > 0);
    } else if (currentFilters.availability === 'sin-existencia') {
      filtered = filtered.filter(product => (product.stock || product.inventario || 0) === 0);
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
              return productColorLower === filterColorLower || productColorLower.includes(filterColorLower);
            });
          });
        }
        if (!product.colors || product.colors.length === 0) return false;
        return currentFilters.colors.some(filterColor => {
          const filterColorLower = filterColor.toLowerCase();
          return product.colors.some(productColor => {
            const productColorLower = productColor.toLowerCase();
            return productColorLower === filterColorLower || productColorLower.includes(filterColorLower);
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
              // Exact match only - no partial matching
              return productSizeLower === filterSizeLower;
            });
          });
        }
        if (!product.sizes || product.sizes.length === 0) return false;
        return currentFilters.sizes.some(filterSize => {
          const filterSizeLower = filterSize.toLowerCase().trim();
          return product.sizes.some(productSize => {
            const productSizeLower = productSize.toString().toLowerCase().trim();
            // Exact match only - no partial matching
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
      case 'precio-menor':
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'precio-mayor':
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'más-recientes':
      case 'más recientes':
        return sorted.sort((a, b) => new Date(b.fechaAlta || b.fecha_alta || 0) - new Date(a.fechaAlta || a.fecha_alta || 0));
      case 'más-antiguos':
        return sorted.sort((a, b) => new Date(a.fechaAlta || a.fecha_alta || 0) - new Date(b.fechaAlta || b.fecha_alta || 0));
      case 'nombre-a-z':
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'nombre-z-a':
        return sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      default:
        return sorted;
    }
  }, []);

  // Load catalogs
  useEffect(() => {
    const loadCatalogs = async () => {
      setCatalogLoading(true);
      try {
        const response = await publicCatalogService.getAll();

        let catalogsData = [];

        if (response.data) {
          if (response.data.success && response.data.catalogs) {
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

  // Load products from backend - only new products
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        // Usar el backend local
        const searchResponse = await api.get('/products/search', {
          params: { q: '' }
        });

        if (searchResponse.data.success && searchResponse.data.data.products) {
          const localProducts = searchResponse.data.data.products;
          
          // Calcular fecha límite (45 días atrás)
          const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
          
          // Filtrar solo productos nuevos
          const newProductsRaw = localProducts.filter(product => {
            // Es nuevo si opc_nuevo === 'S' o fecha_alta es reciente
            if (product.opc_nuevo === 'S') return true;
            if (product.fecha_alta) {
              const fechaAlta = new Date(product.fecha_alta);
              return fechaAlta > fortyFiveDaysAgo;
            }
            return false;
          });
          
          // Mapear productos al formato esperado
          const mappedProducts = newProductsRaw.map(product => {
            const rawPrice = product.precio1;
            const numericPrice = typeof rawPrice === 'string' 
              ? parseFloat(rawPrice.replace(/[^\d.-]/g, '')) 
              : parseFloat(rawPrice) || 0;
            
            const productColors = product.detalles 
              ? [...new Set(product.detalles.map(d => d.nombreColor).filter(Boolean))] 
              : [];
            
            const productSizes = product.detalles 
              ? [...new Set(product.detalles.map(d => d.detalle).filter(Boolean))] 
              : [];
            
            let finalPrice = product.price;
            let originalPrice = product.originalPrice;
            let discountPercentage = product.discount;
            
            if (finalPrice === undefined || finalPrice === null || finalPrice === 0) {
              const hasDiscount = product.opc_promo === 'S' && product.desc_promo > 0;
              const originalDiscountPercentage = hasDiscount ? parseFloat(product.desc_promo) : 0;
              discountPercentage = hasDiscount ? Math.max(0, originalDiscountPercentage - 10) : 0;
              originalPrice = hasDiscount && numericPrice > 0 
                ? (numericPrice / (1 - originalDiscountPercentage / 100)) 
                : null;
              finalPrice = hasDiscount && discountPercentage > 0 && numericPrice > 0 
                ? (numericPrice - (numericPrice * (discountPercentage / 100))) 
                : numericPrice;
            }
            
            discountPercentage = discountPercentage !== undefined && discountPercentage !== null 
              ? parseFloat(discountPercentage) 
              : 0;
            
            return {
              id: product.id_articulo || product.id,
              title: product.descripcion || product.title || 'Sin nombre',
              description: product.descripcion || 'Sin descripción',
              price: finalPrice,
              originalPrice: originalPrice,
              discount: discountPercentage,
              image: getProductImageUrl(product.id_articulo || product.id),
              brand: product.marca || 'Sin marca',
              stock: product.inventario || 0,
              inventario: product.inventario || 0,
              colors: productColors.length > 0 ? productColors : ['black'],
              sizes: productSizes.length > 0 ? productSizes : ['M'],
              isNew: true, // Todos son nuevos en esta página
              rating: product.rating || 0,
              ratingCount: product.ratingCount || product.totalRatings || 0,
              id_linea: product.id_linea || product.linea,
              category_id: product.id_linea || product.linea,
              catalogoId: product.catalogoId,
              fechaAlta: product.fecha_alta,
              detalles: product.detalles,
              codigo: product.codigo || product.id_articulo || product.id
            };
          });

          // Aplicar ofertas de usuario
          const productsWithOffers = await applyUserOffersToProducts(mappedProducts);
          
          // Extraer colores y tallas disponibles
          const colorSet = new Set();
          const sizeSet = new Set();
          productsWithOffers.forEach(product => {
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
          
          // Ordenar tallas
          const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
          const sizes = Array.from(sizeSet);
          const sortedSizes = sizes.sort((a, b) => {
            const indexA = sizeOrder.indexOf(a.toUpperCase());
            const indexB = sizeOrder.indexOf(b.toUpperCase());
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
          });
          setAvailableSizes(sortedSizes);
          
          setAllProducts(productsWithOffers);
          setFilteredProducts([...productsWithOffers]);
        } else {
          setAllProducts([]);
          setFilteredProducts([]);
        }
      } catch (error) {
        console.error('Error cargando productos nuevos:', error);
        setAllProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Process products (filter and sort)
  const processedProducts = useMemo(() => {
    if (allProducts.length === 0) return [];
    let filtered = filterProducts(allProducts, filters);
    const sorted = sortProducts(filtered, sortBy);
    return sorted;
  }, [allProducts, filters, sortBy, filterProducts, sortProducts]);

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
      sessionStorage.setItem('nuevosPageFilters', JSON.stringify(newFilters));
    } catch (e) {
      console.error('Error guardando filtros:', e);
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
      sessionStorage.removeItem('nuevosPageFilters');
    } catch (e) {
      console.error('Error limpiando filtros:', e);
    }
  }, []);

  const handleFavoriteToggle = (productId) => {
    // Implementar lógica de favoritos si es necesario
  };

  // Infinite scroll
  const infiniteScroll = useInfiniteScroll(filteredProducts, 20);
  
  // Reset infinite scroll cuando cambian los productos filtrados
  useEffect(() => {
    infiniteScroll.reset();
  }, [filteredProducts.length]);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return (
      (filters.catalog && filters.catalog !== 'Seleccione') ||
      (filters.catalogs && filters.catalogs.length > 0) ||
      (filters.category && filters.category !== '') ||
      (filters.categories && filters.categories.length > 0) ||
      (filters.sizes && filters.sizes.length > 0) ||
      (filters.colors && filters.colors.length > 0) ||
      (filters.priceRange && (filters.priceRange.min > 0 || filters.priceRange.max > 0)) ||
      (filters.availability && filters.availability !== 'todos') ||
      (filters.department && filters.department !== 'Todos los departamentos') ||
      (filters.sector && filters.sector !== 'Todos los sectores')
    );
  };

  const totalResults = filteredProducts.length;

  return (
    <>
      <Helmet>
        <title>Productos Nuevos - Cherry Central</title>
        <meta name="description" content="Descubre los productos más nuevos de Cherry Central" />
      </Helmet>

      <div className="nuevos-page">
        <div className="container">
          {/* Header section with title and filters  -  MOBILE */}
          <div className="nuevos-page__header-mobile">
            {!hasActiveFilters() && (
              <div className="nuevos-page__title-section">
                <h1 className="nuevos-page__title">Productos Nuevos</h1>
                <div className='nuevos-page__content-texts'>
                  <span className="nuevos-page__results-count">
                    ({totalResults})
                    <p className="nuevos-page__text-results-count">Resultados</p>
                  </span>
                </div>
              </div>
            )}

            <div className="nuevos-page__controls">
              <div className="nuevos-page__sort-section">
                <div className="nuevos-page__mobile-filter-controls">
                  <button
                    className="nuevos-page__mobile-filter-btn"
                    onClick={toggleFilterModal}
                  >
                    <img src={getIconPath('Filter.svg')} alt="Filtros" />
                    <img src={getIconPath('Chevron Down.svg')} alt="Expandir" />
                  </button>
                </div>
                <label htmlFor="sort-select" className="nuevos-page__sort-label">Ordenar por:</label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={handleSortChange}
                  className="nuevos-page__sort-select"
                >
                  <option value="más recientes">más recientes</option>
                  <option value="precio-menor">Precio: menor a mayor</option>
                  <option value="precio-mayor">Precio: mayor a menor</option>
                  <option value="nombre-a-z">Nombre: A-Z</option>
                  <option value="nombre-z-a">Nombre: Z-A</option>
                </select>
              </div>
            </div>
          </div>

          {/* Header section with title and filters  -  DESKTOP */}
          <div className="nuevos-page__header-desktop">
            {!hasActiveFilters() && (
              <div className="nuevos-page__title-section">
                <h1 className="nuevos-page__title">Productos Nuevos</h1>
                <div className='nuevos-page__content-texts'>
                  <span className="nuevos-page__results-count">
                    ({totalResults})
                    <p className="nuevos-page__text-results-count">Resultados</p>
                  </span>
                </div>
              </div>
            )}

            <div className="nuevos-page__controls">
              <div className="nuevos-page__sort-section">
                <label htmlFor="sort-select-desktop" className="nuevos-page__sort-label">Ordenar por:</label>
                <select
                  id="sort-select-desktop"
                  value={sortBy}
                  onChange={handleSortChange}
                  className="nuevos-page__sort-select"
                >
                  <option value="más recientes">más recientes</option>
                  <option value="precio-menor">Precio: menor a mayor</option>
                  <option value="precio-mayor">Precio: mayor a menor</option>
                  <option value="nombre-a-z">Nombre: A-Z</option>
                  <option value="nombre-z-a">Nombre: Z-A</option>
                </select>
              </div>
              <CustomButton
                variant="filled"
                size="medium"
                iconLeft={<img src={getIconPath('Whatsapp.svg')} alt="Compartir productos nuevos" style={{ width: 16, height: 16 }} />}
                onClick={() => {
                  const text = `¡Mira los productos más nuevos de Cherry Central! ${window.location.href}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                }}
              >
                <span className="nuevos-page__whatsapp-text">Compartir a clientes</span>
              </CustomButton>
            </div>
          </div>

          {/* Main content */}
          <div className="nuevos-page__content">
            {/* Filters sidebar - DESKTOP */}
            <aside className="nuevos-page__sidebar">
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
            <main className="nuevos-page__products-section">
              {loading ? (
                <div className="nuevos-page__loading">
                  <div className="nuevos-page__loading-spinner"></div>
                  <p>Cargando productos nuevos...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="nuevos-page__no-results">
                  <h3>No se encontraron productos</h3>
                  <p>Intenta ajustar los filtros de búsqueda</p>
                </div>
              ) : (
                <>
                  <div className="nuevos-page__products-grid">
                    {infiniteScroll.displayedItems.map((product) => (
                      <CatalogProductCard
                        key={product.id}
                        product={product}
                        onFavoriteToggle={handleFavoriteToggle}
                      />
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
            <div className="nuevos-page__filter-modal-overlay" onClick={toggleFilterModal}>
              <div className="nuevos-page__filter-modal" onClick={(e) => e.stopPropagation()}>
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
        </div>
      </div>
    </>
  );
};

export default NuevosPage;
