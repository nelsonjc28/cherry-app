import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import CatalogFilter from '../components/CatalogFilter/CatalogFilter';
import CatalogProductCard from '../components/CatalogProductCard/CatalogProductCard';
import { getIconPath } from '../utils/assetPaths';
import CustomButton from '../components/CustomButton';
import './CatalogPage.css';
import { 
  getProductsByCategory, 
  getAllProducts, 
  getAvailableCategories, 
  mapApiProductToAppProduct, 
  getProductsByAvailability,
  searchProductsAdvanced,
  getProductsWithRatings
} from '../api/cherryApi';
import { catalogService, publicCatalogService } from '../services/api';
import { getProductImageUrl } from '../utils/productImageUtils';

const CatalogPage = ({ catalogId }) => {
  // Debug: verificar que estamos recibiendo el catalogId
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || 'all';
  const colorFilter = searchParams.get('color') || '';
  const dtuFilter = searchParams.get('dtu') || '';
  
  // State management for filters and products
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('más recientes');
  const [allProducts, setAllProducts] = useState([]); // Store all products
  const [filteredProducts, setFilteredProducts] = useState([]); // Store filtered products
  const [loading, setLoading] = useState(true);
  const [catalogs, setCatalogs] = useState([]); // Store all available catalogs
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [currentCatalog, setCurrentCatalog] = useState(null); // Store current catalog info
  const [filters, setFilters] = useState({
    catalog: '',
    availability: 'todos',
    category: 'Todas las categorías',
    department: 'Todos los departamentos',
    sector: 'Todos los sectores',
    sizes: [],
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
        const productTitle = product.title?.toLowerCase() || '';
        const productDescription = product.description?.toLowerCase() || '';
        
        return productCategory.includes(categoryLower) || 
               productTitle.includes(categoryLower) ||
               productDescription.includes(categoryLower);
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

    // Filter by availability
    if (currentFilters.availability === 'con-existencia') {
      filtered = filtered.filter(product => product.stock > 0);
    } else if (currentFilters.availability === 'sin-existencia') {
      filtered = filtered.filter(product => product.stock === 0);
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
      // Si tenemos catalogId, no necesitamos cargar todos los catálogos
      if (catalogId) {
        setCatalogLoading(false);
        return;
      }

      setCatalogLoading(true);
      try {
        const response = await catalogService.getAll();
        if (response.data.success) {
          const availableCatalogs = response.data.data.catalogs.filter(catalog => catalog.status === 'active');
          setCatalogs(availableCatalogs);
          
          if (availableCatalogs.length > 0) {
            // Usar el primer catálogo disponible
            setFilters(prev => ({
              ...prev,
              catalog: availableCatalogs[0].name
            }));
          }
        }
      } catch (error) {
        setCatalogs([]);
      } finally {
        setCatalogLoading(false);
      }
    };

    loadCatalogs();
  }, [catalogId]);

  // Load products based on category, catalog and availability
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        let productsData;
        
        // Si se proporciona catalogId, cargar productos de ese catálogo específico
        if (catalogId) {
          console.log(`🚀 Iniciando carga para catálogo ID: ${catalogId}`);
          try {
            // Cargar información del catálogo
            const catalogResponse = await publicCatalogService.getById(catalogId);
            console.log('📋 Respuesta del catálogo:', catalogResponse.data);
            if (catalogResponse.data.success) {
              setCurrentCatalog(catalogResponse.data.data);
              console.log('✅ Catálogo cargado:', catalogResponse.data.data);
            }
            
            // Cargar productos del catálogo local (si existen)
            let localProducts = [];
            try {
              const localResponse = await publicCatalogService.getProducts(catalogId);
              if (localResponse.data.success) {
                localProducts = localResponse.data.data.products.map(product => ({
                  id: product.external_product_id,
                  title: product.product_name,
                  description: product.product_description,
                  price: product.product_price,
                  image: getProductImageUrl(product.external_product_id),
                  brand: product.product_metadata?.marca,
                  category: product.product_category,
                  stock: product.product_metadata?.inventario || 0,
                  colors: [],
                  isNew: false,
                  rating: 0,
                  ratingCount: 0,
                  source: 'local'
                }));
              }
            } catch (error) {
              console.log('No hay productos locales en este catálogo');
            }
            
            // Cargar productos externos y filtrar por código del catálogo
            let externalProducts = [];
            try {
              console.log('🌐 Iniciando carga de productos externos...');
              const externalResponse = await fetch('https://cherryapi.estrategiadmgs.com.mx/cherryApi/');
              if (externalResponse.ok) {
                const externalData = await externalResponse.json();
                console.log(`📦 Total de productos en API externa: ${externalData.length}`);
                
                // Filtrar productos por código del catálogo
                const catalogCode = catalogResponse.data.success ? catalogResponse.data.data.code : null;
                console.log(`🔍 Código del catálogo a filtrar: ${catalogCode}`);
                
                if (catalogCode) {
                  // Mostrar algunos productos para debug
                  const sampleProducts = externalData.slice(0, 3);
                  console.log('📋 Muestra de productos de la API:', sampleProducts.map(p => ({
                    id: p.id_articulo,
                    catalogoId: p.catalogoId,
                    descripcion: p.descripcion
                  })));
                  
                  externalProducts = externalData
                    .filter(product => product.catalogoId == catalogCode)
                    .map(product => ({
                      id: product.id_articulo,
                      title: product.descripcion || product.nombre_articulo,
                      description: product.descripcion || product.nombre_articulo,
                      price: product.precio1 || 0,
                      image: getProductImageUrl(product.id_articulo),
                      brand: product.marca,
                      category: product.categoria,
                      stock: product.inventario || 0,
                      colors: [],
                      isNew: false,
                      rating: 0,
                      ratingCount: 0,
                      source: 'external',
                      catalogoId: product.catalogoId
                    }));
                  
                  console.log(`✅ Productos externos filtrados por código ${catalogCode}: ${externalProducts.length}`);
                } else {
                  console.log('❌ No se pudo obtener el código del catálogo');
                }
              } else {
                console.log(`❌ Error en respuesta de API externa: ${externalResponse.status}`);
              }
            } catch (error) {
              console.log('❌ Error al cargar productos externos:', error);
            }
            
            // Combinar productos locales y externos
            productsData = [...localProducts, ...externalProducts];
            
            console.log('📊 RESUMEN FINAL:');
            console.log(`   - Productos locales: ${localProducts.length}`);
            console.log(`   - Productos externos: ${externalProducts.length}`);
            console.log(`   - Total combinado: ${productsData.length}`);
            console.log('   - Productos finales:', productsData.map(p => ({ id: p.id, title: p.title, source: p.source })));
            
            // Si no hay productos, intentar cargar productos por temporada como fallback
            const catalogName = catalogResponse.data.success ? catalogResponse.data.data.name : null;
            if (productsData.length === 0 && catalogName) {
              try {
                const fallbackResponse = await fetch('https://cherryapi.estrategiadmgs.com.mx/cherryApi/');
                if (fallbackResponse.ok) {
                  const fallbackData = await fallbackResponse.json();
                  
                  // Filtrar por temporada (nombre del catálogo)
                  const fallbackProducts = fallbackData
                    .filter(product => product.temporada === catalogName)
                    .map(product => ({
                      id: product.id_articulo,
                      title: product.descripcion || product.nombre_articulo,
                      description: product.descripcion || product.nombre_articulo,
                      price: product.precio1 || 0,
                      image: getProductImageUrl(product.id_articulo),
                      brand: product.marca,
                      category: product.categoria,
                      stock: product.inventario || 0,
                      colors: [],
                      isNew: false,
                      rating: 0,
                      ratingCount: 0,
                      source: 'external_fallback',
                      temporada: product.temporada
                    }));
                  
                  productsData = fallbackProducts;
                }
              } catch (error) {
                console.log('Error en fallback por temporada:', error);
              }
            }
          } catch (error) {
            console.error('Error al cargar productos del catálogo:', error);
            productsData = [];
          }
        } else {
          // Solo cargar productos si tenemos un catálogo seleccionado
          if (!filters.catalog) {
            setLoading(false);
            return;
          }
          
          // Carga normal de productos
          if (category === 'all') {
            // Load all products with ratings optimized
            productsData = await getProductsWithRatings(filters.catalog);
          } else {
            // Para categorías específicas, obtener por categoría
            productsData = await getProductsByCategory(category, filters.catalog);
          }
        }
        
        // Filtrar productos nulos
        const validProducts = productsData.filter(p => p !== null);
        
        setAllProducts(validProducts);
        setFilteredProducts(validProducts);
      } catch (error) {
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [category, filters.catalog, catalogId]);

  // Apply filters and sorting when filters or sortBy changes
  useEffect(() => {
    if (allProducts.length > 0) {
      let filtered = filterProducts(allProducts, filters);
      
      // Apply color filter from URL
      if (colorFilter) {
        const colorFilters = colorFilter.split(',').map(c => c.trim());
        filtered = filtered.filter(product => {
          if (!product.colors || product.colors.length === 0) return false;
          
          return colorFilters.some(filterColor => {
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
      
      // Apply DTU filter from URL
      if (dtuFilter) {
        const dtuFilters = dtuFilter.split(',').map(d => d.trim());
        filtered = filtered.filter(product => {
          return dtuFilters.some(filterDtu => {
            const filterDtuLower = filterDtu.toLowerCase();
            return (
              (product.dtu && product.dtu.toLowerCase().includes(filterDtuLower)) ||
              (product.DTU && product.DTU.toLowerCase().includes(filterDtuLower))
            );
          });
        });
      }
      
      filtered = sortProducts(filtered, sortBy);
      setFilteredProducts(filtered);
    }
  }, [filters.category, filters.department, filters.sector, filters.sizes, filters.priceRange, sortBy, allProducts, colorFilter, dtuFilter]);

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
      catalog: catalogs.length > 0 ? catalogs[0].name : '',
      availability: 'todos',
      category: 'Todas las categorías',
      department: 'Todos los departamentos',
      sector: 'Todos los sectores',
      sizes: [],
      priceRange: { min: 0, max: 0 }
    });
  };

  // Handle favorite toggle
  const handleFavoriteToggle = (productId) => {
    // Implement favorite functionality here
  };

  // Handle share functionality
  const handleShareCatalog = () => {
    const catalogUrl = `${window.location.origin}/catalogo`;
    
    if (navigator.share) {
      // Use native sharing if available
      navigator.share({
        title: 'Catálogo de productos Cherry',
        text: 'Explora nuestro catálogo completo de productos Cherry. Encuentra las últimas tendencias en moda y accesorios.',
        url: catalogUrl
      });
    } else {
      // Fallback to clipboard copy
      copyToClipboard(catalogUrl);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      if (window.showToast) {
        window.showToast('Enlace del catálogo copiado al portapapeles', 'success');
      }
    } catch (err) {
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      if (window.showToast) {
        window.showToast('Enlace del catálogo copiado al portapapeles', 'success');
      }
    }
  };

  const totalResults = filteredProducts.length;
  const currentProducts = filteredProducts;

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
                {currentCatalog ? currentCatalog.name : 'Catálogo de productos'}
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
                  <option value="nombre-a-z">Nombre: A-Z</option>
                  <option value="nombre-z-a">Nombre: Z-A</option>
                </select>
              </div>
            </div>
          </div>

          {/* Header section with title and filters  -  DESKTOP */}
          <div className="catalog-page__header-desktop">
            <div className="catalog-page__title-section">
              <h1 className="catalog-page__title">
                {currentCatalog ? currentCatalog.name : 'Catálogo de productos'}
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
                  <option value="precio-menor">Precio: menor a mayor</option>
                  <option value="precio-mayor">Precio: mayor a menor</option>
                  <option value="nombre-a-z">Nombre: A-Z</option>
                  <option value="nombre-z-a">Nombre: Z-A</option>
                </select>
              </div>
              <div className="catalog-page__action-buttons">
                {currentCatalog?.pdf_images && currentCatalog.pdf_images.length > 0 && (
                  <CustomButton
                    variant="outline"
                    size="medium"
                    className="catalog-page__pdf-btn"
                    iconLeft={<span style={{ fontSize: '16px' }}>📄</span>}
                    onClick={() => window.location.href = `/catalogo-pdf?id=${catalogId}`}
                  >
                    <span className="catalog-page__pdf-text">Catálogo PDF</span>
                  </CustomButton>
                )}
                <CustomButton
                  variant="filled"
                  size="medium"
                  iconLeft={<img src={getIconPath('Whatsapp.svg')} alt="Comparar clientes" style={{ width: 16, height: 16 }} />}
                  onClick={handleShareCatalog}
                >
                  <span className="catalog-page__whatsapp-text">Compartir a clientes</span>
                </CustomButton>
              </div>
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
                hideCatalogSelector={!!catalogId}
              />
            </aside>

            {/* Products grid */}
            <main className="catalog-page__products-section">
              {loading ? (
                <div className="catalog-page__loading">
                  <div className="catalog-page__loading-spinner"></div>
                  <p>Cargando productos...</p>
                </div>
              ) : currentProducts.length === 0 ? (
                <div className="catalog-page__no-results">
                  <h3>No se encontraron productos</h3>
                  <p>Intenta ajustar los filtros de búsqueda</p>
                </div>
              ) : (
                <>
                  <div className="catalog-page__products-grid">
                    {currentProducts.map((product) => (
                      <CatalogProductCard
                        key={product.id}
                        product={product}
                        onFavoriteToggle={handleFavoriteToggle}
                      />
                    ))}
                  </div>
                  
                </>
              )}
            </main>
          </div>

          {/* Mobile filter modal */}
          {isFilterModalOpen && (
            <div className="catalog-page__filter-modal-overlay" onClick={toggleFilterModal}>
            <div className="catalog-page__filter-modal">
              <CatalogFilter
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                isMobile={true}
                onClose={toggleFilterModal}
                catalogs={catalogs}
                catalogLoading={catalogLoading}
                hideCatalogSelector={!!catalogId}
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