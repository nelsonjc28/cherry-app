import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  getProductsWithRatings,
  getAvailableColors,
  getAvailableSizes
} from '../api/cherryApi';
import { catalogService, publicCatalogService } from '../services/api';
import { getProductImageUrl } from '../utils/productImageUtils';

const CatalogPage = ({ catalogId }) => {

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
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
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

  // Function to filter products based on current filters - Memoized
  const filterProducts = useCallback((products, currentFilters) => {
    
    if (!products || products.length === 0) {
      console.log('🔍 DEBUG filterProducts - No hay productos para filtrar');
      return [];
    }

    console.log('🔍 DEBUG filterProducts - Iniciando con', products.length, 'productos');
    console.log('🔍 DEBUG filterProducts - Filtros recibidos:', JSON.stringify(currentFilters, null, 2));
    let filtered = [...products];


    // Filter by category (if not "Todas las categorías")
    if (currentFilters.category && currentFilters.category !== 'Todas las categorías') {
      const categoryLower = currentFilters.category.toLowerCase();
      console.log('🔍 DEBUG filterProducts - Filtro de categoría:', categoryLower);
      const beforeCategory = filtered.length;
      filtered = filtered.filter(product => {
        const productCategory = product.category?.toLowerCase() || '';
        const productTitle = product.title?.toLowerCase() || '';
        const productDescription = product.description?.toLowerCase() || '';
        
        return productCategory.includes(categoryLower) || 
               productTitle.includes(categoryLower) ||
               productDescription.includes(categoryLower);
      });
      console.log(`🔍 DEBUG filterProducts - Después de filtro categoría: ${beforeCategory} -> ${filtered.length}`);
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
      console.log('🔍 DEBUG filterProducts - Filtro de precio:', currentFilters.priceRange);
      const beforePrice = filtered.length;
      filtered = filtered.filter(product => {
        const price = product.price || 0;
        const minPrice = currentFilters.priceRange.min || 0;
        const maxPrice = currentFilters.priceRange.max || 0;
        
        let passes = false;
        if (maxPrice > 0) {
          passes = price >= minPrice && price <= maxPrice;
        } else {
          passes = price >= minPrice;
        }
        
        if (!passes) {
          console.log('🔍 DEBUG filterProducts - Precio fuera de rango:', product.id, 'precio:', price, 'rango:', minPrice, '-', maxPrice);
        }
        
        return passes;
      });
      console.log(`🔍 DEBUG filterProducts - Después de filtro precio: ${beforePrice} -> ${filtered.length}`);
    }

    // Filter by availability
    if (currentFilters.availability === 'con-existencia') {
      filtered = filtered.filter(product => product.stock > 0);
    } else if (currentFilters.availability === 'sin-existencia') {
      filtered = filtered.filter(product => product.stock === 0);
    }

    // Filter by colors
    if (currentFilters.colors && currentFilters.colors.length > 0) {
      console.log('🔍 DEBUG filterProducts - Filtro de colores:', currentFilters.colors);
      const beforeColors = filtered.length;
      filtered = filtered.filter(product => {
        if (!product.colors || product.colors.length === 0) {
          console.log('🔍 DEBUG filterProducts - Producto sin colores:', product.id, product.title);
          return false;
        }
        
        const matches = currentFilters.colors.some(filterColor => {
          const filterColorLower = filterColor.toLowerCase();
          return product.colors.some(productColor => {
            const productColorLower = productColor.toLowerCase();
            const match = productColorLower === filterColorLower || 
                         productColorLower.includes(filterColorLower) ||
                         filterColorLower.includes(productColorLower);
            if (match) {
              console.log('🔍 DEBUG filterProducts - Color match:', filterColor, '<=>', productColor);
            }
            return match;
          });
        });
        
        if (!matches) {
          console.log('🔍 DEBUG filterProducts - No color match para:', product.id, 'colores:', product.colors, 'vs filtros:', currentFilters.colors);
        }
        
        return matches;
      });
      console.log(`🔍 DEBUG filterProducts - Después de filtro colores: ${beforeColors} -> ${filtered.length}`);
    }

    // Filter by sizes
    if (currentFilters.sizes && currentFilters.sizes.length > 0) {
      console.log('🔍 DEBUG filterProducts - Filtro de tallas:', currentFilters.sizes);
      const beforeSizes = filtered.length;
      filtered = filtered.filter(product => {
        if (!product.sizes || product.sizes.length === 0) {
          console.log('🔍 DEBUG filterProducts - Producto sin tallas:', product.id, product.title);
          return false;
        }
        
        const matches = currentFilters.sizes.some(filterSize => {
          const filterSizeLower = filterSize.toLowerCase();
          return product.sizes.some(productSize => {
            const productSizeLower = productSize.toLowerCase();
            const match = productSizeLower === filterSizeLower || 
                         productSizeLower.includes(filterSizeLower) ||
                         filterSizeLower.includes(productSizeLower);
            if (match) {
              console.log('🔍 DEBUG filterProducts - Size match:', filterSize, '<=>', productSize);
            }
            return match;
          });
        });
        
        if (!matches) {
          console.log('🔍 DEBUG filterProducts - No size match para:', product.id, 'tallas:', product.sizes, 'vs filtros:', currentFilters.sizes);
        }
        
        return matches;
      });
      console.log(`🔍 DEBUG filterProducts - Después de filtro tallas: ${beforeSizes} -> ${filtered.length}`);
    }

    console.log('🔍 DEBUG filterProducts - RESULTADO FINAL:', filtered.length, 'productos filtrados');
    return filtered;
  }, []);

  // Function to sort products - Memoized
  const sortProducts = useCallback((products, sortOption) => {
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
  }, []);

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
          try {
            // Cargar información del catálogo
            const catalogResponse = await publicCatalogService.getById(catalogId);
            if (catalogResponse.data.success) {
              setCurrentCatalog(catalogResponse.data.data);
            }
            
            // Cargar productos del catálogo local (si existen)
            let localProducts = [];
            try {
              const localResponse = await publicCatalogService.getProducts(catalogId);
              if (localResponse.data.success) {
                
                // Para productos locales, necesitamos obtener los datos completos de la API externa
                const externalApiResponse = await fetch('https://cherryapi.estrategiadmgs.com.mx/cherryApi/');
                let externalApiData = [];
                if (externalApiResponse.ok) {
                  externalApiData = await externalApiResponse.json();
                }
                
                localProducts = localResponse.data.data.products.map(product => {
                  // Buscar el producto completo en la API externa usando el external_product_id
                  const fullProduct = externalApiData.find(p => p.id_articulo === product.external_product_id);
                  
                  if (fullProduct) {
                    // Usar la función de mapeo actualizada con datos completos
                    const mappedProduct = mapApiProductToAppProduct(fullProduct);
                    if (mappedProduct) {
                      return {
                        ...mappedProduct,
                        source: 'local',
                        category: product.product_category || mappedProduct.category
                      };
                    }
                  }
                  
                  // Fallback: mapeo básico sin ofertas
                  return {
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
                    source: 'local',
                    originalPrice: null,
                    discount: null
                  };
                }).filter(p => p !== null);
              }
            } catch (error) {
  
            }
            
            // Cargar productos externos y filtrar por código del catálogo
            let externalProducts = [];
            try {
              const externalResponse = await fetch('https://cherryapi.estrategiadmgs.com.mx/cherryApi/');
              if (externalResponse.ok) {
                const externalData = await externalResponse.json();
                
                // Filtrar productos por código del catálogo
                const catalogCode = catalogResponse.data.success ? catalogResponse.data.data.code : null;
                
                if (catalogCode) {
                  externalProducts = externalData
                    .filter(product => product.catalogoId == catalogCode)
                    .map(product => {
                      // CONSOLE LOG ESPECÍFICO PARA DETALLES EN CATÁLOGO






                      if (product.detalles && Array.isArray(product.detalles)) {

                        product.detalles.forEach((detalle, index) => {





                        });
                      }

                      
                      // Extraer colores de los detalles
                      let colors = [];
                      if (product.detalles && Array.isArray(product.detalles)) {
                        colors = [...new Set(product.detalles.map(d => d.nombreColor).filter(Boolean))];
                      }
                      
                      // Debug específico para productos externos
                      
                      // Usar la función de mapeo actualizada que incluye la lógica de ofertas
                      const mappedProduct = mapApiProductToAppProduct(product);
                      if (mappedProduct) {
                      
                      return {
                          ...mappedProduct,
                        source: 'external',
                        catalogoId: product.catalogoId
                      };
                      }
                      return null;
                    });
                }
              }
            } catch (error) {
  
            }
            
            // Combinar productos locales y externos
            productsData = [...localProducts, ...externalProducts];
            
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
                    .map(product => {
                      // CONSOLE LOG ESPECÍFICO PARA DETALLES EN FALLBACK






                      if (product.detalles && Array.isArray(product.detalles)) {

                        product.detalles.forEach((detalle, index) => {





                        });
                      }

                      
                      // Extraer colores de los detalles
                      let colors = [];
                      if (product.detalles && Array.isArray(product.detalles)) {
                        colors = [...new Set(product.detalles.map(d => d.nombreColor).filter(Boolean))];
                      }
                      
                      // Debug específico para productos fallback
                      
                      // Usar la función de mapeo actualizada que incluye la lógica de ofertas
                      const mappedProduct = mapApiProductToAppProduct(product);
                      if (mappedProduct) {
                      
                      return {
                          ...mappedProduct,
                        source: 'external_fallback',
                        temporada: product.temporada
                      };
                      }
                      return null;
                    });
                  
                  productsData = fallbackProducts;
                }
              } catch (error) {
    
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
        
        // Debug: Verificar productos cargados
        console.log('🔍 DEBUG CatalogPage - Productos cargados:', validProducts.length);
        console.log('🔍 DEBUG CatalogPage - Catálogo:', filters.catalog);
        console.log('🔍 DEBUG CatalogPage - Categoría:', category);
        
        // Debug: Mostrar estructura de los primeros productos
        if (validProducts.length > 0) {
          console.log('🔍 DEBUG CatalogPage - Estructura del primer producto:', validProducts[0]);
          console.log('🔍 DEBUG CatalogPage - Categorías disponibles:', validProducts.slice(0, 5).map(p => p.category));
          console.log('🔍 DEBUG CatalogPage - Colores disponibles:', validProducts.slice(0, 3).map(p => ({ id: p.id, colors: p.colors })));
        }
        
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

  // Memoized filtered and sorted products
  const processedProducts = useMemo(() => {
    
    if (allProducts.length === 0) {
      console.log('🔍 DEBUG - allProducts está vacío');
      return [];
    }
    
    console.log('🔍 DEBUG - Aplicando filtros a', allProducts.length, 'productos');
    console.log('🔍 DEBUG - Filtros actuales:', filters);
    
    let filtered = filterProducts(allProducts, filters);
    console.log('🔍 DEBUG - Productos después de filtros básicos:', filtered.length);
    
    // Apply color filter from URL
    if (colorFilter) {
      const colorFilters = colorFilter.split(',').map(c => c.trim());
      console.log('🔍 DEBUG - Filtro de color desde URL:', colorFilters);
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
      console.log('🔍 DEBUG - Productos después de filtro de color URL:', filtered.length);
    }
    
    // Apply DTU filter from URL
    if (dtuFilter) {
      const dtuFilters = dtuFilter.split(',').map(d => d.trim());
      console.log('🔍 DEBUG - Filtro DTU desde URL:', dtuFilters);
      filtered = filtered.filter(product => {
        return dtuFilters.some(filterDtu => {
          const filterDtuLower = filterDtu.toLowerCase();
          return (
            (product.dtu && product.dtu.toLowerCase().includes(filterDtuLower)) ||
            (product.DTU && product.DTU.toLowerCase().includes(filterDtuLower))
          );
        });
      });
      console.log('🔍 DEBUG - Productos después de filtro DTU:', filtered.length);
    }
    
    const sorted = sortProducts(filtered, sortBy);
    console.log('🔍 DEBUG - Productos finales después de ordenar:', sorted.length);

    return sorted;
  }, [allProducts, filters, colorFilter, dtuFilter, sortBy, filterProducts, sortProducts]);

  // Update filtered products when processed products change
  useEffect(() => {
    setFilteredProducts(processedProducts);
  }, [processedProducts]);

  // Handle filter modal - Memoized
  const toggleFilterModal = useCallback(() => {
    setIsFilterModalOpen(prev => !prev);
  }, []);

  // Handle sort change - Memoized
  const handleSortChange = useCallback((e) => {
    setSortBy(e.target.value);
  }, []);

  // Handle filter changes - Memoized
  const handleFilterChange = useCallback((newFilters) => {

    setFilters(newFilters);
  }, [filters]);

  // Handle clear filters - Memoized
  const handleClearFilters = useCallback(() => {
    setFilters({
      catalog: catalogs.length > 0 ? catalogs[0].name : 'Cherry 2025 - 2026',
      availability: 'todos',
      category: 'Todas las categorías',
      department: 'Todos los departamentos',
      sector: 'Todos los sectores',
      sizes: [],
      colors: [],
      priceRange: { min: 0, max: 0 }
    });
  }, [catalogs]);

  // Handle favorite toggle - Memoized
  const handleFavoriteToggle = useCallback((productId) => {
    // Implement favorite functionality here
  }, []);

  // Handle share functionality - Memoized
  const handleShareCatalog = useCallback(() => {
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
  }, []);

  const copyToClipboard = useCallback(async (text) => {
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
  }, []);

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
                  <option value="precio-mayor">Precio: mayor a menor</option>
                  <option value="nombre-a-z">Nombre: A-Z</option>
                  <option value="nombre-z-a">Nombre: Z-A</option>
                </select>
              </div>
              <div className="catalog-page__action-buttons">
                {currentCatalog?.pdfs && currentCatalog.pdfs.length > 0 && (
                  <CustomButton
                    variant="outline"
                    size="medium"
                    className="catalog-page__pdf-btn"
                    iconLeft={<span style={{ fontSize: '16px' }}>🖼️</span>}
                    onClick={() => window.location.href = `/catalogo-pdf?id=${catalogId}`}
                  >
                    <span className="catalog-page__pdf-text">Catálogo de Imágenes</span>
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
                availableColors={availableColors}
                availableSizes={availableSizes}
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
                availableColors={availableColors}
                availableSizes={availableSizes}
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
