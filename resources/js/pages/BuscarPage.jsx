import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import CatalogFilter from '../components/CatalogFilter/CatalogFilter';
import CherryButton from '../components/CherryButton/CherryButton';
import { getIconPath } from '../utils/assetPaths';
import { searchProductsAdvanced, getProductsWithRatings, mapApiProductToAppProduct, getAvailableColors, getAvailableSizes } from '../api/cherryApi';
import { applyUserOffersToProducts } from '../api/userOffers';
import { publicCatalogService } from '../services/api';
import './BuscarPage.css';

const BuscarPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const colorFilter = searchParams.get('color') || '';
  const skuFilter = searchParams.get('sku') || '';
  
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
    category: 'Todas las categorías',
    department: 'Todos los departamentos',
    sector: 'Todos los sectores',
    sizes: [],
    colors: [],
    priceRange: { min: 0, max: 0 },
    codigo: '',
    dtu: ''
  });

  // Cargar catálogos
  useEffect(() => {
    const loadCatalogs = async () => {
      setCatalogLoading(true);
      try {
        const response = await publicCatalogService.getAll();
        
        // Manejar diferentes estructuras de respuesta
        let catalogsData = [];
        
        if (response.data) {
          if (response.data.success && Array.isArray(response.data.data)) {
            // Estructura: { data: { success: true, data: [...] } }
            catalogsData = response.data.data;
          } else if (response.data.success && response.data.data && response.data.data.catalogs) {
            // Estructura: { data: { success: true, data: { catalogs: [...] } } }
            catalogsData = response.data.data.catalogs;
          } else if (response.data.success && response.data.catalogs) {
            // Estructura: { data: { success: true, catalogs: [...] } }
            catalogsData = response.data.catalogs;
          } else if (Array.isArray(response.data)) {
            // Estructura: { data: [...] }
            catalogsData = response.data;
          }
        }
        
        
        if (catalogsData && catalogsData.length > 0) {
          // Mostrar todos los catálogos sin filtrar por estado activo
          setCatalogs(catalogsData);
          
          // No establecer automáticamente un catálogo, dejar "Seleccione"
        } else {
          setCatalogs([]);
        }
      } catch (error) {
        console.error('❌ BuscarPage: Error loading catalogs:', error);
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
        console.error('Error extrayendo datos de filtros:', error);
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

  // Cargar productos
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        let productsData;
        
        // Use advanced search if we have search parameters
        if (query || colorFilter || skuFilter) {
          const searchFilters = {
            ...filters,
            codigo: skuFilter,
            colors: colorFilter ? colorFilter.split(',').map(c => c.trim()) : []
          };
          productsData = await searchProductsAdvanced(query, searchFilters);;
        } else {
          // Load all products if no search parameters
          productsData = await getProductsWithRatings();
        }
        
        // Aplicar ofertas de usuario a todos los productos
        const productsWithOffers = await applyUserOffersToProducts(productsData);;;
        if (productsWithOffers[0]) {
          ;;
        }
        
        setProducts(productsWithOffers);
        setFilteredProducts(productsWithOffers);
      } catch (error) {
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [query, colorFilter, skuFilter]);

  // Filtrar productos basado en filtros adicionales
  useEffect(() => {
    let filtered = [...products];

    // Filtrar por catálogo
    if (filters.catalog && filters.catalog !== 'Todos los catálogos' && filters.catalog !== 'Seleccione') {
      
      filtered = filtered.filter(product => {
        // Verificar si el producto pertenece al catálogo seleccionado
        const productCatalog = product.catalog || product.catalogue || product.catalogName || '';
        const matches = productCatalog.toLowerCase().includes(filters.catalog.toLowerCase()) ||
               product.catalogId === filters.catalog ||
               product.catalog_id === filters.catalog;
        
        return matches;
      });
      
    }

    // Aplicar filtros adicionales
    if (filters.category && filters.category !== 'Todas las categorías') {
      const categoryLower = filters.category.toLowerCase();
      filtered = filtered.filter(product => {
        const productCategory = product.category?.toLowerCase() || '';
        return productCategory.includes(categoryLower);
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

    setFilteredProducts(filtered);
  }, [filters, products]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      catalog: 'Seleccione',
      availability: 'todos',
      category: 'Todas las categorías',
      department: 'Todos los departamentos',
      sector: 'Todos los sectores',
      sizes: [],
      colors: [],
      priceRange: { min: 0, max: 0 },
      codigo: '',
      dtu: ''
    });
  };

  const handleFavoriteToggle = (productId) => {
    // Handle favorite toggle
  };


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
        <div className="container">
          {/* Header de búsqueda */}
          <div className="buscar-header">
            <h1>Resultados de búsqueda</h1>
            {(query || colorFilter || skuFilter) && (
              <p className="buscar-query">
                Buscando: <strong>"{getSearchDescription()}"</strong>
              </p>
            )}
            <p className="buscar-results">
              {filteredProducts.length} productos encontrados
            </p>
          </div>

          <div className="buscar-content">
            {/* Filtros */}
            <aside className="buscar-filters">
              <CatalogFilter
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                catalogs={catalogs}
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
                <div className="buscar-products-grid">
                  {filteredProducts.map((product, index) => (
                    <ProductCard
                      key={product.id || `product-${index}`}
                      product={product}
                      onFavoriteToggle={handleFavoriteToggle}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default BuscarPage; 
