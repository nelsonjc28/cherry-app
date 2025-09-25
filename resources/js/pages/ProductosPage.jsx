import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import CatalogFilter from '../components/CatalogFilter/CatalogFilter';
import CherryButton from '../components/CherryButton/CherryButton';
import { getIconPath } from '../utils/assetPaths';
import { fetchProducts, getAvailableColors, getAvailableSizes } from '../api/cherryApi';
import { publicCatalogService } from '../services/api';
import './ProductosPage.css';

const ProductosPage = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogs, setCatalogs] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
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
        console.log('🔍 ProductosPage: Respuesta de catálogos:', response);
        
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
          
          // No establecer automáticamente un catálogo, dejar "Seleccione"
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

  // Cargar colores y tallas disponibles
  useEffect(() => {
    const loadFiltersData = async () => {
      try {
        const [colors, sizes] = await Promise.all([
          getAvailableColors(),
          getAvailableSizes()
        ]);
        
        setAvailableColors(colors);
        setAvailableSizes(sizes);
      } catch (error) {
        console.error('Error cargando datos de filtros:', error);
        setAvailableColors([]);
        setAvailableSizes([]);
      }
    };

    loadFiltersData();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const allProducts = await fetchProducts();
        setProducts(allProducts);
        setFilteredProducts(allProducts);
      } catch (error) {

        setProducts([]);
        setFilteredProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Filtrar productos
  useEffect(() => {
    let filtered = [...products];

    // Filtrar por catálogo
    if (filters.catalog && filters.catalog !== 'Todos los catálogos' && filters.catalog !== 'Seleccione') {
      filtered = filtered.filter(product => {
        // Verificar si el producto pertenece al catálogo seleccionado
        const productCatalog = product.catalog || product.catalogue || product.catalogName || '';
        return productCatalog.toLowerCase().includes(filters.catalog.toLowerCase()) ||
               product.catalogId === filters.catalog ||
               product.catalog_id === filters.catalog;
      });
    }

    // Aplicar filtros
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


  if (loading) {
    return (
      <>
        <Helmet>
          <title>Productos - Cherry Central</title>
        </Helmet>
        
        <main className="productos-page">
          <div className="container">
            <div className="productos-loading">
              <div className="loading-spinner"></div>
              <p>Cargando productos...</p>
            </div>
          </div>
  </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Productos - Cherry Central</title>
        <meta name="description" content="Explora nuestra amplia colección de productos de moda femenina en Cherry Central." />
      </Helmet>

      <main className="productos-page">
        <div className="container">
          {/* Header */}
          <div className="productos-header">
            <h1>Nuestros Productos</h1>
            <p>Descubre nuestra amplia colección de moda femenina</p>
          </div>

          <div className="productos-content">
            {/* Filtros */}
            <aside className="productos-filters">
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

            {/* Productos */}
            <div className="productos-main">
              <div className="productos-header-section">
                <h2>Productos disponibles</h2>
                <p>{filteredProducts.length} productos encontrados</p>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="productos-empty">
                  <div className="empty-icon">
                    <img src={getIconPath('Shopping Cart.svg')} alt="Sin productos" />
                  </div>
                  <h3>No se encontraron productos</h3>
                  <p>Intenta ajustar los filtros para encontrar lo que buscas</p>
                  <CherryButton 
                    variant="outline" 
                    size="medium"
                    onClick={handleClearFilters}
                  >
                    Limpiar filtros
                  </CherryButton>
                </div>
              ) : (
                <div className="productos-grid">
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onFavoriteToggle={handleFavoriteToggle}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Información adicional */}
          <div className="productos-info">
            <div className="info-section">
              <h3>¿Cómo encontrar el producto perfecto?</h3>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Filter.svg')} alt="Filtros" />
                  </div>
                  <h4>Usa los filtros</h4>
                  <p>Filtra por categoría, precio, color y más</p>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Search.svg')} alt="Búsqueda" />
                  </div>
                  <h4>Busca específicamente</h4>
                  <p>Utiliza la búsqueda para encontrar productos exactos</p>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Shopping Cart.svg')} alt="Compras" />
                  </div>
                  <h4>Agrega al carrito</h4>
                  <p>Haz clic en "Agregar al carrito" para comprar</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default ProductosPage; 
