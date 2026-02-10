import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import CatalogProductCard from '../components/CatalogProductCard/CatalogProductCard';
import CherryButton from '../components/CherryButton/CherryButton';
import CatalogFilter from '../components/CatalogFilter/CatalogFilter';
import InfiniteScrollLoader from '../components/InfiniteScrollLoader/InfiniteScrollLoader';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import { getIconPath } from '../utils/assetPaths';
import { publicCatalogService } from '../services/api';
import api from '../services/api';
import { getProductImageUrl } from '../utils/productImageUtils';
import useUserStore from '../store/userStore';
import './PromocionesPage.css';

const OfertasPersonalizadasPage = () => {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const [productsWithOffers, setProductsWithOffers] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('más recientes');
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [catalogs, setCatalogs] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Redirigir si no hay usuario logueado (solo después de que el store esté inicializado)
  useEffect(() => {
    // Esperar un momento para que el store se inicialice
    const timer = setTimeout(() => {
      if (!user) {
        navigate('/login');
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [user, navigate]);

  // Recuperar filtros guardados de sessionStorage
  const getSavedFilters = () => {
    try {
      const saved = sessionStorage.getItem('ofertasPersonalizadasPageFilters');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
    }
    return {
      availability: 'todos',
      catalog: 'Seleccione',
      category: '',
      department: 'Todos los departamentos',
      sector: 'Todos los sectores',
      sizes: [],
      colors: [],
      priceRange: { min: 0, max: 0 }
    };
  };

  const [filters, setFilters] = useState(getSavedFilters);

  // Sincronizar filtros guardados cuando se monta el componente
  useEffect(() => {
    const savedFilters = getSavedFilters();
    if (savedFilters) {
      setFilters(savedFilters);
    }
  }, []);

  // Cargar productos con ofertas personalizadas desde la base de datos local
  useEffect(() => {
    if (!user) return; // No cargar si no hay usuario

    const loadPersonalizedOfferProducts = async () => {
      setLoading(true);
      try {
        
        // Obtener productos con ofertas personalizadas del usuario
        const response = await api.get('/user-offers/products');
        
        if (response.data.success && response.data.data?.products) {
          const localProducts = response.data.data.products;
          
          // Mapear productos al formato esperado
          const allProducts = localProducts.map(product => {
            const rawPrice = product.precio1 || product.price || 0;
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
            
            // Determinar si es nuevo (45 días)
            const isNewProduct = product.isNew || 
                               (product.fechaAlta && new Date(product.fechaAlta) > new Date(Date.now() - 45 * 24 * 60 * 60 * 1000));
            
            // Usar SOLO los valores de la oferta personalizada que vienen del backend
            // El backend ya calculó el precio usando solo el discount_percentage de la oferta personalizada
            const finalPrice = product.finalPrice || numericPrice;
            const originalPrice = product.hasDiscount ? (product.originalPrice || numericPrice) : null;
            const discountPercentage = product.hasDiscount ? (product.discountPercentage || 0) : 0;
            
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
              colors: availableColors,
              colores: productColors,
              sizes: availableSizes,
              tallas: productSizes,
              isNew: isNewProduct,
              rating: 0,
              ratingCount: 0,
              linea: product.id_linea,
              id_linea: product.id_linea,
              catalogoId: product.catalogoId,
              fechaAlta: product.fechaAlta,
              detalles: product.detalles,
              codigo: product.id_articulo || product.id,
              id_articulo: product.id_articulo || product.id,
              precio1: numericPrice,
              hasUserOffer: true // Todos estos productos tienen ofertas personalizadas
            };
          });
          
          setProductsWithOffers(allProducts);
        } else {
          setProductsWithOffers([]);
        }
      } catch (error) {
        setProductsWithOffers([]);
      } finally {
        setLoading(false);
      }
    };

    loadPersonalizedOfferProducts();
  }, [user]);

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
        setAvailableColors([]);
        setAvailableSizes([]);
      }
    };

    if (productsWithOffers.length > 0) {
      extractFiltersFromProducts();
    }
  }, [productsWithOffers]);

  // Función para filtrar productos (igual que PromocionesPage)
  const filterProducts = useCallback((products, currentFilters) => {
    if (!products || products.length === 0) return [];
    
    let filtered = [...products];

    const selectedCategories = Array.isArray(currentFilters.categories) && currentFilters.categories.length > 0
      ? currentFilters.categories.filter(cat => cat !== 'todos')
      : (currentFilters.category && currentFilters.category !== '' ? (Array.isArray(currentFilters.category) ? currentFilters.category.filter(cat => cat !== 'todos') : [String(currentFilters.category)]) : []);
    
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(product => {
        // Normalizar id_linea y categoryCode a números para comparación (ignorar ceros a la izquierda)
        const productLineaId = product.id_linea || product.linea;
        const normalizedProductLineaId = productLineaId ? parseInt(String(productLineaId), 10) : null;
        return selectedCategories.some(categoryCode => {
          const normalizedCategoryCode = parseInt(String(categoryCode), 10);
          return normalizedProductLineaId !== null && normalizedCategoryCode === normalizedProductLineaId;
        });
      });
    }

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

    if (currentFilters.availability === 'con-existencia') {
      filtered = filtered.filter(product => product.stock > 0);
    } else if (currentFilters.availability === 'sin-existencia') {
      filtered = filtered.filter(product => product.stock === 0);
    }

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

    if (currentFilters.sizes && currentFilters.sizes.length > 0) {
      filtered = filtered.filter(product => {
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

    if (currentFilters.catalog && currentFilters.catalog !== '' && currentFilters.catalog != 'Seleccione') {
      filtered = filtered.filter(product => {
        const productCatalogoId = product.catalogoId || product.catalog;
        return productCatalogoId == currentFilters.catalog;
      });
    }

    return filtered;
  }, []);

  // Función para ordenar productos (igual que PromocionesPage)
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

  const processedProducts = useMemo(() => {
    if (productsWithOffers.length === 0) return [];
    let filtered = filterProducts(productsWithOffers, filters);
    const sorted = sortProducts(filtered, sortBy);
    return sorted;
  }, [productsWithOffers, filters, sortBy, filterProducts, sortProducts]);

  useEffect(() => {
    setFilteredProducts(processedProducts);
  }, [processedProducts]);

  const toggleFilterModal = useCallback(() => {
    setIsFilterModalOpen(prev => !prev);
  }, []);

  const handleSortChange = useCallback((e) => {
    setSortBy(e.target.value);
  }, []);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    try {
      sessionStorage.setItem('ofertasPersonalizadasPageFilters', JSON.stringify(newFilters));
    } catch (e) {
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    const defaultFilters = {
      availability: 'todos',
      catalog: 'Seleccione',
      category: '',
      department: 'Todos los departamentos',
      sector: 'Todos los sectores',
      sizes: [],
      colors: [],
      priceRange: { min: 0, max: 0 }
    };
    setFilters(defaultFilters);
    try {
      sessionStorage.removeItem('ofertasPersonalizadasPageFilters');
    } catch (e) {
    }
  }, []);

  const handleFavoriteToggle = (productId) => {
    // Implementar lógica de favoritos si es necesario
  };

  const infiniteScroll = useInfiniteScroll(filteredProducts, 20);

  useEffect(() => {
    infiniteScroll.reset();
  }, [filteredProducts.length]);

  // Mostrar loading mientras se verifica el usuario (evitar redirección prematura)
  if (!user) {
    return (
      <>
        <Helmet>
          <title>Ofertas Personalizadas - Cherry Central</title>
        </Helmet>
        <main className="promociones-page">
          <div className="container">
            <div className="promociones-loading">
              <div className="loading-spinner"></div>
              <p>Verificando acceso...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Ofertas Personalizadas - Cherry Central</title>
        </Helmet>
        <main className="promociones-page">
          <div className="container">
            <div className="promociones-loading">
              <div className="loading-spinner"></div>
              <p>Cargando ofertas personalizadas...</p>
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
        <title>Ofertas Personalizadas - Cherry Central</title>
        <meta name="description" content="Descubre tus ofertas personalizadas en Cherry Central. Descuentos especiales solo para ti." />
      </Helmet>

      <div className="promociones-page">
        <div className="container">
          <div className="promociones-page__header-mobile">
            <div className="promociones-page__title-section">
              <h1 className="promociones-page__title">Ofertas Personalizadas</h1>
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

          <div className="promociones-page__header-desktop">
            <div className="promociones-page__title-section">
              <h1 className="promociones-page__title">Ofertas Personalizadas</h1>
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

          <div className="promociones-page__content">
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

            <main className="promociones-page__products-section">
              {loading ? (
                <div className="promociones-page__loading">
                  <div className="promociones-page__loading-spinner"></div>
                  <p>Cargando ofertas personalizadas...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="promociones-page__no-results">
                  <h3>No se encontraron productos</h3>
                  <p>No tienes ofertas personalizadas disponibles en este momento</p>
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
                  <InfiniteScrollLoader
                    isLoading={infiniteScroll.isLoading}
                    hasMore={infiniteScroll.hasMore}
                    observerTarget={infiniteScroll.observerTarget}
                  />
                </>
              )}
            </main>
          </div>

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

export default OfertasPersonalizadasPage;

