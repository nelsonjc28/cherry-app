import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import CatalogProductCard from '../components/CatalogProductCard/CatalogProductCard';
import CherryButton from '../components/CherryButton/CherryButton';
import CatalogFilter from '../components/CatalogFilter/CatalogFilter';
import InfiniteScrollLoader from '../components/InfiniteScrollLoader/InfiniteScrollLoader';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import { getIconPath } from '../utils/assetPaths';
import { getProductsWithRatings, isUserSessionActive } from '../api/cherryApi';
import { applyUserOffersToProducts } from '../api/userOffers';
import { publicCatalogService } from '../services/api';


import './PromocionesPage.css';

const PromocionesPage = () => {
  const [productsWithOffers, setProductsWithOffers] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('más recientes');
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [catalogs, setCatalogs] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [filters, setFilters] = useState({
    availability: 'todos',
    catalog: 'Seleccione',
    category: '',
    department: 'Todos los departamentos',
    sector: 'Todos los sectores',
    sizes: [],
    colors: [],
    priceRange: { min: 0, max: 0 }
  });
  const hasActiveSession = isUserSessionActive();

  // Cargar productos con promociones (PRIMERO ofertas del admin, LUEGO API externa)
  useEffect(() => {
    const loadPromoProducts = async () => {
      setLoading(true);
      try {
        
        let allPromoProducts = [];
        let adminOfferProductIds = [];
        
        // PASO 1: Si hay usuario logueado, obtener productos con ofertas del ADMIN PRIMERO
        if (hasActiveSession) {
          const token = localStorage.getItem('token');
          if (token) {
            try {
              // Obtener IDs de productos que tienen ofertas del admin
              const offerResponse = await fetch('/api/user-offer-products', {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (offerResponse.ok) {
                const offerData = await offerResponse.json();
                if (offerData.success && offerData.product_ids && offerData.product_ids.length > 0) {
                  console.log(`🎯 ${offerData.product_ids.length} productos con ofertas del admin`);
                  adminOfferProductIds = offerData.product_ids;
                  
                  // Cargar TODOS los productos de la API para buscar los de las ofertas del admin
                  const allProductsResult = await getProductsWithRatings('Cherry 2025 - 2026', {
                    limit: null
                  });
                  const allProducts = allProductsResult.products || allProductsResult || [];
                  
                  // Filtrar productos que tienen ofertas del admin
                  const adminOfferProducts = allProducts.filter(product => {
                    const productId = (product.id_articulo || product.id || product.codigo).toString();
                    return adminOfferProductIds.includes(productId);
                  });
                  
                  allPromoProducts = adminOfferProducts;
                }
              }
            } catch (error) {
            }
          }
        }
        
        // PASO 2: Cargar productos con desc_promo de la API externa (que NO tengan oferta del admin)
        const result = await getProductsWithRatings('Cherry 2025 - 2026', {
          limit: null,
          onlyPromos: true,  // Solo productos con desc_promo
          random: true
        });
        
        const externalPromoProducts = result.products || result || [];
        console.log(`📦 ${externalPromoProducts.length} productos con desc_promo de API externa`);
        
        // Filtrar productos de API externa que NO tengan oferta del admin
        const filteredExternalPromos = externalPromoProducts.filter(product => {
          const productId = (product.id_articulo || product.id || product.codigo).toString();
          return !adminOfferProductIds.includes(productId);
        });
        
        console.log(`➕ Agregando ${filteredExternalPromos.length} productos de API externa (sin ofertas del admin)`);
        allPromoProducts = [...allPromoProducts, ...filteredExternalPromos];
        
        // PASO 3: Aplicar ofertas personalizadas del usuario a TODOS los productos
        const productsWithUserOffers = await applyUserOffersToProducts(allPromoProducts);
        
        console.log(`✅ Total: ${productsWithUserOffers.length} productos con promociones`);
        setProductsWithOffers(productsWithUserOffers);
      } catch (error) {
        console.error('❌ Error al cargar promociones:', error);
        setProductsWithOffers([]);
      } finally {
        setLoading(false);
      }
    };

    loadPromoProducts();
  }, [hasActiveSession]);


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
        console.error('Error loading catalogs:', error);
        setCatalogs([]);
      } finally {
        setCatalogLoading(false);
      }
    };

    loadCatalogs();
  }, []);

  // Extraer colores y tallas disponibles de los productos cargados
  useEffect(() => {
    const extractFiltersFromProducts = () => {
      try {
        const colorSet = new Set();
        const sizeSet = new Set();
        
        productsWithOffers.forEach(product => {
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
          
          if (product.sizes && product.sizes.length > 0) {
            product.sizes.forEach(size => {
              if (size && size.trim()) {
                sizeSet.add(size.trim());
              }
            });
          }
        });
        
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
        
        setAvailableColors(Array.from(colorSet).sort());
        setAvailableSizes(sortedSizes);
      } catch (error) {
        console.error('Error extrayendo datos de filtros:', error);
        setAvailableColors([]);
        setAvailableSizes([]);
      }
    };

    if (productsWithOffers.length > 0) {
      extractFiltersFromProducts();
    }
  }, [productsWithOffers]);

  // Función para filtrar productos
  const filterProducts = useCallback((products, currentFilters) => {
    if (!products || products.length === 0) return [];
    
    let filtered = [...products];

    // Filtrar por categoría (usando código)
    if (currentFilters.category && currentFilters.category !== '') {
      filtered = filtered.filter(product => {
        const productLineaId = product.linea?.id_linea;
        return productLineaId == currentFilters.category;
      });
    }

    // Filtrar por departamento
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

    // Filtrar por rango de precio
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

    // Filtrar por disponibilidad
    if (currentFilters.availability === 'con-existencia') {
      filtered = filtered.filter(product => product.stock > 0);
    } else if (currentFilters.availability === 'sin-existencia') {
      filtered = filtered.filter(product => product.stock === 0);
    }

    // Filtrar por colores
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

    // Filtrar por tallas
    if (currentFilters.sizes && currentFilters.sizes.length > 0) {
      filtered = filtered.filter(product => {
        if (!product.sizes || product.sizes.length === 0) return false;
        
        return currentFilters.sizes.some(filterSize => {
          const filterSizeLower = filterSize.toLowerCase();
          return product.sizes.some(productSize => {
            const productSizeLower = productSize.toLowerCase();
            return productSizeLower === filterSizeLower || 
                   productSizeLower.includes(filterSizeLower) ||
                   filterSizeLower.includes(productSizeLower);
          });
        });
      });
    }

    // Filter by catalog
    if (currentFilters.catalog && currentFilters.catalog !== '' &&  currentFilters.catalog != 'Seleccione') {
      filtered = filtered.filter(product => {
        const productCatalog = product.catalog;
        return productCatalog == currentFilters.catalog;
      });
    }

    return filtered;
  }, []);

  // Función para ordenar productos
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

  // Procesar productos (filtrar y ordenar)
  const processedProducts = useMemo(() => {
    if (productsWithOffers.length === 0) return [];
    
    let filtered = filterProducts(productsWithOffers, filters);
    const sorted = sortProducts(filtered, sortBy);
    
    return sorted;
  }, [productsWithOffers, filters, sortBy, filterProducts, sortProducts]);

  // Actualizar productos filtrados cuando cambian los procesados
  useEffect(() => {
    setFilteredProducts(processedProducts);
  }, [processedProducts]);

  // Manejadores de eventos
  const toggleFilterModal = useCallback(() => {
    setIsFilterModalOpen(prev => !prev);
  }, []);

  const handleSortChange = useCallback((e) => {
    setSortBy(e.target.value);
  }, []);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      availability: 'todos',
      category: '',
      department: 'Todos los departamentos',
      sector: 'Todos los sectores',
      sizes: [],
      colors: [],
      priceRange: { min: 0, max: 0 }
    });
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

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Rebajas - Cherry Central</title>
        </Helmet>
        
        <main className="promociones-page">
          <div className="container">
            <div className="promociones-loading">
              <div className="loading-spinner"></div>
              <p>Cargando rebajas...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  const totalResults = filteredProducts.length;

  return (
    <>
      <Helmet>
        <title>Rebajas - Cherry Central</title>
        <meta name="description" content="Descubre las mejores rebajas y ofertas en Cherry Central. Descuentos especiales en moda femenina." />
      </Helmet>

      <div className="promociones-page">
        <div className="container">
          {/* Header section with title and filters  -  MOBILE */}
          <div className="promociones-page__header-mobile">
            <div className="promociones-page__title-section">
              <h1 className="promociones-page__title">
                {hasActiveSession ? 'Rebajas Personalizadas' : 'Rebajas'}
              </h1>
              <div className='promociones-page__content-texts'>
                <span className="promociones-page__results-count">
                  ({totalResults})
                  <p className="promociones-page__text-results-count">Resultados</p>
                </span>
              </div>
            </div>

            <div className="promociones-page__controls">
              <div className="promociones-page__sort-section">
                <div className="promociones-page__mobile-filter-controls">
                  <button
                    className="promociones-page__mobile-filter-btn"
                    onClick={toggleFilterModal}
                  >
                    <img src={getIconPath('Filter.svg')} alt="Filtros" />
                    <img src={getIconPath('Chevron Down.svg')} alt="Expandir" />
                  </button>
                </div>
                <label htmlFor="sort-select" className="promociones-page__sort-label">Ordenar por:</label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={handleSortChange}
                  className="promociones-page__sort-select"
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
          <div className="promociones-page__header-desktop">
            <div className="promociones-page__title-section">
              <h1 className="promociones-page__title">
                {hasActiveSession ? 'Rebajas Personalizadas' : 'Rebajas'}
              </h1>
              <div className='promociones-page__content-texts'>
                <span className="promociones-page__results-count">
                  ({totalResults})
                  <p className="promociones-page__text-results-count">Resultados</p>
                </span>
              </div>
            </div>

            <div className="promociones-page__controls">
              <div className="promociones-page__sort-section">
                <label htmlFor="sort-select-desktop" className="promociones-page__sort-label">Ordenar por:</label>
                <select
                  id="sort-select-desktop"
                  value={sortBy}
                  onChange={handleSortChange}
                  className="promociones-page__sort-select"
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
          <div className="promociones-page__content">
            {/* Filters sidebar - DESKTOP */}
            <aside className="promociones-page__sidebar">
              <CatalogFilter
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                isMobile={false}
                availableColors={availableColors}
                availableSizes={availableSizes}
                catalogs={catalogs}
                hideCatalogSelector={false}
              />
            </aside>

            {/* Products grid */}
            <main className="promociones-page__products-section">
              {loading ? (
                <div className="promociones-page__loading">
                  <div className="promociones-page__loading-spinner"></div>
                  <p>Cargando rebajas...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="promociones-page__no-results">
                  <h3>No se encontraron productos</h3>
                  <p>Intenta ajustar los filtros de búsqueda</p>
                </div>
              ) : (
                <>
                  <div className="promociones-page__products-grid">
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
            <div className="promociones-page__filter-modal-overlay" onClick={toggleFilterModal}>
            <div className="promociones-page__filter-modal" onClick={(e) => e.stopPropagation()}>
              <CatalogFilter
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                isMobile={true}
                onClose={toggleFilterModal}
                availableColors={availableColors}
                availableSizes={availableSizes}
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

export default PromocionesPage; 