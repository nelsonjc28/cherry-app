import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import CatalogFilter from '../components/CatalogFilter/CatalogFilter';
import CherryButton from '../components/CherryButton/CherryButton';
import InfiniteScrollLoader from '../components/InfiniteScrollLoader/InfiniteScrollLoader';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import { getIconPath } from '../utils/assetPaths';
import { applyUserOffersToProducts } from '../api/userOffers';
import { publicCatalogService } from '../services/api';
import api from '../services/api';
import { getProductImageUrl } from '../utils/productImageUtils';
import './DestacadosOfertasPage.css';

const DestacadosOfertasPage = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogs, setCatalogs] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState('all');

  const offerTypes = [
    { id: 'all', name: 'Todas las ofertas', description: 'Ver todas las ofertas disponibles' },
    { id: 'flash', name: 'Ofertas Flash', description: 'Ofertas por tiempo limitado' },
    { id: 'clearance', name: 'Liquidación', description: 'Hasta 70% de descuento' },
    { id: 'bundle', name: 'Paquetes', description: 'Combo de productos con descuento' }
  ];

  const [filters, setFilters] = useState({
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
  });

  const toggleFilterModal = useCallback(() => {
    setIsFilterModalOpen(prev => !prev);
  }, []);

  // Cargar catálogos
  useEffect(() => {
    const loadCatalogs = async () => {
      setCatalogLoading(true);
      try {
        const response = await publicCatalogService.getAll();
        let catalogsData = [];

        if (response.data) {
          catalogsData = response.data.catalogs;
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

  // Estado para categorías disponibles desde el endpoint
  const [availableCategories, setAvailableCategories] = useState([]);

  // Cargar categorías desde el endpoint /api/categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await api.get('/categories');
        if (response.data.success && response.data.categories) {
          // Mapear las categorías al formato esperado por CatalogFilter
          const mappedCategories = response.data.categories.map(category => ({
            code: category.code,
            name: category.name
          }));
          setAvailableCategories(mappedCategories);
        } else {
          setAvailableCategories([]);
        }
      } catch (error) {
        console.error('Error cargando categorías:', error);
        setAvailableCategories([]);
      }
    };

    loadCategories();
  }, []);

  // Cargar colores y tallas disponibles desde productos cargados
  useEffect(() => {
    const extractFiltersFromProducts = () => {
      try {
        const colorSet = new Set();
        const sizeSet = new Set();

        products.forEach(product => {
          // PRIORIDAD 1: Extraer de detalles
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
        setAvailableColors([]);
        setAvailableSizes([]);
      }
    };

    if (products.length > 0) {
      extractFiltersFromProducts();
    }
  }, [products]);

  // Cargar productos con ofertas desde la base de datos local
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        let allProducts = [];

        // Buscar productos con ofertas desde la base de datos local
        try {
          const searchResponse = await api.get('/products/with-offers');

          if (searchResponse.data.success && searchResponse.data.data.products) {
            const localProducts = searchResponse.data.data.products;
            
            // Debug: Verificar estructura de productos del backend
            if (localProducts.length > 0) {
              console.log('🔍 DEBUG - Primer producto del backend:', {
                id: localProducts[0].id,
                id_linea: localProducts[0].id_linea,
                linea: localProducts[0].linea,
                catalogoId: localProducts[0].catalogoId,
                descripcion: localProducts[0].descripcion
              });
            }
            
            // Mapear TODOS los productos locales al formato esperado (sin filtrar todavía)
            // Necesitamos todos para aplicar ofertas personalizadas primero
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
                id_linea: product.id_linea || product.linea,
                catalogoId: product.catalogoId,
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

            // El backend ya filtró productos con desc_promo > 0 y productos con ofertas del usuario
            // Solo necesitamos aplicar ofertas de usuario para actualizar precios y agregar información de userOffer
            // Aplicar ofertas de usuario UNA SOLA VEZ para todos los productos
            allProducts = await applyUserOffersToProducts(allProducts);
            
            // Marcar todos los productos con hasUserOffer para evitar llamadas individuales en ProductCard
            allProducts = allProducts.map(product => ({
              ...product,
              hasUserOffer: product.hasUserOffer || false,
              // Asegurar que userOffer esté presente si existe
              userOffer: product.userOffer || null,
              // Asegurar que id_linea se preserve correctamente (importante para filtros)
              id_linea: product.id_linea !== undefined && product.id_linea !== null ? product.id_linea : (product.linea || null),
              catalogoId: product.catalogoId !== undefined && product.catalogoId !== null ? product.catalogoId : null
            }));
          }
        } catch (error) {
          console.error('Error cargando productos:', error);
          allProducts = [];
        }

        setProducts(allProducts);
        setFilteredProducts(allProducts);
        setLoading(false);
      } catch (error) {
        console.error('Error cargando productos:', error);
        setProducts([]);
        setFilteredProducts([]);
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Filtrar productos basado en filtros y tipo de oferta
  useEffect(() => {
    console.log('🔍 DEBUG - useEffect de filtros ejecutado', {
      productsCount: products.length,
      filters: filters,
      selectedOffer: selectedOffer
    });
    
    let filtered = [...products];

    // Filtrar por tipo de oferta
    if (selectedOffer !== 'all') {
      filtered = filtered.filter(product => {
      const discount = product.discount || 0;
      
      switch (selectedOffer) {
        case 'flash':
          return discount >= 20 && discount <= 40;
        case 'clearance':
          return discount >= 50;
        case 'bundle':
          return product.isPromo || discount >= 30;
        default:
          return true;
      }
      });
    }

    // Filtrar por catálogo (soporta selección múltiple)
    const selectedCatalogs = Array.isArray(filters.catalogs) && filters.catalogs.length > 0
      ? filters.catalogs.filter(cat => cat !== 'todos') // Excluir la opción "todos"
      : (filters.catalog && filters.catalog !== 'Todos los catálogos' && filters.catalog !== 'Seleccione' && filters.catalog !== '' ? [String(filters.catalog)] : []);
    
    if (selectedCatalogs.length > 0) {
      filtered = filtered.filter(product => {
        const productCatalogoId = String(product.catalogoId || '');
        return selectedCatalogs.some(catalogId => String(catalogId) === productCatalogoId);
      });
    }

    // Filtrar por categoría (soporta selección múltiple)
    const selectedCategories = Array.isArray(filters.categories) && filters.categories.length > 0
      ? filters.categories.filter(cat => cat !== 'todos') // Excluir la opción "todos"
      : (filters.category && filters.category !== '' ? (Array.isArray(filters.category) ? filters.category.filter(cat => cat !== 'todos') : [String(filters.category)]) : []);
    
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(product => {
        // Normalizar id_linea y categoryCode a números para comparación (ignorar ceros a la izquierda)
        const productLineaId = product.id_linea ? parseInt(String(product.id_linea), 10) : null;
        return selectedCategories.some(categoryCode => {
          const normalizedCategoryCode = parseInt(String(categoryCode), 10);
          return productLineaId !== null && normalizedCategoryCode === productLineaId;
        });
      });
    }

    // Filtrar por precio
    if (filters.priceRange.min > 0 || filters.priceRange.max > 0) {
      filtered = filtered.filter(product => {
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

    // Filtrar por colores
    if (filters.colors && filters.colors.length > 0) {
      filtered = filtered.filter(product => {
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

    // Filtrar por disponibilidad
    if (filters.availability === 'con-existencia') {
      filtered = filtered.filter(product => {
        const stock = parseFloat(product.inventario || product.stock || product.inventory || 0);
        return stock > 0;
      });
    }

    // Filtrar por código
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

    // Aplicar ordenamiento
    if (filters.sortBy) {
      filtered = [...filtered].sort((a, b) => {
        switch (filters.sortBy) {
          case 'Más recientes':
          case 'más recientes':
            const dateA = new Date(a.fechaAlta || a.fecha_alta || a.created_at || 0);
            const dateB = new Date(b.fechaAlta || b.fecha_alta || b.created_at || 0);
            return dateB - dateA;

          case 'Precio: menor a mayor':
          case 'precio-menor':
            const priceA = parseFloat(a.price || a.precio1 || 0);
            const priceB = parseFloat(b.price || b.precio1 || 0);
            return priceA - priceB;

          case 'Precio: mayor a menor':
          case 'precio-mayor':
            const priceA2 = parseFloat(a.price || a.precio1 || 0);
            const priceB2 = parseFloat(b.price || b.precio1 || 0);
            return priceB2 - priceA2;

          case 'Nombre A-Z':
          case 'nombre-a-z':
            const nameA = (a.title || a.descripcion || a.name || '').toLowerCase();
            const nameB = (b.title || b.descripcion || b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);

          case 'Nombre Z-A':
          case 'nombre-z-a':
            const nameA2 = (a.title || a.descripcion || a.name || '').toLowerCase();
            const nameB2 = (b.title || b.descripcion || b.name || '').toLowerCase();
            return nameB2.localeCompare(nameA2);

          default:
            return 0;
        }
      });
    }

    setFilteredProducts(filtered);
  }, [filters, products, selectedOffer]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
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
    });
  };

  const handleOfferClick = (offerId) => {
    setSelectedOffer(offerId);
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

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Ofertas Destacadas - Cherry Central</title>
        </Helmet>
        
        <main className="destacados-ofertas-page">
          <div className="container">
            <div className="ofertas-loading">
              <div className="loading-spinner"></div>
              <p>Cargando ofertas destacadas...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Ofertas Destacadas - Cherry Central</title>
        <meta name="description" content="Descubre las mejores ofertas y descuentos en Cherry Central. Ofertas flash, liquidaciones y paquetes especiales." />
      </Helmet>

      <main className="destacados-ofertas-page">
        <div className="container">
          {/* Header */}
          <div className="ofertas-header">
            <h1>Ofertas Destacadas</h1>
            <p>Las mejores ofertas y descuentos especiales</p>
          </div>

          {/* Banner principal */}
          <div className="ofertas-banner">
            <div className="banner-content">
              <h2>¡Ofertas Imperdibles!</h2>
              <p>Descuentos especiales en productos seleccionados</p>
              <div className="banner-stats">
                <div className="stat-item">
                  <span className="stat-number">{products.length}</span>
                  <span className="stat-label">Productos en oferta</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">Hasta 70%</span>
                  <span className="stat-label">De descuento</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">24h</span>
                  <span className="stat-label">Ofertas flash</span>
                </div>
              </div>
            </div>
            <div className="banner-image">
              <img src={getIconPath('Bullhorn.svg')} alt="Ofertas destacadas" />
            </div>
          </div>

          {/* Tipos de ofertas */}
          <div className="ofertas-tipos">
            <div className="tipos-grid">
              {offerTypes.map((offer) => (
                <button
                  key={offer.id}
                  className={`tipo-btn ${selectedOffer === offer.id ? 'active' : ''}`}
                  onClick={() => handleOfferClick(offer.id)}
                >
                  <div className="tipo-content">
                    <h3>{offer.name}</h3>
                    <p>{offer.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Controles móviles */}
          <div className="nuevos-page__header-mobile">
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
                  <option value="Más recientes">Más recientes</option>
                  <option value="Precio: menor a mayor">Precio: menor a mayor</option>
                  <option value="Precio: mayor a menor">Precio: mayor a menor</option>
                  <option value="Nombre A-Z">Nombre: A-Z</option>
                  <option value="Nombre Z-A">Nombre: Z-A</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contenido principal con filtros y productos */}
          <div className="ofertas-content-wrapper">
            {/* Filtros sidebar - DESKTOP */}
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
                availableCategories={availableCategories}
              />
            </aside>

            {/* Productos */}
          <div className="ofertas-content">
            <div className="ofertas-header-section">
              <h2>
                {offerTypes.find(o => o.id === selectedOffer)?.name}
              </h2>
                <p>{filteredProducts.length} productos en oferta</p>
            </div>

              {filteredProducts.length === 0 ? (
              <div className="ofertas-empty">
                <div className="empty-icon">
                  <img src={getIconPath('Bullhorn.svg')} alt="Sin ofertas" />
                </div>
                <h3>No hay ofertas disponibles</h3>
                <p>
                  {selectedOffer === 'all' 
                    ? 'No hay ofertas activas en este momento'
                    : `No hay productos en "${offerTypes.find(o => o.id === selectedOffer)?.name}"`
                  }
                </p>
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
              <div className="ofertas-products-grid">
                    {infiniteScroll.displayedItems.map((product) => (
                  <ProductCard
                    key={product.id}
                        product={{
                          ...product,
                          // Asegurar que hasUserOffer y userOffer se pasen explícitamente
                          hasUserOffer: product.hasUserOffer || false,
                          userOffer: product.userOffer || null
                        }}
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
            </div>
          </div>

          {/* Información adicional */}
          <div className="ofertas-info">
            <div className="info-section">
              <h3>¿Cómo funcionan nuestras ofertas?</h3>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Bell.svg')} alt="Notificaciones" />
                  </div>
                  <h4>Ofertas Flash</h4>
                  <p>Descuentos por tiempo limitado, actúa rápido</p>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Award.svg')} alt="Liquidación" />
                  </div>
                  <h4>Liquidación</h4>
                  <p>Descuentos profundos en productos seleccionados</p>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Shopping Cart.svg')} alt="Paquetes" />
                  </div>
                  <h4>Paquetes</h4>
                  <p>Combos de productos con descuento especial</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="ofertas-cta">
            <div className="cta-content">
              <h2>¿No quieres perderte ninguna oferta?</h2>
              <p>Suscríbete para recibir notificaciones de ofertas especiales</p>
              <div className="cta-actions">
                <CherryButton variant="red" size="large">
                  Suscribirse
                </CherryButton>
                <Link to="/promociones">
                  <CherryButton variant="outline" size="large">
                    Ver todas las rebajas
                  </CherryButton>
                </Link>
              </div>
            </div>
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
                  availableCategories={availableCategories}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default DestacadosOfertasPage; 
