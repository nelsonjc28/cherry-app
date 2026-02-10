import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { applyUserOffersToProducts } from '../api/userOffers';
import ProductGrid from '../components/ProductGrid/ProductGrid';
import CatalogFilter from '../components/CatalogFilter/CatalogFilter';
import { publicCatalogService } from '../services/api';
import api from '../services/api';
import { getProductImageUrl } from '../utils/productImageUtils';
import './CatalogosPage.css';

const CatalogosPage = () => {
  const { catalog } = useParams();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalResults, setTotalResults] = useState(0);
  const [catalogs, setCatalogs] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);

  // Recuperar filtros guardados de sessionStorage
  const getSavedFilters = () => {
    try {
      const saved = sessionStorage.getItem('catalogosPageFilters');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
    }
    return {
      catalog: 'Seleccione',
      availability: 'todos',
      category: '',
      department: 'Todos los departamentos',
      sector: 'Todos los sectores',
      sizes: [],
      colors: [],
      priceRange: { min: 0, max: 0 },
      codigo: '',
      dtu: ''
    };
  };

  const [filters, setFilters] = useState(getSavedFilters);

  // Obtener el catálogo desde la URL
  const productCatalog = catalog || 'primavera-verano';

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
          // Ordenar catálogos por code (ascendente)
          const sortedCatalogs = [...catalogsData].sort((a, b) => {
            const codeA = parseInt(a.code) || 999999;
            const codeB = parseInt(b.code) || 999999;
            return codeA - codeB;
          });

          setCatalogs(sortedCatalogs);

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

  // Extraer colores y tallas de productos cargados
  useEffect(() => {
    if (products.length > 0) {
      const colorSet = new Set();
      const sizeSet = new Set();

      products.forEach(product => {
        if (product.detalles && product.detalles.length > 0) {
          product.detalles.forEach(detalle => {
            if (detalle.nombreColor) colorSet.add(detalle.nombreColor.trim());
            if (detalle.detalle) sizeSet.add(detalle.detalle.trim());
          });
        }
        if (product.colors) product.colors.forEach(c => { if (c) colorSet.add(c.trim()); });
        if (product.sizes) product.sizes.forEach(s => { if (s) sizeSet.add(s.trim()); });
      });

      setAvailableColors(Array.from(colorSet).sort());
      
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
      setAvailableSizes(sortedSizes);
    }
  }, [products]);

  // Cargar productos desde el backend local
  useEffect(() => {
    const fetchCatalogProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const searchResponse = await api.get('/products/search', {
          params: { q: '' }
        });

        if (searchResponse.data.success && searchResponse.data.data.products) {
          const localProducts = searchResponse.data.data.products;
          const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
          
          // Mapear productos al formato esperado
          const mappedProducts = localProducts.map(product => {
            const rawPrice = product.precio1;
            const numericPrice = typeof rawPrice === 'string' 
              ? parseFloat(rawPrice.replace(/[^\d.-]/g, '')) 
              : parseFloat(rawPrice) || 0;
            
            const productColors = product.detalles 
              ? [...new Set(product.detalles.map(d => d.nombreColor).filter(Boolean))] 
              : [];
            
            const productSizes = product.detalles 
              ? [...new Set(product.detalles.map(d => d.detalle).filter(Boolean))] 
              : [];
            
            const isNewProduct = product.opc_nuevo === 'S' || 
              (product.fecha_alta && new Date(product.fecha_alta) > fortyFiveDaysAgo);
            
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
            
            return {
              id: product.id_articulo || product.id,
              title: product.descripcion || 'Sin nombre',
              description: product.descripcion || 'Sin descripción',
              price: finalPrice,
              originalPrice: originalPrice,
              discount: discountPercentage || 0,
              image: getProductImageUrl(product.id_articulo || product.id),
              brand: product.marca || 'Sin marca',
              stock: product.inventario || 0,
              colors: productColors.length > 0 ? productColors : ['black'],
              sizes: productSizes.length > 0 ? productSizes : ['M'],
              isNew: isNewProduct,
              rating: product.rating || 0,
              ratingCount: product.ratingCount || 0,
              category_id: product.id_linea,
              catalog_id: product.catalogoId,
              catalogoId: product.catalogoId,
              codigo: product.codigo || product.id_articulo || product.id,
              id_articulo: product.id_articulo || product.id,
              dtu: product.dtu || product.DTU,
              DTU: product.DTU || product.dtu,
              detalles: product.detalles
            };
          });

          // Aplicar ofertas de usuario
          const productsWithOffers = await applyUserOffersToProducts(mappedProducts);

          setProducts(productsWithOffers);
          setFilteredProducts(productsWithOffers);
          setTotalResults(productsWithOffers.length);
        } else {
          setProducts([]);
          setFilteredProducts([]);
          setTotalResults(0);
        }
      } catch (err) {
        setError('Error al cargar los productos del catálogo');
        setProducts([]);
        setFilteredProducts([]);
        setTotalResults(0);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalogProducts();
  }, [productCatalog]);

  // Filtro local igual que en CatalogPage.jsx
  const filterProducts = (products, currentFilters) => {
    if (!products || products.length === 0) return [];
    let filtered = [...products];

    // Filtrar por catálogo (soporta selección múltiple)
    const selectedCatalogs = Array.isArray(currentFilters.catalogs) && currentFilters.catalogs.length > 0
      ? currentFilters.catalogs.filter(cat => cat !== 'todos') // Excluir la opción "todos"
      : (currentFilters.catalog && currentFilters.catalog !== 'Todos los catálogos' && currentFilters.catalog !== 'Seleccione' && currentFilters.catalog !== '' ? [String(currentFilters.catalog)] : []);
    
    if (selectedCatalogs.length > 0) {
      filtered = filtered.filter(product => {
        const productCatalogoId = product.catalogoId || product.catalog || product.catalog_id || null;
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
    const selectedCategories = Array.isArray(currentFilters.categories) && currentFilters.categories.length > 0
      ? currentFilters.categories.filter(cat => cat !== 'todos') // Excluir la opción "todos"
      : (currentFilters.category && currentFilters.category !== '' ? (Array.isArray(currentFilters.category) ? currentFilters.category.filter(cat => cat !== 'todos') : [String(currentFilters.category)]) : []);
    
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(product => {
        // Normalizar category_id y categoryCode a números para comparación (ignorar ceros a la izquierda)
        const productLineaId = product.category_id || product.id_linea;
        const normalizedProductLineaId = productLineaId ? parseInt(String(productLineaId), 10) : null;
        return selectedCategories.some(categoryCode => {
          const normalizedCategoryCode = parseInt(String(categoryCode), 10);
          return normalizedProductLineaId !== null && normalizedCategoryCode === normalizedProductLineaId;
        });
      });
    }
    if (currentFilters.priceRange.min > 0 || currentFilters.priceRange.max > 0) {
      filtered = filtered.filter(product => {
        const price = product.price || 0;
        const minPrice = currentFilters.priceRange.min || 0;
        const maxPrice = currentFilters.priceRange.max || Infinity;
        if (maxPrice > 0) {
          return price >= minPrice && price <= maxPrice;
        } else {
          return price >= minPrice;
        }
      });
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
      filtered = filtered.filter(product => true);
    }
    // Filtro por código
    if (currentFilters.codigo && currentFilters.codigo.trim() !== '') {
      const codigoLower = currentFilters.codigo.trim().toLowerCase();
      filtered = filtered.filter(product => {
        return (
          (product.codigo && product.codigo.toLowerCase().includes(codigoLower)) ||
          (product.id && product.id.toString().toLowerCase().includes(codigoLower)) ||
          (product.id_articulo && product.id_articulo.toString().toLowerCase().includes(codigoLower))
        );
      });
    }
    // Filtro por dtu
    if (currentFilters.dtu && currentFilters.dtu.trim() !== '') {
      const dtuLower = currentFilters.dtu.trim().toLowerCase();
      filtered = filtered.filter(product => {
        return (
          (product.dtu && product.dtu.toLowerCase().includes(dtuLower)) ||
          (product.DTU && product.DTU.toLowerCase().includes(dtuLower))
        );
      });
    }

    // Filtrar por tallas
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

    return filtered;
  };

  // Actualizar productos filtrados cuando cambian los filtros
  useEffect(() => {
    setFilteredProducts(filterProducts(products, filters));
    setTotalResults(filterProducts(products, filters).length);
  }, [filters, products]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    try {
      sessionStorage.setItem('catalogosPageFilters', JSON.stringify(newFilters));
    } catch (e) {
    }
  };

  const handleClearFilters = () => {
    const defaultFilters = {
      catalog: 'Seleccione',
      availability: 'todos',
      category: '',
      department: 'Todos los departamentos',
      sector: 'Todos los sectores',
      sizes: [],
      colors: [],
      priceRange: { min: 0, max: 0 },
      codigo: '',
      dtu: ''
    };
    setFilters(defaultFilters);
    try {
      sessionStorage.removeItem('catalogosPageFilters');
    } catch (e) {
    }
  };


  const getPageTitle = () => {
    const titles = {
      'primavera-verano': 'Catálogo Primavera-Verano',
      'otono-invierno': 'Catálogo Otoño-Invierno',
      'elegante': 'Colección Elegante',
      'casual': 'Colección Casual',
      'fiesta': 'Colección Fiesta',
      'edicion-limitada': 'Edición Limitada',
      'colaboraciones': 'Colaboraciones Especiales'
    };
    return titles[productCatalog] || 'Catálogo';
  };

  const getPageDescription = () => {
    const descriptions = {
      'primavera-verano': 'Descubre nuestra colección de primavera-verano con diseños frescos y coloridos.',
      'otono-invierno': 'La colección otoño-invierno con estilos cálidos y elegantes.',
      'elegante': 'Una colección elegante para ocasiones especiales y eventos formales.',
      'casual': 'Estilos casuales y cómodos para el día a día.',
      'fiesta': 'Diseños festivos perfectos para celebraciones y eventos especiales.',
      'edicion-limitada': 'Una edición exclusiva y limitada con diseños únicos.',
      'colaboraciones': 'Colaboraciones especiales con diseñadores y marcas exclusivas.'
    };
    return descriptions[productCatalog] || 'Explora nuestro catálogo de productos seleccionados.';
  };

  if (loading) {
    return (
      <div className="catalogos-page">
        <div className="container">
          <div className="loading-container">
            <svg className="loading-spinner-svg" width="40" height="40" viewBox="0 0 40 40">
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="#f3f3f3"
                strokeWidth="4"
              />
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="4"
                strokeDasharray="113"
                strokeDashoffset="113"
                strokeLinecap="round"
                className="spinner-circle"
              />
            </svg>
            <p>Cargando productos del catálogo...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="catalogos-page">
        <div className="container">
          <div className="error-container">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Intentar de nuevo</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="catalogos-page">
      <div className="container">
        {/* Header Section */}
        <div className="catalogos-page__header">
          <div className="catalogos-page__title-section">
            <h1 className="catalogos-page__title">{getPageTitle()}</h1>
            <p className="catalogos-page__description">{getPageDescription()}</p>
            <div className="catalogos-page__results">
              <span className="catalogos-page__results-count">
                {totalResults} productos en el catálogo
              </span>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <CatalogFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          isMobile={false}
          catalogs={catalogs}
          catalogLoading={catalogLoading}
          availableColors={availableColors}
          availableSizes={availableSizes}
        />

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="catalogos-page__content">
            <ProductGrid products={filteredProducts} />
          </div>
        ) : (
          <div className="catalogos-page__empty">
            <h3>No se encontraron productos en este catálogo</h3>
            <p>Pronto tendremos productos disponibles en este catálogo.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogosPage; 
