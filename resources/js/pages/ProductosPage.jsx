import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
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
import './ProductosPage.css';

const ProductosPage = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogs, setCatalogs] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  // Recuperar filtros guardados de sessionStorage
  const getSavedFilters = () => {
    try {
      const saved = sessionStorage.getItem('productosPageFilters');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
    }
    return {
    catalog: 'Seleccione',
    availability: 'todos',
    category: 'Todas las categorías',
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
        
        let catalogsData = [];
        if (response.data) {
          if (response.data.success && response.data.catalogs) {
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

  // Extraer colores y tallas de productos cargados
  useEffect(() => {
    if (products.length > 0) {
      const colorSet = new Set();
      const sizeSet = new Set();

      products.forEach(product => {
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
        if (product.colors && product.colors.length > 0) {
          product.colors.forEach(color => {
            if (color && color.trim()) colorSet.add(color.trim());
          });
        }
        if (product.sizes && product.sizes.length > 0) {
          product.sizes.forEach(size => {
            if (size && size.trim()) sizeSet.add(size.trim());
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
    }
  }, [products]);

  // Cargar productos desde el backend local
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        // Usar el mismo endpoint que BuscarPage
        const searchResponse = await api.get('/products/search', {
          params: { q: '' }
        });

        if (searchResponse.data.success && searchResponse.data.data.products) {
          const localProducts = searchResponse.data.data.products;
          
          // Mapear productos al formato esperado
          const mappedProducts = localProducts.map(product => {
            const rawPrice = product.precio1;
            const numericPrice = typeof rawPrice === 'string' 
              ? parseFloat(rawPrice.replace(/[^\d.-]/g, '')) 
              : parseFloat(rawPrice) || 0;
            
            const productColors = product.detalles 
              ? [...new Set(product.detalles.map(d => d.nombreColor).filter(Boolean))] 
              : [];
            const availableColors = productColors.length > 0 ? productColors : ['black'];
            
            const productSizes = product.detalles 
              ? [...new Set(product.detalles.map(d => d.detalle).filter(Boolean))] 
              : [];
            const availableSizes = productSizes.length > 0 ? productSizes : ['M'];
            
            const isNewProduct = product.opc_nuevo === 'S' || 
              (product.fecha_alta && new Date(product.fecha_alta) > new Date(Date.now() - 45 * 24 * 60 * 60 * 1000));
            
            let finalPrice = product.price;
            let originalPrice = product.originalPrice;
            let discountPercentage = product.discount;
            
            if (finalPrice === undefined || finalPrice === null || finalPrice === 0) {
              const hasDiscount = product.opc_promo === 'S' && product.desc_promo > 0;
              const originalDiscountPercentage = hasDiscount ? parseFloat(product.desc_promo) : 0;
              discountPercentage = hasDiscount ? Math.max(0, originalDiscountPercentage - 10) : 0;
              originalPrice = hasDiscount && numericPrice > 0 
                ? (numericPrice / (1 - originalDiscountPercentage / 100)) 
                : null;
              finalPrice = hasDiscount && discountPercentage > 0 && numericPrice > 0 
                ? (numericPrice - (numericPrice * (discountPercentage / 100))) 
                : numericPrice;
            }
            
            discountPercentage = discountPercentage !== undefined && discountPercentage !== null 
              ? parseFloat(discountPercentage) 
              : 0;
            
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
              sizes: availableSizes,
              isNew: isNewProduct,
              rating: product.rating || 0,
              ratingCount: product.ratingCount || product.totalRatings || 0,
              linea: product.linea || product.id_linea,
              id_linea: product.id_linea || product.linea,
              catalogoId: product.catalogoId,
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
              precio1: numericPrice
            };
          });

          // Aplicar ofertas de usuario
          const productsWithOffers = await applyUserOffersToProducts(mappedProducts);
          
          setProducts(productsWithOffers);
          setFilteredProducts(productsWithOffers);
        } else {
          setProducts([]);
          setFilteredProducts([]);
        }
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

    // Filtrar por catálogo (soporta selección múltiple)
    const selectedCatalogs = Array.isArray(filters.catalogs) && filters.catalogs.length > 0
      ? filters.catalogs.filter(cat => cat !== 'todos') // Excluir la opción "todos"
      : (filters.catalog && filters.catalog !== 'Todos los catálogos' && filters.catalog !== 'Seleccione' && filters.catalog !== '' ? [String(filters.catalog)] : []);
    
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
    const selectedCategories = Array.isArray(filters.categories) && filters.categories.length > 0
      ? filters.categories.filter(cat => cat !== 'todos') // Excluir la opción "todos"
      : (filters.category && filters.category !== '' && filters.category !== 'Todas las categorías' ? (Array.isArray(filters.category) ? filters.category.filter(cat => cat !== 'todos') : [String(filters.category)]) : []);
    
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

    // Filtrar por precio
    if (filters.priceRange.min > 0 || filters.priceRange.max > 0) {
      filtered = filtered.filter(product => {
        const price = parseFloat(product.price || product.precio1 || 0);
        const minPrice = filters.priceRange.min || 0;
        const maxPrice = filters.priceRange.max || Infinity;
        
        if (maxPrice > 0 && maxPrice !== Infinity) {
          return price >= minPrice && price <= maxPrice;
        }
        return price >= minPrice;
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
              return productColorLower === filterColorLower || productColorLower.includes(filterColorLower);
            });
          });
        }
        if (product.colors && product.colors.length > 0) {
        return filters.colors.some(filterColor => {
          const filterColorLower = filterColor.toLowerCase();
          return product.colors.some(productColor => {
            const productColorLower = productColor.toLowerCase();
              return productColorLower === filterColorLower || productColorLower.includes(filterColorLower);
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
        const stock = parseFloat(product.inventario || product.stock || 0);
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

    // Ordenamiento
    if (filters.sortBy) {
      filtered = [...filtered].sort((a, b) => {
        switch (filters.sortBy) {
          case 'Más recientes':
            const dateA = new Date(a.fechaAlta || a.fecha_alta || a.created_at || 0);
            const dateB = new Date(b.fechaAlta || b.fecha_alta || b.created_at || 0);
            return dateB - dateA;
          
          case 'Precio: menor a mayor':
            return parseFloat(a.price || a.precio1 || 0) - parseFloat(b.price || b.precio1 || 0);
          
          case 'Precio: mayor a menor':
            return parseFloat(b.price || b.precio1 || 0) - parseFloat(a.price || a.precio1 || 0);
          
          case 'Nombre A-Z':
            return (a.title || a.descripcion || '').toLowerCase().localeCompare((b.title || b.descripcion || '').toLowerCase());
          
          case 'Nombre Z-A':
            return (b.title || b.descripcion || '').toLowerCase().localeCompare((a.title || a.descripcion || '').toLowerCase());
          
          default:
            return 0;
        }
      });
    }

    setFilteredProducts(filtered);
  }, [filters, products]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    try {
      sessionStorage.setItem('productosPageFilters', JSON.stringify(newFilters));
    } catch (e) {
    }
  };

  const handleClearFilters = () => {
    const defaultFilters = {
      catalog: 'Seleccione',
      availability: 'todos',
      category: 'Todas las categorías',
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
    try {
      sessionStorage.removeItem('productosPageFilters');
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

  // Check if any filters are active
  const hasActiveFilters = () => {
    return (
      (filters.catalog && filters.catalog !== 'Seleccione') ||
      (filters.catalogs && filters.catalogs.length > 0) ||
      (filters.category && filters.category !== '' && filters.category !== 'Todas las categorías') ||
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

  const location = useLocation();
  const canonicalUrl = `https://cherrydistribuidores.com.mx${location.pathname}`;

  return (
    <>
      <Helmet>
        <title>Productos - Cherry Central</title>
        <meta name="description" content="Explora nuestra amplia colección de productos de moda femenina en Cherry Central." />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      <main className="productos-page">
        <div className="container">
          {/* Header Mobile */}
          <div className="productos-header-mobile">
            <div className="productos-controls">
              <div className="productos-sort-section">
                <div className="productos-mobile-filter-controls">
                  <button
                    className="productos-mobile-filter-btn"
                    onClick={toggleFilterModal}
                  >
                    <img src={getIconPath('Filter.svg')} alt="Filtros" />
                    <img src={getIconPath('Chevron Down.svg')} alt="Expandir" />
                  </button>
                </div>
                <label htmlFor="sort-select" className="productos-sort-label">Ordenar por:</label>
                <select
                  id="sort-select"
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange({ ...filters, sortBy: e.target.value })}
                  className="productos-sort-select"
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

          {/* Header */}
          {!hasActiveFilters() && (
            <div className="productos-header">
              <h1>Todos los Productos</h1>
              <p>Descubre nuestra amplia colección de moda</p>
            </div>
          )}

          <p className="productos-results">
            {filteredProducts.length} productos encontrados
          </p>

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
                isMobile={false}
              />
            </aside>

            {/* Productos */}
            <div className="productos-main">
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
                <>
                  <div className="productos-grid">
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

        {/* Mobile filter modal */}
        {isFilterModalOpen && (
          <div className="productos-filter-modal-overlay" onClick={toggleFilterModal}>
            <div className="productos-filter-modal" onClick={(e) => e.stopPropagation()}>
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
              />
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default ProductosPage; 
