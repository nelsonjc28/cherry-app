import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
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
              q: query || '' // Si no hay query, el backend devolverá todos los productos
              // Sin per_page para obtener todos los productos sin límite
            }
          });

          if (searchResponse.data.success && searchResponse.data.data.products) {
            const localProducts = searchResponse.data.data.products;
            
            // Debug: Verificar que los productos tengan los campos correctos del backend
            console.log('Products from backend:', localProducts.length);
            if (localProducts.length > 0) {
              // Mostrar el primer producto completo para debug
              console.log('First product from backend:', localProducts[0]);
              
              // Buscar productos con descuento
              const productsWithDiscount = localProducts.filter(p => p.opc_promo === 'S' && p.desc_promo > 0);
              console.log('Products with discount:', productsWithDiscount.length);
              if (productsWithDiscount.length > 0) {
                console.log('Sample product with discount:', {
                  id: productsWithDiscount[0].id,
                  precio1: productsWithDiscount[0].precio1,
                  price: productsWithDiscount[0].price,
                  originalPrice: productsWithDiscount[0].originalPrice,
                  discount: productsWithDiscount[0].discount,
                  desc_promo: productsWithDiscount[0].desc_promo,
                  opc_promo: productsWithDiscount[0].opc_promo
                });
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
                
                // Determinar si es nuevo (45 días)
                const isNewProduct = product.opc_nuevo === 'S' || 
                                   (product.fecha_alta && new Date(product.fecha_alta) > new Date(Date.now() - 45 * 24 * 60 * 60 * 1000));
                
                // Usar los valores que ya vienen calculados del backend (con descuento reducido del 10% aplicado)
                // El backend ya calcula: price (precio final), originalPrice, discount (reducido)
                let finalPrice = product.price;
                let originalPrice = product.originalPrice;
                let discountPercentage = product.discount;
                
                // Debug para productos con descuento
                if (product.opc_promo === 'S' && product.desc_promo > 0) {
                  console.log('Processing product with discount:', {
                    id: product.id,
                    precio1: product.precio1,
                    desc_promo: product.desc_promo,
                    price_from_backend: product.price,
                    originalPrice_from_backend: product.originalPrice,
                    discount_from_backend: product.discount
                  });
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
                    console.log('Calculated fallback values:', {
                      id: product.id,
                      finalPrice,
                      originalPrice,
                      discountPercentage
                    });
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
                  precio1: numericPrice // Para ordenamiento
                };
              });

            // Aplicar ofertas de usuario
            allProducts = await applyUserOffersToProducts(allProducts);
          }
        } catch (error) {
          console.error('Error buscando productos:', error);
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
        console.error('Error cargando productos:', error);
        setProducts([]);
        setFilteredProducts([]);
        setLoading(false);
      }
    };

    loadProducts();
  }, [query, colorFilter, skuFilter]);

  // Filtrar productos basado en filtros adicionales
  useEffect(() => {
    let filtered = [...products];

    // Filtrar por catálogo
    // filters.catalog contiene el id del catálogo seleccionado, comparar con catalogoId del producto
    if (filters.catalog && filters.catalog !== 'Todos los catálogos' && filters.catalog !== 'Seleccione') {
      filtered = filtered.filter(product => {
        // Comparar el id del catálogo seleccionado con catalogoId del producto
        const productCatalogoId = product.catalogoId;
        return productCatalogoId == filters.catalog;
      });
    }

    // Aplicar filtros adicionales (usando código)
    // filters.category contiene el code de la categoría, comparar con id_linea del producto
    if (filters.category && filters.category !== '') {
      filtered = filtered.filter(product => {
        const productLineaId = product.id_linea;
        return productLineaId == filters.category;
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

    // Filtrar por tallas - usar detalles del backend
    if (filters.sizes && filters.sizes.length > 0) {
      filtered = filtered.filter(product => {
        // Prioridad 1: usar detalles del backend
        if (product.detalles && product.detalles.length > 0) {
          return filters.sizes.some(filterSize => {
            const filterSizeLower = filterSize.toLowerCase();
            return product.detalles.some(detalle => {
              if (!detalle.detalle) return false;
              const productSizeLower = detalle.detalle.toString().toLowerCase();
              return productSizeLower === filterSizeLower ||
                productSizeLower.includes(filterSizeLower);
            });
          });
        }
        // Fallback: usar sizes array
        if (product.sizes && product.sizes.length > 0) {
          return filters.sizes.some(filterSize => {
            const filterSizeLower = filterSize.toLowerCase();
            return product.sizes.some(productSize => {
              const productSizeLower = productSize.toString().toLowerCase();
              return productSizeLower === filterSizeLower ||
                productSizeLower.includes(filterSizeLower);
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

    // Aplicar ordenamiento
    if (filters.sortBy) {
      filtered = [...filtered].sort((a, b) => {
        switch (filters.sortBy) {
          case 'Más recientes':
          case 'más recientes':
            // Ordenar por fecha_alta del backend (más recientes primero)
            const dateA = new Date(a.fechaAlta || a.fecha_alta || a.created_at || 0);
            const dateB = new Date(b.fechaAlta || b.fecha_alta || b.created_at || 0);
            return dateB - dateA;

          case 'Precio: menor a mayor':
          case 'precio-menor':
            // Usar precio1 del backend como fuente principal
            const priceA = parseFloat(a.price || a.precio1 || 0);
            const priceB = parseFloat(b.price || b.precio1 || 0);
            return priceA - priceB;

          case 'Precio: mayor a menor':
          case 'precio-mayor':
            // Usar precio1 del backend como fuente principal
            const priceA2 = parseFloat(a.price || a.precio1 || 0);
            const priceB2 = parseFloat(b.price || b.precio1 || 0);
            return priceB2 - priceA2;

          case 'Nombre A-Z':
          case 'nombre-a-z':
            // Usar descripcion del backend
            const nameA = (a.title || a.descripcion || a.name || '').toLowerCase();
            const nameB = (b.title || b.descripcion || b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);

          case 'Nombre Z-A':
          case 'nombre-z-a':
            // Usar descripcion del backend
            const nameA2 = (a.title || a.descripcion || a.name || '').toLowerCase();
            const nameB2 = (b.title || b.descripcion || b.name || '').toLowerCase();
            return nameB2.localeCompare(nameA2);

          default:
            return 0;
        }
      });
    }

    setFilteredProducts(filtered);
  }, [filters, products]);

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

  return (
    <>
      <Helmet>
        <title>Búsqueda - Cherry Central</title>
        <meta name="description" content={`Resultados de búsqueda para "${getSearchDescription()}" en Cherry Central. Encuentra los mejores productos de moda femenina.`} />
      </Helmet>

      <main className="buscar-page">
        <div className='container'>
          {/* Header section with title and filters  -  MOBILE */}
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
          {/* <div className="container"> */}
            {/* Header de búsqueda */}
            <div className="buscar-header">
              <h1>Resultados de búsqueda</h1>
              {(query || colorFilter || skuFilter) && (
                <p className="buscar-query">
                  <strong>{getSearchDescription()}</strong>
                </p>
              )}
            </div>
            <p className="buscar-results">
              {filteredProducts.length} productos encontrados
            </p>

            <div className="buscar-content">
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
              {/* <div className="buscar-results-section"> */}
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
                    <div className={`buscar-products-grid ${filteredProducts.length === 1 ? 'single-result' : ''}`}>
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
              {/* </div> */}
            </div>
          {/* </div> */}
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
      </main>
    </>
  );
};

export default BuscarPage; 
