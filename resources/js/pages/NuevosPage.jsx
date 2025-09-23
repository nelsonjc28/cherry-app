import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import CatalogFilter from '../components/CatalogFilter/CatalogFilter';
import CatalogProductCard from '../components/CatalogProductCard/CatalogProductCard';
import { getIconPath } from '../utils/assetPaths';
import CustomButton from '../components/CustomButton';
import './CatalogPage.css';
import { 
  getAllProducts, 
  getProductsWithRatings,
  mapApiProductToAppProduct,
  getAvailableColors,
  getAvailableSizes
} from '../api/cherryApi';
import { publicCatalogService } from '../services/api';
import { getProductImageUrl } from '../utils/productImageUtils';

const NuevosPage = () => {
  // State management for filters and products
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('más recientes');
  const [allProducts, setAllProducts] = useState([]); // Store all products
  const [filteredProducts, setFilteredProducts] = useState([]); // Store filtered products
  const [loading, setLoading] = useState(true);
  const [catalogs, setCatalogs] = useState([]); // Store all available catalogs
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [filters, setFilters] = useState({
    catalog: 'Seleccione',
    availability: 'todos',
    category: 'Todas las categorías',
    department: 'Todos los departamentos',
    sector: 'Todos los sectores',
    sizes: [],
    colors: [],
    priceRange: { min: 0, max: 0 }
  });


  // Function to get available categories from products
  const getAvailableCategories = (products) => {
    const categorySet = new Set();
    products.forEach(product => {
      if (product.category && product.category.trim()) {
        categorySet.add(product.category.trim());
      }
    });
    return Array.from(categorySet).sort();
  };

  // Function to get available departments from products
  const getAvailableDepartments = (products) => {
    const departmentSet = new Set();
    products.forEach(product => {
      if (product.department && product.department.trim()) {
        departmentSet.add(product.department.trim());
      }
    });
    return Array.from(departmentSet).sort();
  };

  // Function to get available sectors from products
  const getAvailableSectors = (products) => {
    const sectorSet = new Set();
    products.forEach(product => {
      if (product.sector && product.sector.trim()) {
        sectorSet.add(product.sector.trim());
      }
    });
    return Array.from(sectorSet).sort();
  };

  // Function to get price range from products
  const getPriceRange = (products) => {
    if (!products || products.length === 0) return { min: 0, max: 0 };
    
    const prices = products.map(p => p.price || 0).filter(p => p > 0);
    if (prices.length === 0) return { min: 0, max: 0 };
    
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
  };

  // Function to apply filters
  const applyFilters = (products, currentFilters) => {
    let filtered = [...products];

    // Filter by catalog
    if (currentFilters.catalog && currentFilters.catalog !== 'Todos los catálogos' && currentFilters.catalog !== 'Seleccione') {
      filtered = filtered.filter(product => {
        // Verificar si el producto pertenece al catálogo seleccionado
        const productCatalog = product.catalog || product.catalogue || product.catalogName || '';
        return productCatalog.toLowerCase().includes(currentFilters.catalog.toLowerCase()) ||
               product.catalogId === currentFilters.catalog ||
               product.catalog_id === currentFilters.catalog;
      });
    }

    // Filter by category (if not "Todas las categorías")
    if (currentFilters.category && currentFilters.category !== 'Todas las categorías') {
      filtered = filtered.filter(product => {
        const productCategory = product.category?.toLowerCase() || '';
        const filterCategory = currentFilters.category.toLowerCase();
        return productCategory.includes(filterCategory);
      });
    }

    // Filter by sector (if not "Todos los sectores")
    if (currentFilters.sector && currentFilters.sector !== 'Todos los sectores') {
      const sectorLower = currentFilters.sector.toLowerCase();
      filtered = filtered.filter(product => {
        const productSector = product.sector?.toLowerCase() || '';
        return productSector.includes(sectorLower);
      });
    }

    // Filter by department (if not "Todos los departamentos")
    if (currentFilters.department && currentFilters.department !== 'Todos los departamentos') {
      const departmentLower = currentFilters.department.toLowerCase();
      filtered = filtered.filter(product => {
        const productCategory = product.category?.toLowerCase() || '';
        const productTitle = product.title?.toLowerCase() || '';
        const productDescription = product.description?.toLowerCase() || '';
        
        // Map departments to categories
        const departmentCategoryMap = {
          'ropa casual': ['blusa', 'camisa', 'pantalon', 'jeans', 'vestido casual'],
          'ropa formal': ['vestido', 'traje', 'blazer', 'camisa formal'],
          'ropa deportiva': ['deportivo', 'gym', 'fitness', 'running'],
          'accesorios': ['accesorio', 'bolsa', 'cartera', 'cinturon', 'collar'],
          'calzado': ['zapato', 'tenis', 'sandalias', 'botas']
        };
        
        const departmentCategories = departmentCategoryMap[departmentLower] || [];
        return departmentCategories.some(cat => 
          productCategory.includes(cat) || 
          productTitle.includes(cat) || 
          productDescription.includes(cat)
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
      filtered = filtered.filter(product => product.stock > 0);
    } else if (currentFilters.availability === 'sin-existencia') {
      filtered = filtered.filter(product => product.stock === 0);
    }

    // Filter by colors
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

    // Filter by sizes
    if (currentFilters.sizes && currentFilters.sizes.length > 0) {
      filtered = filtered.filter(product => {
        if (!product.sizes || product.sizes.length === 0) return false;
        
        return currentFilters.sizes.some(filterSize => {
          const filterSizeLower = filterSize.toLowerCase();
          return product.sizes.some(productSize => {
            const productSizeLower = productSize.toString().toLowerCase();
            return productSizeLower === filterSizeLower || 
                   productSizeLower.includes(filterSizeLower);
          });
        });
      });
    }

    return filtered;
  };

  // Function to sort products
  const sortProducts = (products, sortOption) => {
    if (!products || products.length === 0) return [];

    const sorted = [...products];

    switch (sortOption) {
      case 'precio-menor':
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'precio-mayor':
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'más-recientes':
        return sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      case 'más-antiguos':
        return sorted.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
      case 'nombre-a-z':
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'nombre-z-a':
        return sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      default:
        return sorted;
    }
  };

  // Load catalogs
  useEffect(() => {
    const loadCatalogs = async () => {
      setCatalogLoading(true);
      try {
        const response = await publicCatalogService.getAll();
        
        // Manejar diferentes estructuras de respuesta
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
          // Mostrar todos los catálogos sin filtrar por estado activo
          setCatalogs(catalogsData);
          
          // No establecer automáticamente un catálogo, dejar "Seleccione"
        } else {
          setCatalogs([]);
        }
      } catch (error) {
        console.error('Error loading catalogs:', error);
        setCatalogs([]);
      } finally {
        setCatalogLoading(false);
      }
    };

    loadCatalogs();
  }, []);

  // Cargar colores y tallas disponibles
  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        const [colors, sizes] = await Promise.all([
          getAvailableColors(),
          getAvailableSizes()
        ]);
        
        setAvailableColors(colors);
        setAvailableSizes(sizes);
      } catch (error) {
        console.error('Error cargando datos de filtros:', error);
        setAvailableColors([]);
        setAvailableSizes([]);
      }
    };

    loadFiltersData();
  }, []);

  // Load products - only new products
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        // Obtener todos los productos de la API externa
        const response = await fetch('https://cherryapi.estrategiadmgs.com.mx/cherryApi/');
        const externalData = await response.json();
        
        // Filtrar solo productos nuevos (opc_nuevo === 'S')
        const newProducts = externalData.filter(product => product.opc_nuevo === 'S');
        
        // Mapear productos nuevos
        const mappedNewProducts = newProducts.map(product => {
          const numericPrice = parseFloat(product.precio1) || 0;
          const originalPrice = parseFloat(product.precio2) || numericPrice;
          const discountPercentage = originalPrice > numericPrice ? 
            Math.round(((originalPrice - numericPrice) / originalPrice) * 100) : 0;
          
          // Obtener colores disponibles
          const availableColors = [];
          if (product.colores) {
            try {
              const colorsData = JSON.parse(product.colores);
              if (Array.isArray(colorsData)) {
                colorsData.forEach(color => {
                  if (color && color.trim()) {
                    availableColors.push(color.trim());
                  }
                });
              }
            } catch (e) {
              // Si no se puede parsear, usar el valor directo
              if (product.colores.trim()) {
                availableColors.push(product.colores.trim());
              }
            }
          }
          
          // Obtener tallas disponibles
          const availableSizes = [];
          if (product.tallas) {
            try {
              const sizesData = JSON.parse(product.tallas);
              if (Array.isArray(sizesData)) {
                sizesData.forEach(size => {
                  if (size && size.trim()) {
                    availableSizes.push(size.trim());
                  }
                });
              }
            } catch (e) {
              // Si no se puede parsear, usar el valor directo
              if (product.tallas.trim()) {
                availableSizes.push(product.tallas.trim());
              }
            }
          }
          
          // Determinar si es producto nuevo
          const isNewProduct = product.opc_nuevo === 'S';
          
          return {
            id: product.id_articulo,
            title: product.descripcion || 'Sin nombre',
            description: product.descripcion || 'Sin descripción',
            price: numericPrice,
            originalPrice: originalPrice,
            discount: discountPercentage,
            image: getProductImageUrl(product.id_articulo),
            brand: product.marca || 'Sin marca',
            category: product.linea?.nombre || 'Sin categoría',
            stock: product.inventario || 0,
            colors: availableColors,
            colores: availableColors,
            tallas: availableSizes,
            isNew: isNewProduct,
            rating: 0,
            ratingCount: 0,
            linea: product.linea,
            fechaAlta: product.fecha_alta,
            fechaAct: product.fechaAct,
            temporada: product.temporada,
            opcNuevo: product.opc_nuevo,
            opcPromo: product.opc_promo,
            descPromo: product.desc_promo
          };
        });
        
        setAllProducts(mappedNewProducts);
        setFilteredProducts(mappedNewProducts);
        
        // Actualizar filtros disponibles
        if (mappedNewProducts.length > 0) {
          const availableColors = getAvailableColors(mappedNewProducts);
          const availableSizes = getAvailableSizes(mappedNewProducts);
          const availableCategories = getAvailableCategories(mappedNewProducts);
          const availableDepartments = getAvailableDepartments(mappedNewProducts);
          const availableSectors = getAvailableSectors(mappedNewProducts);
          const priceRange = getPriceRange(mappedNewProducts);
          
          setFilters(prev => ({
            ...prev,
            colors: availableColors,
            sizes: availableSizes,
            priceRange: priceRange
          }));
        }
        
      } catch (error) {
        console.error('Error loading new products:', error);
        setAllProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Apply filters and sorting when filters or sortBy changes
  useEffect(() => {
    if (allProducts.length > 0) {
      let filtered = applyFilters(allProducts, filters);
      let sorted = sortProducts(filtered, sortBy);
      setFilteredProducts(sorted);
    }
  }, [allProducts, filters, sortBy]);

  // Handler for filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Handler for clearing all filters
  const handleClearFilters = () => {
    setFilters({
      catalog: 'Seleccione',
      availability: 'todos',
      category: 'Todas las categorías',
      department: 'Todos los departamentos',
      sector: 'Todos los sectores',
      sizes: [],
      colors: [],
      priceRange: { min: 0, max: 0 }
    });
  };

  // Handler for sort changes
  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
  };

  // Handler for favorite toggle
  const handleFavoriteToggle = (productId) => {
    // Implementar lógica de favoritos si es necesario

  };

  // Get current products to display
  const currentProducts = filteredProducts;

  return (
    <>
      <Helmet>
        <title>Productos Nuevos - Cherry Central</title>
        <meta name="description" content="Descubre los productos más nuevos de Cherry Central" />
        <meta name="keywords" content="productos nuevos, moda femenina, cherry central, novedades" />
      </Helmet>

      <div className="catalog-page">
        {/* Header section with title and filters  -  DESKTOP */}
        <div className="catalog-page__header-desktop">
          <div className="catalog-page__title-section">
            <h1 className="catalog-page__title">
              Productos Nuevos
            </h1>
            <div className='catalog-page__content-texts'>
              <span className="catalog-page__results-count">
                ({currentProducts.length})
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
              <span className="catalog-page__whatsapp-text">Compartir a clientes</span>
            </CustomButton>
          </div>
            </div>

        {/* Main content */}
        <div className="catalog-page__content">
          {/* Filters sidebar - DESKTOP */}
          <aside className="catalog-page__sidebar">
            <CatalogFilter
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              isMobile={false}
              catalogs={catalogs}
              catalogLoading={catalogLoading}
              hideCatalogSelector={true}
              availableColors={availableColors}
              availableSizes={availableSizes}
            />
          </aside>

          {/* Products grid */}
          <main className="catalog-page__products-section">
            {loading ? (
              <div className="catalog-page__loading">
                <div className="catalog-page__loading-spinner"></div>
                <p>Cargando productos nuevos...</p>
                </div>
            ) : currentProducts.length === 0 ? (
              <div className="catalog-page__no-results">
                <h3>No se encontraron productos nuevos</h3>
                <p>Intenta ajustar los filtros de búsqueda</p>
              </div>
            ) : (
              <>
                <div className="catalog-page__products-grid">
                  {currentProducts.map((product, index) => {
                    return (
                      <CatalogProductCard
                    key={product.id}
                    product={product}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                    );
                  })}
              </div>
              </>
            )}
          </main>
                </div>
                
        {/* Mobile filter modal */}
        {isFilterModalOpen && (
          <div className="catalog-page__filter-modal">
            <div className="catalog-page__filter-modal-content">
              <div className="catalog-page__filter-modal-header">
                <h3>Filtros</h3>
                <button
                  className="catalog-page__filter-modal-close"
                  onClick={() => setIsFilterModalOpen(false)}
                >
                  ×
                </button>
              </div>
              <CatalogFilter
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                isMobile={true}
                catalogs={catalogs}
                catalogLoading={catalogLoading}
                hideCatalogSelector={true}
                availableColors={availableColors}
                availableSizes={availableSizes}
              />
            </div>
          </div>
        )}
        </div>
    </>
  );
};

export default NuevosPage; 
