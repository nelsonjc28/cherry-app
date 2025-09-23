import React, { useState, useEffect } from 'react';
import ProductCard from '../../ProductCard/ProductCard';
import CatalogFilter from '../../CatalogFilter/CatalogFilter';
import CherryButton from '../../CherryButton/CherryButton';
import { getIconPath } from '../../../utils/assetPaths';
import { getPromoProducts, getAvailableColors, getAvailableSizes } from '../../../api/cherryApi';
import { publicCatalogService } from '../../../services/api';
import './PromotionsSection.css';

const PromotionsSection = () => {
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
          // Mostrar todos los catálogos sin filtrar por estado activo
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

  // Cargar colores y tallas disponibles
  useEffect(() => {
    const loadFiltersData = async () => {
      setColorsLoading(true);
      setSizesLoading(true);
      
      try {
        const [colors, sizes] = await Promise.all([
          getAvailableColors(),
          getAvailableSizes()
        ]);
        
        setAvailableColors(colors);
        setAvailableSizes(sizes);
      } catch (error) {
        setAvailableColors([]);
        setAvailableSizes([]);
      } finally {
        setColorsLoading(false);
        setSizesLoading(false);
      }
    };

    loadFiltersData();
  }, []);

  // Cargar productos en promoción
  useEffect(() => {
    const loadPromoProducts = async () => {
      setLoading(true);
      try {
        // Cargar productos en promoción (sin límite para mostrar todos)
        const promoProducts = await getPromoProducts(50); // Aumentar límite para mostrar más productos
        setProducts(promoProducts);
        setFilteredProducts(promoProducts);
      } catch (error) {
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadPromoProducts();
  }, []);

  // Filtrar productos basado en filtros
  useEffect(() => {
    let filtered = [...products];

    // Filtrar por catálogo
    if (filters.catalog && filters.catalog !== 'Todos los catálogos' && filters.catalog !== 'Seleccione') {
      filtered = filtered.filter(product => {
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

    // Filtrar por colores
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

    // Filtrar por código
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

  return (
    <section className="promotions-section">
      <div className="container">
        {/* Header similar al catálogo - móvil */}
        <div className="promotions-section__header-mobile">
          <div className="promotions-section__title-section">
            <div className="promotions-section__content-texts">
              <h2 className="promotions-section__title">🔥 Productos en Promoción</h2>
            </div>
          </div>
          
          <div className="promotions-section__controls">
            <div className="promotions-section__sort-section">
              <span className="promotions-section__sort-label">Ordenar por:</span>
              <select className="promotions-section__sort-select" value="ofertas" readOnly>
                <option value="ofertas">Mejores ofertas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Header similar al catálogo - desktop */}
        <div className="promotions-section__header-desktop">
          <div className="promotions-section__title-section">
            <div className="promotions-section__content-texts">
              <h2 className="promotions-section__title">🔥 Productos en Promoción</h2>
              <span className="promotions-section__results-count">
                <span className="promotions-section__text-results-count">Mostrando </span>
                {filteredProducts.length} productos en oferta
              </span>
            </div>
          </div>
          
          <div className="promotions-section__controls">
            <div className="promotions-section__sort-section">
              <span className="promotions-section__sort-label">Ordenar por:</span>
              <select className="promotions-section__sort-select" value="ofertas" readOnly>
                <option value="ofertas">Mejores ofertas</option>
              </select>
            </div>
          </div>
        </div>

        <div className="promotions-section__content">
          {/* Sidebar con filtros */}
          <aside className="promotions-section__sidebar">
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

          {/* Contenido principal */}
          <div className="promotions-section__main">
            {loading ? (
              <div className="promotions-section__loading">
                <div className="loading-spinner"></div>
                <p>Cargando promociones...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="promotions-section__no-results">
                <div className="no-results-icon">
                  <img src={getIconPath('Search.svg')} alt="Sin promociones" />
                </div>
                <h3>No se encontraron promociones</h3>
                <p>Intenta ajustar los filtros para ver más productos en oferta</p>
                <CherryButton 
                  variant="outline" 
                  size="medium"
                  onClick={handleClearFilters}
                >
                  Limpiar filtros
                </CherryButton>
              </div>
            ) : (
              <div className="promotions-section__products-grid">
                {filteredProducts.map((product, index) => (
                  <ProductCard
                    key={product.id || `promo-product-${index}`}
                    product={product}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromotionsSection;
