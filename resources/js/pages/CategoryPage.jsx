import { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams, useLocation } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import CatalogFilter from '../components/CatalogFilter/CatalogFilter';
import CherryButton from '../components/CherryButton/CherryButton';
import InfiniteScrollLoader from '../components/InfiniteScrollLoader/InfiniteScrollLoader';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import { getIconPath } from '../utils/assetPaths';
import './BuscarPage.css';
import './NuevosPage.css';
import { publicCategoryService } from '../services/api';
import api from '../services/api';
import { getProductImageUrl } from '../utils/productImageUtils';
import { applyUserOffersToProducts } from '../api/userOffers';
import { isProductNewLikeNuevosPage } from '../utils/productNewRules';
import { evaluateProductStatus } from '../utils/productStatusEvaluator';
import useUserStore from '../store/userStore';
import { getEffectiveDescPromoPercent } from '../utils/catalogRebajaUtils';

// Función para mezclar array de forma aleatoria (Fisher-Yates shuffle)
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const CategoryPage = ({ categorySlug }) => {
  const { user } = useUserStore();

  const [searchParams] = useSearchParams();
  const category = categorySlug || searchParams.get('category') || 'all';
  const colorFilter = searchParams.get('color') || '';
  const dtuFilter = searchParams.get('dtu') || '';
  

  // Mapeo de slugs de categoría a nombres legibles
  const categoryNameMapping = {
    'dresses': 'Vestidos',
    'tops': 'Blusas y Tops',
    'pants': 'Pantalones',
    'skirts': 'Faldas',
    'jackets': 'Chaquetas',
    'coats': 'Abrigos',
    'suits': 'Trajes',
    'lingerie': 'Ropa Interior',
    'accessories': 'Accesorios',
    'shoes': 'Zapatos',
    'bags': 'Bolsos'
  };

  // Mapeo de slugs de categoría a códigos de línea de la API
  const categoryCodeMapping = {
    'dresses': '1',
    'tops': '2',
    'pants': '20',
    'skirts': '3',
    'jackets': '4',
    'coats': '5',
    'suits': '6',
    'lingerie': '7',
    'accessories': '8',
    'shoes': '9',
    'bags': '10'
  };
  
  // State management for filters and products
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('más recientes');
  const hasUserSorted = useRef(false);
  const [allProducts, setAllProducts] = useState([]); // Store all products
  const [filteredProducts, setFilteredProducts] = useState([]); // Store filtered products
  const [loading, setLoading] = useState(true);
  const [catalogs, setCatalogs] = useState([]); // Store all available catalogs
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  // Recuperar filtros guardados de sessionStorage
  const getSavedFilters = () => {
    try {
      const saved = sessionStorage.getItem('categoryPageFilters');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
    }
    return {
    catalog: 'Cherry 2025 - 2026',
    availability: 'todos',
    category: '',
    department: 'Todos los departamentos',
    sector: 'Todos los sectores',
    sizes: [],
    colors: [],
    priceRange: { min: 0, max: 0 }
    };
  };

  const [filters, setFilters] = useState(getSavedFilters);

  // Extraer colores y tallas de productos cargados
  useEffect(() => {
    if (allProducts.length > 0) {
      const colorSet = new Set();
      const sizeSet = new Set();

      allProducts.forEach(product => {
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
  }, [allProducts]);

  // Function to generate product image URL from AWS S3
  const getProductImageUrl = (externalProductId) => {
    if (!externalProductId) return '/images/placeholder-product.png';
    
    // Construir URL de AWS S3 basada en el ID del producto
    return `https://cherry-fotos.s3.amazonaws.com/shopify/${externalProductId}/${externalProductId}_1.jpg`;
  };

  // Function to filter products based on current filters
  const filterProducts = (products, currentFilters) => {
    
    if (!products || products.length === 0) {
      return [];
    }
    
    let filtered = [...products];

    // Filter by category (if a category code is selected)
    if (currentFilters.category && currentFilters.category !== '') {
      filtered = filtered.filter(product => {
        // Normalizar id_linea y categoryCode a números para comparación (ignorar ceros a la izquierda)
        const productLineaId = product.linea?.id_linea;
        const normalizedProductLineaId = productLineaId ? parseInt(String(productLineaId), 10) : null;
        const normalizedCategoryCode = parseInt(String(currentFilters.category), 10);
        return normalizedProductLineaId !== null && normalizedCategoryCode === normalizedProductLineaId;
      });
    }

    // Filtrar por catálogo (soporta selección múltiple)
    const selectedCatalogs = Array.isArray(currentFilters.catalogs) && currentFilters.catalogs.length > 0
      ? currentFilters.catalogs.filter(cat => cat !== 'todos' && cat !== 'Seleccione' && cat !== '') // Excluir la opción "todos", "Seleccione" y vacíos
      : (currentFilters.catalog && currentFilters.catalog !== '' && currentFilters.catalog !== 'Seleccione' && currentFilters.catalog !== 'Cherry 2025 - 2026' && currentFilters.catalog !== 'default' ? [String(currentFilters.catalog)] : []);
    
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

    // Filter by availability
    if (currentFilters.availability === 'con-existencia') {
      filtered = filtered.filter(product => product.stock > 0);
    } else if (currentFilters.availability === 'sin-existencia') {
      filtered = filtered.filter(product => product.stock === 0);
    }

    // Filter by colors
    if (currentFilters.colors && currentFilters.colors.length > 0) {
      filtered = filtered.filter(product => {
        if (!product.colors || product.colors.length === 0) {
          return false;
        }
        
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

    // Filter by sizes
    if (currentFilters.sizes && currentFilters.sizes.length > 0) {
      filtered = filtered.filter(product => {
        if (!product.sizes || product.sizes.length === 0) {
          return false;
        }
        
        return currentFilters.sizes.some(filterSize => {
          const filterSizeLower = filterSize.toLowerCase();
          return product.sizes.some(productSize => {
            const productSizeLower = productSize.toLowerCase();
            return productSizeLower === filterSizeLower || 
                   productSizeLower.includes(filterSizeLower) ||
                   filterSizeLower.includes(productSizeLower);
          });
        });
      });
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
            let categoryData;
            
            // Verificar si es un slug de la API (como 'dresses', 'pants')
            if (categoryCodeMapping[categorySlug]) {
              // Crear una categoría virtual para slugs de la API
              categoryData = {
                id: categorySlug,
                name: categoryNameMapping[categorySlug] || categorySlug,
                slug: categorySlug,
                code: categoryCodeMapping[categorySlug],
                description: `Productos de la categoría ${categoryNameMapping[categorySlug] || categorySlug}`
              };
            } else {
              // Intentar obtener la categoría de la base de datos
              const categoryResponse = await publicCategoryService.getBySlug(categorySlug);
              
              if (categoryResponse.data.success && categoryResponse.data.category) {
                categoryData = categoryResponse.data.category;
              }
            }
            
            if (categoryData) {
              setCurrentCategory(categoryData);
              
              // Obtener productos locales de la base de datos
              if (categoryData.id) {
                try {
                  // Llamar al nuevo endpoint que obtiene productos locales por categoría
                  const localProductsResponse = await api.get(`/categories/${categoryData.id}/local-products`);
                  
                  if (localProductsResponse.data.success && localProductsResponse.data.data.products) {
                    const localProducts = localProductsResponse.data.data.products;
                    
                    // Mapear productos locales al formato esperado
                    const allLocalProducts = localProducts.map(product => {
                    // Extraer precio y convertirlo a número
                    const rawPrice = product.precio1;
                    const numericPrice = typeof rawPrice === 'string' ? parseFloat(rawPrice.replace(/[^\d.-]/g, '')) : parseFloat(rawPrice) || 0;
                    
                    // Extraer colores si existen - usar detalles como en ProductPage
                    const productColors = product.detalles ? 
                      [...new Set(product.detalles.map(d => d.nombreColor).filter(Boolean))] : 
                      [];
                    const availableColors = productColors.length > 0 ? productColors : ['black']; // Color por defecto
                    
                    // Extraer tallas si existen - usar detalles como en ProductPage
                    const productSizes = product.detalles ? 
                      [...new Set(product.detalles.map(d => d.detalle).filter(Boolean))] : 
                      [];
                    const availableSizes = productSizes.length > 0 ? productSizes : ['M']; // Talla por defecto
                    
                    const isNewProduct = isProductNewLikeNuevosPage(product);
                    // Filtro principal unificado (Próximamente / Nuevo / Agotado / En Rebaja)
                    const statusEval = evaluateProductStatus(product);

                    // Calcular descuento si existe
                    const hasDiscount = product.opc_promo === 'S' && product.desc_promo > 0;
                    const discountPercentage = hasDiscount ? product.desc_promo : 0;
                    const originalPrice = hasDiscount ? (numericPrice / (1 - discountPercentage / 100)) : numericPrice;

                    return {
                      id: product.id_articulo,
                      title: product.descripcion || 'Sin nombre',
                      description: product.descripcion || 'Sin descripción',
                      price: numericPrice,
                      originalPrice: originalPrice,
                      discount: discountPercentage,
                      image: getProductImageUrl(product.id_articulo),
                      brand: product.marca || 'Sin marca',
                      category: categoryData.name,
                      stock: product.inventario || 0,
                      inventario: product.inventario || 0,
                      colors: availableColors,
                      colores: productColors,
                      sizes: availableSizes,
                      tallas: productSizes,
                      isNew: statusEval.is_new,
                      isInStock: statusEval.is_in_stock,
                      isOutOfStock: statusEval.is_out_of_stock,
                      isComingSoon: statusEval.is_coming_soon,
                      isOnSale: statusEval.is_on_sale,
                      status: statusEval.status,
                      rating: 0, // Se actualizará con la consulta a la BD
                      ratingCount: 0,
                      linea: product.linea,
                      fechaAlta: product.fecha_alta,
                      fecha_alta: product.fecha_alta,
                      fechaCompra: product.fecha_compra,
                      fecha_compra: product.fecha_compra,
                      detalles: product.detalles,
                      fechaAct: product.fechaAct,
                      temporada: product.temporada,
                      opcNuevo: product.opc_nuevo,
                      opcPromo: product.opc_promo,
                      descPromo: product.desc_promo,
                      genero: product.genero,
                      sector: product.sector
                    };
                  });
                  
                  productsData = [...allLocalProducts];
                  
                  // Obtener calificaciones reales de la base de datos
                  if (allLocalProducts.length > 0) {
                    try {
                      const productIds = allLocalProducts.map(product => product.id);
                      
                      const ratingsResponse = await api.post('/products/ratings', {
                        product_ids: productIds
                      });
                      
                      if (ratingsResponse.data.success) {
                        const ratings = ratingsResponse.data.data.ratings;
                        
                        // Actualizar productos con calificaciones reales
                        productsData = allLocalProducts.map(product => {
                          const localRating = ratings[product.id];
                          return {
                            ...product,
                            rating: localRating?.average || 0,
                            ratingCount: localRating?.count || 0
                          };
                        });
                      }
                    } catch (error) {
                      // Continuar con productos sin calificaciones
                    }
                  }
                  } else {
                    productsData = [];
                  }
                } catch (error) {
                  productsData = [];
                }
              } else {
                productsData = [];
              }
            } else {
              productsData = [];
            }
          } catch (error) {
            productsData = [];
          }
        } else {
          // Cargar productos desde el backend local
          try {
            const searchResponse = await api.get('/products/search', {
              params: { q: '' }
            });

            if (searchResponse.data.success && searchResponse.data.data.products) {
              const localProducts = searchResponse.data.data.products;
              
              // Mapear productos
              productsData = localProducts.map(product => {
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
                
                const isNewProduct = isProductNewLikeNuevosPage(product);
                // Filtro principal unificado (Próximamente / Nuevo / Agotado / En Rebaja)
                const statusEval = evaluateProductStatus(product);

                let finalPrice = product.price;
                let originalPrice = product.originalPrice;
                let discountPercentage = product.discount;

                if (finalPrice === undefined || finalPrice === null || finalPrice === 0) {
                  const hasDiscount = product.opc_promo === 'S' && product.desc_promo > 0;
                  const originalDiscountPercentage = hasDiscount ? parseFloat(product.desc_promo) : 0;
                  discountPercentage = hasDiscount ? getEffectiveDescPromoPercent(originalDiscountPercentage, user) : 0;
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
                  category: product.linea || '',
                  stock: product.inventario || 0,
                  inventario: product.inventario || 0,
                  colors: productColors.length > 0 ? productColors : ['black'],
                  sizes: productSizes.length > 0 ? productSizes : ['M'],
                  isNew: statusEval.is_new,
                  isInStock: statusEval.is_in_stock,
                  isOutOfStock: statusEval.is_out_of_stock,
                  isComingSoon: statusEval.is_coming_soon,
                  isOnSale: statusEval.is_on_sale,
                  status: statusEval.status,
                  rating: product.rating || 0,
                  ratingCount: product.ratingCount || 0,
                  linea: { id_linea: product.id_linea },
                  id_linea: product.id_linea,
                  catalogoId: product.catalogoId,
                  fechaAlta: product.fecha_alta,
                  fecha_alta: product.fecha_alta,
                  fechaCompra: product.fecha_compra,
                  fecha_compra: product.fecha_compra,
                  stock_received_count: product.stock_received_count || 0,
                  stockReceivedCount: product.stock_received_count || 0,
                  detalles: product.detalles
                };
              });
              
              // Filtrar por categoría si se especifica
              if (category !== 'all') {
                productsData = productsData.filter(p => {
                  const productTitle = p.title?.toLowerCase() || '';
                  return productTitle.includes(category.toLowerCase());
                });
              }
              
              // Aplicar ofertas de usuario
              productsData = await applyUserOffersToProducts(productsData);
          } else {
              productsData = [];
            }
          } catch (error) {
            productsData = [];
          }
        }
        
        // Filtrar productos nulos
        const validProducts = productsData.filter(p => p !== null);
        const shuffledProducts = shuffleArray(validProducts); // 🎲 Orden aleatorio
        
        setAllProducts(shuffledProducts);
        setFilteredProducts(shuffledProducts);
        

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
      
      if (hasUserSorted.current) {
        filtered = sortProducts(filtered, sortBy);
      }
      setFilteredProducts(filtered);
    }
  }, [filters.category, filters.department, filters.sector, filters.sizes, filters.colors, filters.priceRange, sortBy, allProducts, colorFilter, dtuFilter]);

  // Handle filter modal
  const toggleFilterModal = () => {
    setIsFilterModalOpen(!isFilterModalOpen);
  };

  // Handle sort change
  const handleSortChange = (e) => {
    hasUserSorted.current = true;
    setSortBy(e.target.value);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    try {
      sessionStorage.setItem('categoryPageFilters', JSON.stringify(newFilters));
    } catch (e) {
    }
  };

  // Handle clear filters
  const handleClearFilters = () => {
    const defaultFilters = {
      catalog: catalogs.length > 0 ? catalogs[0].name : 'Cherry 2025 - 2026',
      availability: 'todos',
      category: '',
      department: 'Todos los departamentos',
      sector: 'Todos los sectores',
      sizes: [],
      colors: [],
      priceRange: { min: 0, max: 0 }
    };
    setFilters(defaultFilters);
    try {
      sessionStorage.removeItem('categoryPageFilters');
    } catch (e) {
    }
  };

  // Handle favorite toggle
  const handleFavoriteToggle = (productId) => {
    // Implement favorite functionality here
  };

  const totalResults = filteredProducts.length;

  // Infinite scroll
  const infiniteScroll = useInfiniteScroll(filteredProducts, 20);

  // Reset infinite scroll cuando cambian los productos filtrados
  useEffect(() => {
    infiniteScroll.reset();
  }, [filteredProducts.length]);

  const location = useLocation();
  const canonicalUrl = `https://cherrydistribuidores.com.mx${location.pathname}`;

  return (
    <>
      <Helmet>
        <title>{currentCategory ? `${currentCategory.name} - Cherry` : 'Categoría de productos - Cherry'}</title>
        <meta name="description" content={currentCategory ? `Explora nuestra categoría ${currentCategory.name}. Encuentra las últimas tendencias en moda y accesorios.` : 'Explora nuestro catálogo completo de productos Cherry. Encuentra las últimas tendencias en moda y accesorios.'} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      <div className="nuevos-page">
        <div className="container">
          {/* Header section with title and filters - MOBILE */}
          <div className="nuevos-page__header-mobile">
            <div className="nuevos-page__title-section">
              <h1 className="nuevos-page__title">
                {currentCategory ? currentCategory.name : 'Categoría de productos'}
              </h1>
              <div className="nuevos-page__content-texts">
                <span className="nuevos-page__results-count">
                  ({totalResults})
                  <p className="nuevos-page__text-results-count">Resultados</p>
                </span>
              </div>
            </div>

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
                  value={sortBy}
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

          {/* Header section with title and filters - DESKTOP */}
          <div className="nuevos-page__header-desktop">
            <div className="nuevos-page__title-section">
              <h1 className="nuevos-page__title">
                {currentCategory ? currentCategory.name : 'Categoría de productos'}
              </h1>
              <div className="nuevos-page__content-texts">
                <span className="nuevos-page__results-count">
                  ({totalResults})
                  <p className="nuevos-page__text-results-count">Resultados</p>
                </span>
              </div>
            </div>

            <div className="nuevos-page__controls">
              <div className="nuevos-page__sort-section">
                <label htmlFor="sort-select-desktop" className="nuevos-page__sort-label">Ordenar por:</label>
                <select
                  id="sort-select-desktop"
                  value={sortBy}
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

          {/* Main content */}
          <div className="nuevos-page__content">
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
                hideCatalogSelector={!!categorySlug}
              />
            </aside>

            {/* Resultados */}
            <main className="nuevos-page__products-section">
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
                  <div className={`nuevos-page__products-grid ${filteredProducts.length === 1 ? 'single-result' : ''}`}>
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
            </main>
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
