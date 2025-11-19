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

        console.log(response.data.catalogs);
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

        // Cargar TODOS los productos que coincidan con la búsqueda
        // (sin límite para poder filtrar localmente después)
        const result = await getProductsWithRatings('Cherry 2025 - 2026', {
          limit: null,  // Cargar todos para búsqueda
          random: true  // Orden aleatorio
        });

        const allProducts = result.products || result || [];
        const productsWithOffers = await applyUserOffersToProducts(allProducts);

        // Aplicar búsqueda/filtros
        let filtered = productsWithOffers;

        // Filtrar por query de búsqueda (con soporte para plurales/singulares)
        if (query) {
          filtered = filtered.filter(product => {
            const match = flexibleSearchInFields(query, {
              descripcion: product.descripcion || product.title || '',
              title: product.title || product.descripcion || '',
              codigo: product.codigo || product.id_articulo || '',
              description: product.description || ''
            }, ['descripcion', 'title', 'codigo', 'description']);

            if (match) {
            }

            return match;
          });
        }

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
  }, [query, colorFilter, skuFilter]);

  // Filtrar productos basado en filtros adicionales
  useEffect(() => {
    let filtered = [...products];
    console.log(filters.catalog);

    // Filtrar por catálogo
    if (filters.catalog && filters.catalog !== 'Todos los catálogos' && filters.catalog !== 'Seleccione') {

      filtered = filtered.filter(product => {
        // Verificar si el producto pertenece al catálogo seleccionado
        const productCatalog = product.catalog || '';
        return productCatalog == filters.catalog;
      });

    }

    // Aplicar filtros adicionales (usando código)
    if (filters.category && filters.category !== '') {
      filtered = filtered.filter(product => {
        const productLineaId = product.category_id;
        return productLineaId == filters.category;
      });
    }

    // Filtrar por precio
    if (filters.priceRange.min > 0 || filters.priceRange.max > 0) {
      filtered = filtered.filter(product => {
        const price = product.price || 0;
        const minPrice = filters.priceRange.min || 0;
        const maxPrice = filters.priceRange.max || Infinity;

        if (maxPrice > 0) {
          return price >= minPrice && price <= maxPrice;
        } else {
          return price >= minPrice;
        }
      });
    }

    // Filtrar por colores adicionales
    if (filters.colors && filters.colors.length > 0) {
      filtered = filtered.filter(product => {
        if (!product.colors || product.colors.length === 0) return false;

        return filters.colors.some(filterColor => {
          const filterColorLower = filterColor.toLowerCase();
          return product.colors.some(productColor => {
            const productColorLower = productColor.toLowerCase();
            return productColorLower === filterColorLower ||
              productColorLower.includes(filterColorLower);
          });
        });
      });
    }

    // Filtrar por tallas
    if (filters.sizes && filters.sizes.length > 0) {
      filtered = filtered.filter(product => {
        if (!product.sizes || product.sizes.length === 0) return false;

        return filters.sizes.some(filterSize => {
          const filterSizeLower = filterSize.toLowerCase();
          return product.sizes.some(productSize => {
            const productSizeLower = productSize.toString().toLowerCase();
            return productSizeLower === filterSizeLower ||
              productSizeLower.includes(filterSizeLower);
          });
        });
      });
    }

    // Filtrar por disponibilidad (con existencia)
    if (filters.availability === 'con-existencia') {
      filtered = filtered.filter(product => {
        const stock = product.stock || product.inventario || product.inventory || 0;
        return stock > 0;
      });
    }

    // Filtrar por código adicional
    if (filters.codigo && filters.codigo.trim() !== '') {
      const codigoLower = filters.codigo.trim().toLowerCase();
      filtered = filtered.filter(product => {
        return (
          (product.codigo && product.codigo.toLowerCase().includes(codigoLower)) ||
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
            // Ordenar por fecha de creación (más recientes primero)
            const dateA = new Date(a.created_at || a.fecha_alta || 0);
            const dateB = new Date(b.created_at || b.fecha_alta || 0);
            return dateB - dateA;

          case 'Precio: menor a mayor':
            const priceA = parseFloat(a.price || a.precio || a.precio1 || 0);
            const priceB = parseFloat(b.price || b.precio || b.precio1 || 0);
            return priceA - priceB;

          case 'Precio: mayor a menor':
            const priceA2 = parseFloat(a.price || a.precio || a.precio1 || 0);
            const priceB2 = parseFloat(b.price || b.precio || b.precio1 || 0);
            return priceB2 - priceA2;

          case 'Nombre A-Z':
            const nameA = (a.title || a.descripcion || a.name || '').toLowerCase();
            const nameB = (b.title || b.descripcion || b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);

          case 'Nombre Z-A':
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

  const handleSortChange = useCallback((e) => {
    setSortBy(e.target.value);
  }, []);

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
                  onChange={handleSortChange}
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
          <div className="container">
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
              <div className="buscar-results-section">
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
                    <div className="buscar-products-grid">
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
                  hideCatalogSelector={false}
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
