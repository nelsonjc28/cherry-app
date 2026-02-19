import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams, useLocation } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import CatalogFilter from '../components/CatalogFilter/CatalogFilter';
import CherryButton from '../components/CherryButton/CherryButton';
import InfiniteScrollLoader from '../components/InfiniteScrollLoader/InfiniteScrollLoader';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import { getIconPath } from '../utils/assetPaths';
import { searchProductsAdvanced, getProductsWithRatings, mapApiProductToAppProduct, getAvailableColors, getAvailableSizes } from '../api/cherryApi';
import { applyUserOffersToProducts } from '../api/userOffers';
import { publicCatalogService } from '../services/api';
import { flexibleSearchInFields } from '../utils/searchNormalizer';
import api from '../services/api';
import { getProductImageUrl } from '../utils/productImageUtils';
import './BuscarPage.css';
import './NuevosPage.css';


const BuscarPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const colorFilter = searchParams.get('color') || '';
  const skuFilter = searchParams.get('sku') || '';
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);


  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogs, setCatalogs] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [colorsLoading, setColorsLoading] = useState(true);
  const [sizesLoading, setSizesLoading] = useState(true);
  // Recuperar filtros guardados de sessionStorage
  const getSavedFilters = () => {
    try {
      const saved = sessionStorage.getItem('buscarPageFilters');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
    }
    return {
      catalog: 'Seleccione',
      catalogs: [], // Array para selección múltiple
      availability: 'todos',
      category: '',
      categories: [], // Array para selección múltiple
      department: 'Todos los departamentos',
      sector: 'Todos los sectores',
      sizes: [],
      colors: [],
      priceRange: { min: 0, max: 0 },
      codigo: '',
      dtu: '',
      sortBy: 'Más recientes'
    };
  };

  const [filters, setFilters] = useState(getSavedFilters);

  const toggleFilterModal = useCallback(() => {
    setIsFilterModalOpen(prev => !prev);
  }, []);


  // Cargar catálogos
  useEffect(() => {
    const loadCatalogs = async () => {
      setCatalogLoading(true);
      try {
        const response = await publicCatalogService.getAll();

        // Manejar diferentes estructuras de respuesta
        let catalogsData = [];

        if (response.data) {
          catalogsData = response.data.catalogs;
        }


        if (catalogsData && catalogsData.length > 0) {
          // Mostrar todos los catálogos sin filtrar por estado activo
          setCatalogs(catalogsData);

          // No establecer automáticamente un catálogo, dejar "Seleccione"
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

  // Cargar colores y tallas disponibles desde productos cargados
  useEffect(() => {
    const extractFiltersFromProducts = () => {
      setColorsLoading(true);
      setSizesLoading(true);

      try {
        // Extraer colores únicos de los productos cargados
        const colorSet = new Set();
        const sizeSet = new Set();

        products.forEach(product => {
          ;

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

        const finalColors = Array.from(colorSet).sort();
        const finalSizes = sortedSizes;

        setAvailableColors(finalColors);
        setAvailableSizes(finalSizes);
      } catch (error) {
        setAvailableColors([]);
        setAvailableSizes([]);
      } finally {
        setColorsLoading(false);
        setSizesLoading(false);
      }
    };

    // Solo extraer filtros si hay productos cargados
    if (products.length > 0) {
      ;
      extractFiltersFromProducts();
    } else {
    }
  }, [products]);

  // Cargar productos directamente desde API con filtros
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        let allProducts = [];

        // Buscar en la base de datos local (con o sin query)
        try {
          const searchResponse = await api.get('/products/search', {
            params: { 
              q: query || '', // Si no hay query, el backend devolverá todos los productos
              sort: filters.sortBy || 'más recientes' // Enviar parámetro de ordenamiento al backend
              // Sin per_page para obtener todos los productos sin límite
            }
          });

          if (searchResponse.data.success && searchResponse.data.data.products) {
            const localProducts = searchResponse.data.data.products;
            
            // Debug: Verificar que los productos tengan los campos correctos del backend
            if (localProducts.length > 0) {
              // Mostrar el primer producto completo para debug
              
              // Buscar productos con descuento
              const productsWithDiscount = localProducts.filter(p => p.opc_promo === 'S' && p.desc_promo > 0);
              if (productsWithDiscount.length > 0) {
              }
            }
            
            // Mapear productos locales al formato esperado
            allProducts = localProducts.map(product => {
                const rawPrice = product.precio1;
                const numericPrice = typeof rawPrice === 'string' ? parseFloat(rawPrice.replace(/[^\d.-]/g, '')) : parseFloat(rawPrice) || 0;
                
                // Extraer colores de detalles
                const productColors = product.detalles ? 
                  [...new Set(product.detalles.map(d => d.nombreColor).filter(Boolean))] : 
                  [];
                const availableColors = productColors.length > 0 ? productColors : ['black'];
                
                // Extraer tallas de detalles
                const productSizes = product.detalles ? 
                  [...new Set(product.detalles.map(d => d.detalle).filter(Boolean))] : 
                  [];
                const availableSizes = productSizes.length > 0 ? productSizes : ['M'];
                
                // Determinar si es nuevo (30 días)
                const isNewProduct = product.fecha_alta && new Date(product.fecha_alta) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                
                // Usar los valores que ya vienen calculados del backend (con descuento reducido del 10% aplicado)
                // El backend ya calcula: price (precio final), originalPrice, discount (reducido)
                let finalPrice = product.price;
                let originalPrice = product.originalPrice;
                let discountPercentage = product.discount;
                
                // Debug para productos con descuento
                if (product.opc_promo === 'S' && product.desc_promo > 0) {
                }
                
                // Si el backend no envió estos valores, calcularlos aquí como fallback
                if (finalPrice === undefined || finalPrice === null || finalPrice === 0) {
                  const hasDiscount = product.opc_promo === 'S' && product.desc_promo > 0;
                  const originalDiscountPercentage = hasDiscount ? parseFloat(product.desc_promo) : 0;
                  discountPercentage = hasDiscount ? Math.max(0, originalDiscountPercentage - 10) : 0;
                  originalPrice = hasDiscount && numericPrice > 0 ? (numericPrice / (1 - originalDiscountPercentage / 100)) : null;
                  finalPrice = hasDiscount && discountPercentage > 0 && numericPrice > 0 
                    ? (numericPrice - (numericPrice * (discountPercentage / 100))) 
                    : numericPrice;
                  
                  if (hasDiscount) {
                  }
                }
                
                // Asegurar que discountPercentage sea un número
                discountPercentage = discountPercentage !== undefined && discountPercentage !== null ? parseFloat(discountPercentage) : 0;
                
                return {
                  id: product.id_articulo || product.id,
                  title: product.descripcion || product.title || 'Sin nombre',
                  description: product.descripcion || 'Sin descripción',
                  price: finalPrice, // Usar precio final del backend (con descuento aplicado)
                  originalPrice: originalPrice, // Usar precio original del backend
                  discount: discountPercentage, // Usar descuento reducido del backend
                  image: getProductImageUrl(product.id_articulo || product.id),
                  brand: product.marca || 'Sin marca',
                  stock: product.inventario || 0,
                  inventario: product.inventario || 0, // Para filtros
                  colors: availableColors,
                  colores: productColors,
                  sizes: availableSizes,
                  tallas: productSizes,
                  isNew: isNewProduct,
                  // Usar el rating que viene del backend (ya calculado desde reviews aprobadas)
                  rating: product.rating || 0,
                  ratingCount: product.ratingCount || product.totalRatings || 0,
                  linea: product.linea || product.id_linea,
                  id_linea: product.id_linea || product.linea, // Para filtro de categoría
                  catalogoId: product.catalogoId, // Para filtro de catálogo
                  fechaAlta: product.fecha_alta,
                  fecha_alta: product.fecha_alta,
                  stock_received_count: product.stock_received_count || 0,
                  stockReceivedCount: product.stock_received_count || 0,
                  temporada: product.temporada,
                  opcNuevo: product.opc_nuevo,
                  opcPromo: product.opc_promo,
                  descPromo: product.desc_promo,
                  genero: product.genero,
                  sector: product.sector,
                  detalles: product.detalles,
                  codigo: product.codigo || product.id_articulo || product.id,
                  id_articulo: product.id_articulo || product.id,
                  precio1: numericPrice // Para ordenamiento
                };
              });

            // Aplicar ofertas de usuario
            allProducts = await applyUserOffersToProducts(allProducts);
          }
        } catch (error) {
          allProducts = [];
        }

        // Aplicar filtros adicionales
        let filtered = [...allProducts];

        // Filtrar por color
        if (colorFilter) {
          const colors = colorFilter.split(',').map(c => c.trim().toLowerCase());
          filtered = filtered.filter(product => {
            if (!product.detalles || product.detalles.length === 0) return false;
            return product.detalles.some(detalle =>
              detalle.nombreColor && colors.includes(detalle.nombreColor.toLowerCase())
            );
          });
        }

        // Filtrar por SKU
        if (skuFilter) {
          const skuLower = skuFilter.toLowerCase();
          filtered = filtered.filter(product => {
            const codigo = (product.codigo || product.id_articulo || '').toString().toLowerCase();
            return codigo.includes(skuLower);
          });
        }

        setProducts(filtered);
        setFilteredProducts(filtered);
        setLoading(false);
      } catch (error) {
        setProducts([]);
        setFilteredProducts([]);
        setLoading(false);
      }
    };

    loadProducts();
  }, [query, colorFilter, skuFilter, filters.sortBy]);

  // Filtrar productos basado en filtros adicionales
  useEffect(() => {
    let filtered = [...products];

    // Filtrar por catálogo (soporta selección múltiple)
    // Si no hay catálogos seleccionados o está vacío, mostrar todos
    const selectedCatalogs = Array.isArray(filters.catalogs) && filters.catalogs.length > 0
      ? filters.catalogs.filter(cat => cat !== 'todos') // Excluir la opción "todos"
      : (filters.catalog && filters.catalog !== 'Todos los catálogos' && filters.catalog !== 'Seleccione' && filters.catalog !== '' ? [String(filters.catalog)] : []);
    
    // Solo filtrar si hay catálogos específicos seleccionados
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

    // Filtrar por categoría (soporta selección múltiple)
    // Si no hay categorías seleccionadas o está vacío, mostrar todas
    const selectedCategories = Array.isArray(filters.categories) && filters.categories.length > 0
      ? filters.categories.filter(cat => cat !== 'todos') // Excluir la opción "todos"
      : (filters.category && filters.category !== '' ? (Array.isArray(filters.category) ? filters.category.filter(cat => cat !== 'todos') : [String(filters.category)]) : []);
    
    // Solo filtrar si hay categorías específicas seleccionadas
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(product => {
        // Normalizar id_linea y categoryCode a números para comparación (ignorar ceros a la izquierda)
        const productLineaId = product.id_linea;
        const normalizedProductLineaId = productLineaId ? parseInt(String(productLineaId), 10) : null;
        return selectedCategories.some(categoryCode => {
          const normalizedCategoryCode = parseInt(String(categoryCode), 10);
          return normalizedProductLineaId !== null && normalizedCategoryCode === normalizedProductLineaId;
        });
      });
    }

    // Filtrar por precio - usar precio1 del backend
    if (filters.priceRange.min > 0 || filters.priceRange.max > 0) {
      filtered = filtered.filter(product => {
        // Usar precio1 del backend como fuente principal
        const price = parseFloat(product.price || product.precio1 || 0);
        const minPrice = filters.priceRange.min || 0;
        const maxPrice = filters.priceRange.max || Infinity;

        if (maxPrice > 0 && maxPrice !== Infinity) {
          return price >= minPrice && price <= maxPrice;
        } else {
          return price >= minPrice;
        }
      });
    }

    // Filtrar por colores adicionales - usar detalles del backend
    if (filters.colors && filters.colors.length > 0) {
      filtered = filtered.filter(product => {
        // Prioridad 1: usar detalles del backend
        if (product.detalles && product.detalles.length > 0) {
          return filters.colors.some(filterColor => {
            const filterColorLower = filterColor.toLowerCase();
            return product.detalles.some(detalle => {
              if (!detalle.nombreColor) return false;
              const productColorLower = detalle.nombreColor.toLowerCase();
              return productColorLower === filterColorLower ||
                productColorLower.includes(filterColorLower);
            });
          });
        }
        // Fallback: usar colors array
        if (product.colors && product.colors.length > 0) {
          return filters.colors.some(filterColor => {
            const filterColorLower = filterColor.toLowerCase();
            return product.colors.some(productColor => {
              const productColorLower = productColor.toLowerCase();
              return productColorLower === filterColorLower ||
                productColorLower.includes(filterColorLower);
            });
          });
        }
        return false;
      });
    }

    // Filtrar por tallas - EXACT MATCH ONLY (restrictive)
    if (filters.sizes && filters.sizes.length > 0) {
      filtered = filtered.filter(product => {
        // Prioridad 1: usar detalles del backend
        if (product.detalles && product.detalles.length > 0) {
          return filters.sizes.some(filterSize => {
            const filterSizeLower = filterSize.toLowerCase().trim();
            return product.detalles.some(detalle => {
              if (!detalle.detalle) return false;
              const productSizeLower = detalle.detalle.toString().toLowerCase().trim();
              // Exact match only - no partial matching
              return productSizeLower === filterSizeLower;
            });
          });
        }
        // Fallback: usar sizes array
        if (product.sizes && product.sizes.length > 0) {
          return filters.sizes.some(filterSize => {
            const filterSizeLower = filterSize.toLowerCase().trim();
            return product.sizes.some(productSize => {
              const productSizeLower = productSize.toString().toLowerCase().trim();
              // Exact match only - no partial matching
              return productSizeLower === filterSizeLower;
            });
          });
        }
        return false;
      });
    }

    // Filtrar por disponibilidad (con existencia) - usar inventario del backend
    if (filters.availability === 'con-existencia') {
      filtered = filtered.filter(product => {
        // Usar inventario del backend como fuente principal
        const stock = parseFloat(product.inventario || product.stock || product.inventory || 0);
        return stock > 0;
      });
    }

    // Filtrar por código adicional - usar id_articulo del backend
    if (filters.codigo && filters.codigo.trim() !== '') {
      const codigoLower = filters.codigo.trim().toLowerCase();
      filtered = filtered.filter(product => {
        return (
          (product.codigo && product.codigo.toString().toLowerCase().includes(codigoLower)) ||
          (product.id_articulo && product.id_articulo.toString().toLowerCase().includes(codigoLower)) ||
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

    // El ordenamiento ahora se hace en el backend, pero mantenemos esta lógica
    // como respaldo para filtros adicionales que se aplican después
    // El backend ya devuelve los productos ordenados según filters.sortBy

    setFilteredProducts(filtered);
  }, [filters, products]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    // Guardar filtros en sessionStorage
    try {
      sessionStorage.setItem('buscarPageFilters', JSON.stringify(newFilters));
    } catch (e) {
    }
  };

  const handleClearFilters = () => {
    const defaultFilters = {
      catalog: 'Seleccione',
      availability: 'todos',
      category: '',
      department: 'Todos los departamentos',
      sector: 'Todos los sectores',
      sizes: [],
      colors: [],
      priceRange: { min: 0, max: 0 },
      codigo: '',
      dtu: '',
      sortBy: 'Más recientes'
    };
    setFilters(defaultFilters);
    // Limpiar filtros de sessionStorage
    try {
      sessionStorage.removeItem('buscarPageFilters');
    } catch (e) {
    }
  };

  const handleFavoriteToggle = (productId) => {
    // Handle favorite toggle
  };


  // Infinite scroll
  const infiniteScroll = useInfiniteScroll(filteredProducts, 20);

  // Reset infinite scroll cuando cambian los productos filtrados
  useEffect(() => {
    infiniteScroll.reset();
  }, [filteredProducts.length]);

  // Build search description
  const getSearchDescription = () => {
    const parts = [];
    if (query) parts.push(`"${query}"`);
    if (colorFilter) parts.push(`color: ${colorFilter}`);
    if (skuFilter) parts.push(`SKU: ${skuFilter}`);
    return parts.join(', ');
  };

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
      (filters.sector && filters.sector !== 'Todos los sectores') ||
      (filters.codigo && filters.codigo !== '') ||
      (filters.dtu && filters.dtu !== '')
    );
  };

  const location = useLocation();
  // Para búsqueda, usar solo el pathname sin query params para evitar duplicados
  const canonicalUrl = `https://cherrydistribuidores.com.mx${location.pathname}`;

  return (
    <>
      <Helmet>
        <title>Búsqueda - Cherry Central</title>
        <meta name="description" content={`Resultados de búsqueda para "${getSearchDescription()}" en Cherry Central. Encuentra los mejores productos de moda femenina.`} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      <div className="nuevos-page">
        <div className="container">
          {/* Header section with title and filters  -  MOBILE */}
          <div className="nuevos-page__header-mobile">
            <div className="nuevos-page__title-section">
              <h1 className="nuevos-page__title">Resultados de búsqueda</h1>
              <div className='nuevos-page__content-texts'>
                <span className="nuevos-page__results-count">
                  ({filteredProducts.length})
                  <p className="nuevos-page__text-results-count">Resultados</p>
                </span>
              </div>
            </div>

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
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange({ ...filters, sortBy: e.target.value })}
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
            <div className="nuevos-page__title-section">
              <h1 className="nuevos-page__title">Resultados de búsqueda</h1>
              <div className='nuevos-page__content-texts'>
                <span className="nuevos-page__results-count">
                  ({filteredProducts.length})
                  <p className="nuevos-page__text-results-count">Resultados</p>
                </span>
              </div>
            </div>

            <div className="nuevos-page__controls">
              <div className="nuevos-page__sort-section">
                <label htmlFor="sort-select-desktop" className="nuevos-page__sort-label">Ordenar por:</label>
                <select
                  id="sort-select-desktop"
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange({ ...filters, sortBy: e.target.value })}
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

          {/* Main content */}
          <div className="nuevos-page__content">

              {/* Filtros */}
              <aside className="nuevos-page__sidebar">
                <CatalogFilter
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onClearFilters={handleClearFilters}
                  catalogs={catalogs}
                  isMobile={false}
                  catalogLoading={catalogLoading}
                  availableColors={availableColors}
                  availableSizes={availableSizes}
                />

              </aside>

              {/* Resultados */}
              <main className="nuevos-page__products-section">
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
                  <>
                    <div className={`nuevos-page__products-grid ${filteredProducts.length === 1 ? 'single-result' : ''}`}>
                      {infiniteScroll.displayedItems.map((product, index) => (
                        <ProductCard
                          key={product.id || `product-${index}`}
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
                  hideCatalogSelector={true}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default BuscarPage; 
