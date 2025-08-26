import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import CatalogFilter from '../components/CatalogFilter/CatalogFilter';
import CatalogProductCard from '../components/CatalogProductCard/CatalogProductCard';
import { getIconPath } from '../utils/assetPaths';
import CustomButton from '../components/CustomButton';
import './CatalogPage.css';
import { 
  getProductsByCategory, 
  getAllProducts, 
  getAvailableCategories, 
  mapApiProductToAppProduct, 
  getProductsByAvailability,
  searchProductsAdvanced,
  getProductsWithRatings
} from '../api/cherryApi';
import { publicCategoryService } from '../services/api';
import api from '../services/api';
import { getProductImageUrl } from '../utils/productImageUtils';

const CategoryPage = ({ categorySlug }) => {
  // Debug: verificar que estamos recibiendo el categorySlug
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || 'all';
  const colorFilter = searchParams.get('color') || '';
  const dtuFilter = searchParams.get('dtu') || '';
  
  // State management for filters and products
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('más recientes');
  const [allProducts, setAllProducts] = useState([]); // Store all products
  const [filteredProducts, setFilteredProducts] = useState([]); // Store filtered products
  const [loading, setLoading] = useState(true);
  const [catalogs, setCatalogs] = useState([]); // Store all available catalogs
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [filters, setFilters] = useState({
    catalog: '',
    availability: 'todos',
    category: 'Todas las categorías',
    department: 'Todos los departamentos',
    sector: 'Todos los sectores',
    sizes: [],
    priceRange: { min: 0, max: 0 }
  });

  // Function to get available colors from products
  const getAvailableColors = (products) => {
    const colorSet = new Set();
    products.forEach(product => {
      if (product.colors && product.colors.length > 0) {
        product.colors.forEach(color => {
          if (color && color.trim()) {
            colorSet.add(color.trim());
          }
        });
      }
    });
    return Array.from(colorSet).sort();
  };

  // Function to generate product image URL from AWS S3
  const getProductImageUrl = (externalProductId) => {
    if (!externalProductId) return '/images/placeholder-product.png';
    
    // Construir URL de AWS S3 basada en el ID del producto
    return `https://cherry-fotos.s3.amazonaws.com/shopify/${externalProductId}/${externalProductId}_1.jpg`;
  };

  // Function to filter products based on current filters
  const filterProducts = (products, currentFilters) => {
    
    if (!products || products.length === 0) return [];

    let filtered = [...products];

    // Filter by category (if not "Todas las categorías")
    if (currentFilters.category && currentFilters.category !== 'Todas las categorías') {
      const categoryLower = currentFilters.category.toLowerCase();
      filtered = filtered.filter(product => {
        const productCategory = product.category?.toLowerCase() || '';
        const productTitle = product.title?.toLowerCase() || '';
        const productDescription = product.description?.toLowerCase() || '';
        
        return productCategory.includes(categoryLower) || 
               productTitle.includes(categoryLower) ||
               productDescription.includes(categoryLower);
      });
    }

    // Filter by department (if not "Todos los departamentos")
    if (currentFilters.department && currentFilters.department !== 'Todos los departamentos') {
      const departmentLower = currentFilters.department.toLowerCase();
      filtered = filtered.filter(product => {
        const productCategory = product.category?.toLowerCase() || '';
        const productTitle = product.title?.toLowerCase() || '';
        const productDescription = product.description?.toLowerCase() || '';
        
        // Map departments to categories
        const departmentCategoryMap = {
          'ropa casual': ['blusa', 'camisa', 'pantalon', 'jeans', 'vestido casual'],
          'ropa formal': ['vestido', 'traje', 'blazer', 'camisa formal'],
          'ropa deportiva': ['deportivo', 'gym', 'fitness', 'running'],
          'accesorios': ['accesorio', 'bolsa', 'cartera', 'cinturon', 'collar'],
          'calzado': ['zapato', 'tenis', 'sandalias', 'botas']
        };
        
        const departmentCategories = departmentCategoryMap[departmentLower] || [];
        return departmentCategories.some(cat => 
          productCategory.includes(cat) || 
          productTitle.includes(cat) || 
          productDescription.includes(cat)
        );
      });
    }

    // Filter by price range
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

    // Filter by availability
    if (currentFilters.availability === 'con-existencia') {
      filtered = filtered.filter(product => product.stock > 0);
    } else if (currentFilters.availability === 'sin-existencia') {
      filtered = filtered.filter(product => product.stock === 0);
    }

    return filtered;
  };

  // Function to sort products
  const sortProducts = (products, sortOption) => {
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
  };

  // Load catalogs
  useEffect(() => {
    const loadCatalogs = async () => {
      // Si tenemos categorySlug, no necesitamos cargar todos los catálogos
      if (categorySlug) {
        setCatalogLoading(false);
        return;
      }

      setCatalogLoading(true);
      try {
        // Para categorías, no necesitamos cargar catálogos
        // Simplemente establecer un catálogo por defecto
        setCatalogs([]);
        setFilters(prev => ({
          ...prev,
          catalog: 'default'
        }));
      } catch (error) {
        setCatalogs([]);
      } finally {
        setCatalogLoading(false);
      }
    };

    loadCatalogs();
  }, [categorySlug]);

  // Load products based on category, catalog and availability
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        let productsData;
        
        // Si se proporciona categorySlug, cargar productos de esa categoría específica
        if (categorySlug) {
          try {
            // Primero obtener la categoría para obtener su código
            const categoryResponse = await publicCategoryService.getBySlug(categorySlug);
      
            
            if (categoryResponse.data.success && categoryResponse.data.category) {
              const categoryData = categoryResponse.data.category;
              setCurrentCategory(categoryData);
              

              
              // Ahora obtener los productos externos directamente de la API externa
              if (categoryData.code) {
                try {
                  // Petición directa a la API externa
                  const externalResponse = await fetch('https://cherryapi.estrategiadmgs.com.mx/cherryApi/');
                  const externalData = await externalResponse.json();
                  
                  // Filtrar productos por código de categoría
                  const filteredExternalProducts = externalData.filter(product => {
                    const productLineaId = product.linea?.id_linea;
                    const categoryCode = categoryData.code;
                    
                    return productLineaId == categoryCode; // Usando == como solicitaste
                  });
                  
                                    // Mapear productos externos filtrados
                  const allExternalProducts = filteredExternalProducts.map(product => {
                    // Extraer precio y convertirlo a número
                    const rawPrice = product.precio1;
                    const numericPrice = typeof rawPrice === 'string' ? parseFloat(rawPrice.replace(/[^\d.-]/g, '')) : parseFloat(rawPrice) || 0;
                    
                    // Extraer colores si existen - usar detalles como en ProductPage
                    const productColors = product.detalles ? 
                      [...new Set(product.detalles.map(d => d.nombreColor).filter(Boolean))] : 
                      [];
                    const availableColors = productColors.length > 0 ? productColors : ['black']; // Color por defecto
                    
                    // Determinar si el producto es nuevo basado en propiedades reales
                    const isNewProduct = product.opc_nuevo === 'S' || 
                                       (product.fecha_alta && new Date(product.fecha_alta) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // Últimos 30 días
                    
                    // Calcular descuento si existe
                    const hasDiscount = product.opc_promo === 'S' && product.desc_promo > 0;
                    const discountPercentage = hasDiscount ? product.desc_promo : 0;
                    const originalPrice = hasDiscount ? (numericPrice / (1 - discountPercentage / 100)) : numericPrice;
                    
                    return {
                      id: product.id_articulo,
                      title: product.descripcion || 'Sin nombre',
                      description: product.descripcion || 'Sin descripción',
                      price: numericPrice,
                      originalPrice: originalPrice, // Precio original con descuento
                      discount: discountPercentage, // Porcentaje de descuento real
                      image: getProductImageUrl(product.id_articulo),
                      brand: product.marca || 'Sin marca',
                      category: categoryData.name,
                      stock: product.inventario || 0,
                      colors: availableColors,
                      colores: productColors, // Mantener colores originales para ExternalProductCard
                      

                      isNew: isNewProduct, // Basado en propiedades reales
                      rating: 0, // Se actualizará con la consulta a la BD
                      ratingCount: 0, // Se actualizará con la consulta a la BD
                      linea: product.linea,
                      // Propiedades adicionales de la API externa
                      fechaAlta: product.fecha_alta,
                      fechaAct: product.fechaAct,
                      temporada: product.temporada,
                      opcNuevo: product.opc_nuevo,
                      opcPromo: product.opc_promo,
                      descPromo: product.desc_promo
                    };
                  });
                  
                  // Por ahora solo productos externos, productos locales se pueden agregar después
                  productsData = [...allExternalProducts];
                  
                  // Contar productos nuevos
                  const newProductsCount = allExternalProducts.filter(product => product.isNew).length;
                  
                  // Obtener calificaciones reales de la base de datos
                  if (allExternalProducts.length > 0) {
                    try {
                      const productIds = allExternalProducts.map(product => product.id);
                      
                      const ratingsResponse = await api.get('/products/ratings', {
                        params: { product_ids: productIds }
                      });
                      
                      if (ratingsResponse.data.success) {
                        const ratings = ratingsResponse.data.data.ratings;
                        
                        // Actualizar productos con calificaciones reales
                        productsData = allExternalProducts.map(product => ({
                          ...product,
                          rating: ratings[product.id]?.average || 0,
                          ratingCount: ratings[product.id]?.count || 0
                        }));
                      }
                    } catch (error) {
                      console.error('Error al obtener calificaciones:', error);
                      // Continuar con productos sin calificaciones
                    }
                  }
                  
                } catch (error) {
                  console.error('Error al obtener productos de API externa:', error);
                  productsData = [];
                }
              } else {
                productsData = [];
              }
            } else {
              productsData = [];
            }
          } catch (error) {
            console.error('Error al cargar productos de categoría:', error);
            productsData = [];
          }
        } else {
          // Solo cargar productos si tenemos un catálogo seleccionado
          if (!filters.catalog) {
            setLoading(false);
            return;
          }
          
          // Carga normal de productos
          if (category === 'all') {
            // Load all products with ratings optimized
            productsData = await getProductsWithRatings(filters.catalog);
          } else {
            // Para categorías específicas, obtener por categoría
            productsData = await getProductsByCategory(category, filters.catalog);
          }
        }
        
        // Filtrar productos nulos
        const validProducts = productsData.filter(p => p !== null);
        
        setAllProducts(validProducts);
        setFilteredProducts(validProducts);
        

      } catch (error) {
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [category, filters.catalog, categorySlug]);

  // Apply filters and sorting when filters or sortBy changes
  useEffect(() => {
    if (allProducts.length > 0) {
      let filtered = filterProducts(allProducts, filters);
      
      // Apply color filter from URL
      if (colorFilter) {
        const colorFilters = colorFilter.split(',').map(c => c.trim());
        filtered = filtered.filter(product => {
          if (!product.colors || product.colors.length === 0) return false;
          
          return colorFilters.some(filterColor => {
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
      
      // Apply DTU filter from URL
      if (dtuFilter) {
        const dtuFilters = dtuFilter.split(',').map(d => d.trim());
        filtered = filtered.filter(product => {
          return dtuFilters.some(filterDtu => {
            const filterDtuLower = filterDtu.toLowerCase();
            return (
              (product.dtu && product.dtu.toLowerCase().includes(filterDtuLower)) ||
              (product.DTU && product.DTU.toLowerCase().includes(filterDtuLower))
            );
          });
        });
      }
      
      filtered = sortProducts(filtered, sortBy);
      setFilteredProducts(filtered);
    }
  }, [filters.category, filters.department, filters.sector, filters.sizes, filters.priceRange, sortBy, allProducts, colorFilter, dtuFilter]);

  // Handle filter modal
  const toggleFilterModal = () => {
    setIsFilterModalOpen(!isFilterModalOpen);
  };

  // Handle sort change
  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setFilters({
      catalog: catalogs.length > 0 ? catalogs[0].name : '',
      availability: 'todos',
      category: 'Todas las categorías',
      department: 'Todos los departamentos',
      sector: 'Todos los sectores',
      sizes: [],
      priceRange: { min: 0, max: 0 }
    });
  };

  // Handle favorite toggle
  const handleFavoriteToggle = (productId) => {
    // Implement favorite functionality here
  };

  // Handle share functionality
  const handleShareCategory = () => {
    const categoryUrl = `${window.location.origin}/categoria/${categorySlug}`;
    
    if (navigator.share) {
      // Use native sharing if available
      navigator.share({
        title: `Categoría ${currentCategory?.name || 'de productos'} Cherry`,
        text: `Explora nuestra categoría ${currentCategory?.name || 'de productos'}. Encuentra las últimas tendencias en moda y accesorios.`,
        url: categoryUrl
      });
    } else {
      // Fallback to clipboard copy
      copyToClipboard(categoryUrl);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      if (window.showToast) {
        window.showToast('Enlace de la categoría copiado al portapapeles', 'success');
      }
    } catch (err) {
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      if (window.showToast) {
        window.showToast('Enlace de la categoría copiado al portapapeles', 'success');
      }
    }
  };

  const totalResults = filteredProducts.length;
  const currentProducts = filteredProducts;

  return (
    <>
      <Helmet>
        <title>{currentCategory ? `${currentCategory.name} - Cherry` : 'Categoría de productos - Cherry'}</title>
        <meta name="description" content={currentCategory ? `Explora nuestra categoría ${currentCategory.name}. Encuentra las últimas tendencias en moda y accesorios.` : 'Explora nuestro catálogo completo de productos Cherry. Encuentra las últimas tendencias en moda y accesorios.'} />
      </Helmet>

      <div className="catalog-page">
        <div className="container">
          {/* Header section with title and filters  -  MOBILE */}
          <div className="catalog-page__header-mobile">
            <div className="catalog-page__title-section">
              <h1 className="catalog-page__title">
                {currentCategory ? currentCategory.name : 'Categoría de productos'}
              </h1>
              <div className='catalog-page__content-texts'>
                <span className="catalog-page__results-count">
                  ({totalResults})
                  <p className="catalog-page__text-results-count">Resultados</p>
                </span>
                <CustomButton
                  variant="filled"
                  size="small"
                  className="catalog-page__compare-clients-btn"
                  iconLeft={<img src={getIconPath('Whatsapp.svg')} alt="Compartir categoría" style={{ width: 16, height: 16 }} />}
                  onClick={handleShareCategory}
                >
                  <span className="catalog-page__whatsapp-text">Compartir a clientes</span>
                </CustomButton>
              </div>
            </div>

            <div className="catalog-page__controls">
              <div className="catalog-page__sort-section">
                <div className="catalog-page__mobile-filter-controls">
                  <button
                    className="catalog-page__mobile-filter-btn"
                    onClick={toggleFilterModal}
                  >
                    <img src={getIconPath('Filter.svg')} alt="Filtros" />
                    <img src={getIconPath('Chevron Down.svg')} alt="Expandir" />
                  </button>
                </div>
                <label htmlFor="sort-select" className="catalog-page__sort-label">Ordenar por:</label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={handleSortChange}
                  className="catalog-page__sort-select"
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
          <div className="catalog-page__header-desktop">
            <div className="catalog-page__title-section">
              <h1 className="catalog-page__title">
                {currentCategory ? currentCategory.name : 'Categoría de productos'}
              </h1>
              <div className='catalog-page__content-texts'>
                <span className="catalog-page__results-count">
                  ({totalResults})
                  <p className="catalog-page__text-results-count">Resultados</p>
                </span>
              </div>
            </div>

            <div className="catalog-page__controls">
              <div className="catalog-page__sort-section">
                <label htmlFor="sort-select" className="catalog-page__sort-label">Ordenar por:</label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={handleSortChange}
                  className="catalog-page__sort-select"
                >
                  <option value="más recientes">más recientes</option>
                  <option value="precio-menor">Precio: menor a mayor</option>
                  <option value="precio-mayor">Precio: mayor a menor</option>
                  <option value="nombre-a-z">Nombre: A-Z</option>
                  <option value="nombre-z-a">Nombre: Z-A</option>
                </select>
              </div>
              <CustomButton
                variant="filled"
                size="medium"
                iconLeft={<img src={getIconPath('Whatsapp.svg')} alt="Compartir categoría" style={{ width: 16, height: 16 }} />}
                onClick={handleShareCategory}
              >
                <span className="catalog-page__whatsapp-text">Compartir a clientes</span>
              </CustomButton>
            </div>
          </div>

          {/* Main content */}
          <div className="catalog-page__content">
            {/* Filters sidebar - DESKTOP */}
            <aside className="catalog-page__sidebar">
              <CatalogFilter
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                isMobile={false}
                catalogs={catalogs}
                catalogLoading={catalogLoading}
                hideCatalogSelector={!!categorySlug}
              />
            </aside>

            {/* Products grid */}
            <main className="catalog-page__products-section">
              {loading ? (
                <div className="catalog-page__loading">
                  <div className="catalog-page__loading-spinner"></div>
                  <p>Cargando productos...</p>
                </div>
              ) : currentProducts.length === 0 ? (
                <div className="catalog-page__no-results">
                  <h3>No se encontraron productos</h3>
                  <p>Intenta ajustar los filtros de búsqueda</p>
                </div>
              ) : (
                <>
                  <div className="catalog-page__products-grid">
                    {currentProducts.map((product, index) => {
                      return (
                      <CatalogProductCard
                        key={product.id}
                        product={product}
                        onFavoriteToggle={handleFavoriteToggle}
                      />
                      );
                    })}
                  </div>
                  
                </>
              )}
            </main>
          </div>

          {/* Mobile filter modal */}
          {isFilterModalOpen && (
            <div className="catalog-page__filter-modal-overlay" onClick={toggleFilterModal}>
            <div className="catalog-page__filter-modal">
              <CatalogFilter
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                isMobile={true}
                onClose={toggleFilterModal}
                catalogs={catalogs}
                catalogLoading={catalogLoading}
                hideCatalogSelector={!!categorySlug}
              />
            </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CategoryPage;
