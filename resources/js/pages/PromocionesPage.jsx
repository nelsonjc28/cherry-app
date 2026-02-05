import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation } from 'react-router-dom';
import CatalogProductCard from '../components/CatalogProductCard/CatalogProductCard';
import CherryButton from '../components/CherryButton/CherryButton';
import CatalogFilter from '../components/CatalogFilter/CatalogFilter';
import InfiniteScrollLoader from '../components/InfiniteScrollLoader/InfiniteScrollLoader';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import { getIconPath } from '../utils/assetPaths';
import { isUserSessionActive } from '../api/cherryApi';
import { applyUserOffersToProducts } from '../api/userOffers';
import { publicCatalogService } from '../services/api';
import api from '../services/api';
import { getProductImageUrl } from '../utils/productImageUtils';


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
  // Recuperar filtros guardados de sessionStorage
  const getSavedFilters = () => {
    try {
      const saved = sessionStorage.getItem('promocionesPageFilters');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error recuperando filtros:', e);
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
  const hasActiveSession = isUserSessionActive();

  // Sincronizar filtros guardados cuando se monta el componente
  useEffect(() => {
    const savedFilters = getSavedFilters();
    if (savedFilters) {
      setFilters(savedFilters);
    }
  }, []); // Solo ejecutar una vez al montar

  // Cargar productos con promociones desde la base de datos local
  useEffect(() => {
    const loadPromoProducts = async () => {
      setLoading(true);
      try {
        console.log('🔍 DEBUG - Iniciando carga de productos con ofertas');
        
        let allProducts = [];

        // Buscar productos con ofertas desde la base de datos local
        try {
          const searchResponse = await api.get('/products/with-offers');
          console.log('🔍 DEBUG - Respuesta del backend:', searchResponse.data);

          if (searchResponse.data.success && searchResponse.data.data.products) {
            const localProducts = searchResponse.data.data.products;
            console.log('🔍 DEBUG - Productos recibidos:', localProducts.length);
            
            if (localProducts.length > 0) {
              console.log('🔍 DEBUG - Primer producto del backend:', {
                id: localProducts[0].id,
                id_linea: localProducts[0].id_linea,
                catalogoId: localProducts[0].catalogoId,
                descripcion: localProducts[0].descripcion
              });
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
              
              // Determinar si es nuevo (45 días)
              const isNewProduct = product.opc_nuevo === 'S' || 
                                 (product.fecha_alta && new Date(product.fecha_alta) > new Date(Date.now() - 45 * 24 * 60 * 60 * 1000));
              
              // Usar los valores que ya vienen calculados del backend
              let finalPrice = product.price;
              let originalPrice = product.originalPrice;
              let discountPercentage = product.discount;
              
              // Si el backend no envió estos valores, calcularlos aquí como fallback
              if (finalPrice === undefined || finalPrice === null || finalPrice === 0) {
                const hasDiscount = product.desc_promo > 0;
                const originalDiscountPercentage = hasDiscount ? parseFloat(product.desc_promo) : 0;
                discountPercentage = hasDiscount ? Math.max(0, originalDiscountPercentage - 10) : 0;
                originalPrice = hasDiscount && numericPrice > 0 ? numericPrice : null;
                finalPrice = hasDiscount && discountPercentage > 0 && numericPrice > 0 
                  ? (numericPrice - (numericPrice * (discountPercentage / 100))) 
                  : numericPrice;
              }
              
              // Asegurar que discountPercentage sea un número
              discountPercentage = discountPercentage !== undefined && discountPercentage !== null ? parseFloat(discountPercentage) : 0;
              
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
                rating: product.rating || 0,
                ratingCount: product.ratingCount || product.totalRatings || 0,
                linea: product.linea || product.id_linea,
                id_linea: product.id_linea || product.linea, // Para filtro de categoría
                catalogoId: product.catalogoId, // Para filtro de catálogo
                fechaAlta: product.fecha_alta,
                temporada: product.temporada,
                opcNuevo: product.opc_nuevo,
                opcPromo: product.opc_promo,
                descPromo: product.desc_promo,
                genero: product.genero,
                sector: product.sector,
                detalles: product.detalles,
                codigo: product.codigo || product.id_articulo || product.id,
                id_articulo: product.id_articulo || product.id,
                precio1: numericPrice
              };
            });

            // Aplicar ofertas de usuario UNA SOLA VEZ para todos los productos
            allProducts = await applyUserOffersToProducts(allProducts);
            
            // Debug: Verificar productos específicos después de aplicar ofertas
            const productosEspecificos = ['515422585712', '50552258912', '515422524904', '2855708612', '515422524512'];
            const productosEncontrados = allProducts.filter(p => productosEspecificos.includes(String(p.id)));
            console.log('🔍 DEBUG - Productos específicos encontrados después de applyUserOffersToProducts:', productosEncontrados.length);
            if (productosEncontrados.length > 0) {
              productosEncontrados.forEach(p => {
                console.log('🔍 DEBUG - Producto encontrado:', {
                  id: p.id,
                  title: p.title,
                  hasUserOffer: p.hasUserOffer,
                  userOffer: p.userOffer,
                  discount: p.discount,
                  descPromo: p.descPromo
                });
              });
            } else {
              console.warn('⚠️ NINGUNO de los productos específicos está en la lista después de applyUserOffersToProducts');
            }
            
            // Contar productos con ofertas personalizadas
            const productosConOfertasPersonalizadas = allProducts.filter(p => p.hasUserOffer === true);
            console.log('🔍 DEBUG - Total productos con hasUserOffer=true:', productosConOfertasPersonalizadas.length);
            
            // Asegurar que id_linea se preserve correctamente después de aplicar ofertas
            allProducts = allProducts.map(product => {
              // Preservar id_linea del producto original antes de aplicar ofertas
              const originalIdLinea = product.id_linea;
              const originalCatalogoId = product.catalogoId;
              
              return {
                ...product,
                hasUserOffer: product.hasUserOffer || false,
                userOffer: product.userOffer || null,
                // Asegurar que id_linea se preserve correctamente (importante para filtros)
                id_linea: originalIdLinea !== undefined && originalIdLinea !== null ? originalIdLinea : (product.linea || null),
                catalogoId: originalCatalogoId !== undefined && originalCatalogoId !== null ? originalCatalogoId : null
              };
            });
            
            // Debug: Verificar que id_linea se preserve
            if (allProducts.length > 0) {
              console.log('🔍 DEBUG - Después de aplicar ofertas, primer producto:', {
                id: allProducts[0].id,
                id_linea: allProducts[0].id_linea,
                catalogoId: allProducts[0].catalogoId,
                hasIdLinea: allProducts[0].hasOwnProperty('id_linea')
              });
            }
            
            console.log('🔍 DEBUG - Productos mapeados:', allProducts.length);
            if (allProducts.length > 0) {
              console.log('🔍 DEBUG - Primer producto mapeado:', {
                id: allProducts[0].id,
                id_linea: allProducts[0].id_linea,
                catalogoId: allProducts[0].catalogoId
              });
            }
          }
        } catch (error) {
          console.error('❌ Error cargando productos:', error);
          allProducts = [];
        }

            // Ordenar productos: primero los que tienen ofertas personalizadas (hasUserOffer === true)
            allProducts.sort((a, b) => {
              // Si ambos tienen oferta personalizada o ninguno, mantener orden original
              if ((a.hasUserOffer && b.hasUserOffer) || (!a.hasUserOffer && !b.hasUserOffer)) {
                return 0;
              }
              // Si solo 'a' tiene oferta personalizada, va primero
              if (a.hasUserOffer && !b.hasUserOffer) {
                return -1;
              }
              // Si solo 'b' tiene oferta personalizada, va primero
              return 1;
            });
            
            console.log(`✅ Total: ${allProducts.length} productos con promociones`);
            const productosConOfertasPersonalizadas = allProducts.filter(p => p.hasUserOffer === true);
            console.log(`🔍 Productos con ofertas personalizadas: ${productosConOfertasPersonalizadas.length}`);
            setProductsWithOffers(allProducts);
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
    console.log('🔍 DEBUG - filterProducts ejecutado', {
      productsCount: products.length,
      filters: currentFilters
    });
    
    if (!products || products.length === 0) return [];
    
    let filtered = [...products];

    // Filtrar por categoría (soporta selección múltiple)
    const selectedCategories = Array.isArray(currentFilters.categories) && currentFilters.categories.length > 0
      ? currentFilters.categories.filter(cat => cat !== 'todos') // Excluir la opción "todos"
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

    // Filtrar por tallas - EXACT MATCH ONLY (restrictive)
    if (currentFilters.sizes && currentFilters.sizes.length > 0) {
      filtered = filtered.filter(product => {
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

    // Filtrar por catálogo (soporta selección múltiple)
    const selectedCatalogs = Array.isArray(currentFilters.catalogs) && currentFilters.catalogs.length > 0
      ? currentFilters.catalogs.filter(cat => cat !== 'todos') // Excluir la opción "todos"
      : (currentFilters.catalog && currentFilters.catalog !== '' && currentFilters.catalog !== 'Seleccione' ? [String(currentFilters.catalog)] : []);
    
    if (selectedCatalogs.length > 0) {
      filtered = filtered.filter(product => {
        const productCatalogoId = String(product.catalogoId || product.catalog || '');
        return selectedCatalogs.some(catalogId => String(catalogId) === productCatalogoId);
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
        return sorted.sort((a, b) => {
          // Primero ordenar por hasUserOffer (ofertas personalizadas primero)
          if (a.hasUserOffer !== b.hasUserOffer) {
            return a.hasUserOffer ? -1 : 1;
          }
          // Luego por precio
          return (a.price || 0) - (b.price || 0);
        });
      case 'precio-mayor':
        return sorted.sort((a, b) => {
          // Primero ordenar por hasUserOffer (ofertas personalizadas primero)
          if (a.hasUserOffer !== b.hasUserOffer) {
            return a.hasUserOffer ? -1 : 1;
          }
          // Luego por precio
          return (b.price || 0) - (a.price || 0);
        });
      case 'más-recientes':
        return sorted.sort((a, b) => {
          // Primero ordenar por hasUserOffer (ofertas personalizadas primero)
          if (a.hasUserOffer !== b.hasUserOffer) {
            return a.hasUserOffer ? -1 : 1;
          }
          // Luego por fecha
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });
      case 'más-antiguos':
        return sorted.sort((a, b) => {
          // Primero ordenar por hasUserOffer (ofertas personalizadas primero)
          if (a.hasUserOffer !== b.hasUserOffer) {
            return a.hasUserOffer ? -1 : 1;
          }
          // Luego por fecha
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        });
      case 'nombre-a-z':
        return sorted.sort((a, b) => {
          // Primero ordenar por hasUserOffer (ofertas personalizadas primero)
          if (a.hasUserOffer !== b.hasUserOffer) {
            return a.hasUserOffer ? -1 : 1;
          }
          // Luego por nombre
          return (a.title || '').localeCompare(b.title || '');
        });
      case 'nombre-z-a':
        return sorted.sort((a, b) => {
          // Primero ordenar por hasUserOffer (ofertas personalizadas primero)
          if (a.hasUserOffer !== b.hasUserOffer) {
            return a.hasUserOffer ? -1 : 1;
          }
          // Luego por nombre
          return (b.title || '').localeCompare(a.title || '');
        });
      default:
        // Por defecto, ordenar por hasUserOffer (ofertas personalizadas primero)
        return sorted.sort((a, b) => {
          if (a.hasUserOffer !== b.hasUserOffer) {
            return a.hasUserOffer ? -1 : 1;
          }
          return 0;
        });
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
    try {
      sessionStorage.setItem('promocionesPageFilters', JSON.stringify(newFilters));
    } catch (e) {
      console.error('Error guardando filtros:', e);
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
      sessionStorage.removeItem('promocionesPageFilters');
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

  const location = useLocation();
  const canonicalUrl = `https://cherrydistribuidores.com.mx${location.pathname}`;

  return (
    <>
      <Helmet>
        <title>Rebajas - Cherry Central</title>
        <meta name="description" content="Descubre las mejores rebajas y ofertas en Cherry Central. Descuentos especiales en moda femenina." />
        <link rel="canonical" href={canonicalUrl} />
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

export default PromocionesPage; 