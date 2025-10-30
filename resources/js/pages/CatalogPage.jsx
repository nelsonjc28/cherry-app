import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import CatalogFilter from '../components/CatalogFilter/CatalogFilter';
import CatalogProductCard from '../components/CatalogProductCard/CatalogProductCard';
import InfiniteScrollLoader from '../components/InfiniteScrollLoader/InfiniteScrollLoader';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
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
  getAvailableSizes,
  getBulkRatings
} from '../api/cherryApi';
import { applyUserOffersToProducts } from '../api/userOffers';
import { catalogService, publicCatalogService } from '../services/api';
import { getProductImageUrl } from '../utils/productImageUtils';

// Función para mezclar array de forma aleatoria (Fisher-Yates shuffle)
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

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
    category: '',
    department: 'Todos los departamentos',
    sector: 'Todos los sectores',
    sizes: [],
    colors: [],
    priceRange: { min: 0, max: 0 }
  });

  // Cargar colores y tallas disponibles desde productos cargados
  useEffect(() => {
    const extractFiltersFromProducts = () => {
      try {
        // Extraer colores únicos de los productos cargados
        const colorSet = new Set();
        const sizeSet = new Set();
        
        allProducts.forEach(product => {
          // PRIORIDAD 1: Extraer de detalles (donde están realmente las tallas)
          if (product.detalles && product.detalles.length > 0) {
            product.detalles.forEach(detalle => {
              if (detalle.nombreColor && detalle.nombreColor.trim()) {
                colorSet.add(detalle.nombreColor.trim());
              }
              if (detalle.detalle && detalle.detalle.trim()) {
                sizeSet.add(detalle.detalle.trim());
              }
            });
          }
          
          // PRIORIDAD 2: Extraer de sizes como fallback
          if (product.sizes && product.sizes.length > 0) {
            product.sizes.forEach(size => {
              if (size && size.trim()) {
                sizeSet.add(size.trim());
              }
            });
          }
        });
        
        // Ordenar tallas de manera lógica
        const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
        const sizes = Array.from(sizeSet);
        const sortedSizes = sizes.sort((a, b) => {
          const indexA = sizeOrder.indexOf(a.toUpperCase());
          const indexB = sizeOrder.indexOf(b.toUpperCase());
          
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return a.localeCompare(b);
        });
        
        setAvailableColors(Array.from(colorSet).sort());
        setAvailableSizes(sortedSizes);
      } catch (error) {
        console.error('Error extrayendo datos de filtros:', error);
        setAvailableColors([]);
        setAvailableSizes([]);
      }
    };

    // Solo extraer filtros si hay productos cargados
    if (allProducts.length > 0) {
      extractFiltersFromProducts();
    }
  }, [allProducts]);

  // Function to filter products based on current filters - Memoized
  const filterProducts = useCallback((products, currentFilters) => {
    
    if (!products || products.length === 0) {
      return [];
    }

    let filtered = [...products];


    // Filter by category (if a category code is selected)
    if (currentFilters.category && currentFilters.category !== '') {
      filtered = filtered.filter(product => {
        const productLineaId = product.linea?.id_linea;
        return productLineaId == currentFilters.category;
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
          }
        
        return passes;
      });;
    }

    // Filter by availability
    if (currentFilters.availability === 'con-existencia') {
      filtered = filtered.filter(product => product.stock > 0);
    } else if (currentFilters.availability === 'sin-existencia') {
      filtered = filtered.filter(product => product.stock === 0);
    }

    // Filter by colors
    if (currentFilters.colors && currentFilters.colors.length > 0) {
      const beforeColors = filtered.length;
      filtered = filtered.filter(product => {
        if (!product.colors || product.colors.length === 0) {
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
              }
            return match;
          });
        });
        
        if (!matches) {
          }
        
        return matches;
      });;
    }

    // Filter by sizes
    if (currentFilters.sizes && currentFilters.sizes.length > 0) {
      const beforeSizes = filtered.length;
      filtered = filtered.filter(product => {
        if (!product.sizes || product.sizes.length === 0) {
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
              }
            return match;
          });
        });
        
        if (!matches) {
          }
        
        return matches;
      });;
    }

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
                
                // Obtener IDs de productos para ratings
                const localProductIds = localResponse.data.data.products.map(product => 
                  product.external_product_id
                ).filter(Boolean);
                
                // Obtener ratings en bulk para productos locales
                const localRatingsCache = await getBulkRatings(localProductIds);
                
                localProducts = localResponse.data.data.products.map(product => {
                  // Buscar el producto completo en la API externa usando el external_product_id
                  const fullProduct = externalApiData.find(p => p.id_articulo === product.external_product_id);
                  
                  if (fullProduct) {
                    // Usar la función de mapeo actualizada con datos completos CON ratings
                    const mappedProduct = mapApiProductToAppProduct(fullProduct, localRatingsCache);
                    if (mappedProduct) {
                      return {
                        ...mappedProduct,
                        source: 'local',
                        category: product.product_category || mappedProduct.category
                      };
                    }
                  }
                  
                  // Fallback: mapeo básico con ratings del cache
                  const productId = product.external_product_id;
                  let rating = 0;
                  let ratingCount = 0;
                  
                  if (localRatingsCache[productId]) {
                    rating = localRatingsCache[productId].average || 0;
                    ratingCount = localRatingsCache[productId].count || 0;
                  }
                  
                  return {
                  id: productId,
                  title: product.product_name,
                  description: product.product_description,
                  price: product.product_price,
                  image: getProductImageUrl(productId),
                  brand: product.product_metadata?.marca,
                  category: product.product_category,
                  stock: product.product_metadata?.inventario || 0,
                  colors: [],
                  isNew: false,
                  rating: rating,
                  ratingCount: ratingCount,
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
                  const filteredExternalData = externalData.filter(product => product.catalogoId == catalogCode);
                  
                  // Obtener IDs de productos para ratings
                  const externalProductIds = filteredExternalData.map(product => 
                    product.id_articulo || product.id || product.codigo
                  ).filter(Boolean);
                  
                  // Obtener ratings en bulk para productos externos
                  const externalRatingsCache = await getBulkRatings(externalProductIds);
                  
                  externalProducts = filteredExternalData.map(product => {
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
                      
                      // Usar la función de mapeo actualizada que incluye la lógica de ofertas CON ratings
                      const mappedProduct = mapApiProductToAppProduct(product, externalRatingsCache);
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
                  const filteredFallbackData = fallbackData.filter(product => product.temporada === catalogName);
                  
                  // Obtener IDs de productos para ratings
                  const fallbackProductIds = filteredFallbackData.map(product => 
                    product.id_articulo || product.id || product.codigo
                  ).filter(Boolean);
                  
                  // Obtener ratings en bulk para productos fallback
                  const fallbackRatingsCache = await getBulkRatings(fallbackProductIds);
                  
                  const fallbackProducts = filteredFallbackData.map(product => {
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
                      
                      // Usar la función de mapeo actualizada que incluye la lógica de ofertas CON ratings
                      const mappedProduct = mapApiProductToAppProduct(product, fallbackRatingsCache);
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
        
        // Aplicar ofertas de usuario a todos los productos
        const productsWithOffers = await applyUserOffersToProducts(validProducts);
        const shuffledProducts = shuffleArray(productsWithOffers); // 🎲 Orden aleatorio
        
        setAllProducts(shuffledProducts);
        setFilteredProducts(shuffledProducts);
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
      return [];
    }
    
    ;
    
    let filtered = filterProducts(allProducts, filters);;
    
    // Apply color filter from URL
    if (colorFilter) {
      const colorFilters = colorFilter.split(',').map(c => c.trim());;
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
      });;
    }
    
    // Apply DTU filter from URL
    if (dtuFilter) {
      const dtuFilters = dtuFilter.split(',').map(d => d.trim());;
      filtered = filtered.filter(product => {
        return dtuFilters.some(filterDtu => {
          const filterDtuLower = filterDtu.toLowerCase();
          return (
            (product.dtu && product.dtu.toLowerCase().includes(filterDtuLower)) ||
            (product.DTU && product.DTU.toLowerCase().includes(filterDtuLower))
          );
        });
      });;
    }
    
    const sorted = sortProducts(filtered, sortBy);;

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
      category: '',
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

  // Infinite scroll
  const infiniteScroll = useInfiniteScroll(filteredProducts, 20);

  // Reset infinite scroll cuando cambian los productos filtrados
  useEffect(() => {
    infiniteScroll.reset();
  }, [filteredProducts.length]);

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
                    <span className="catalog-page__pdf-text">Catálogo digital</span>
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
              ) : filteredProducts.length === 0 ? (
                <div className="catalog-page__no-results">
                  <h3>No se encontraron productos</h3>
                  <p>Intenta ajustar los filtros de búsqueda</p>
                </div>
              ) : (
                <>
                  <div className="catalog-page__products-grid">
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
            <div className="catalog-page__filter-modal-overlay" onClick={toggleFilterModal}>
            <div className="catalog-page__filter-modal" onClick={(e) => e.stopPropagation()}>
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
