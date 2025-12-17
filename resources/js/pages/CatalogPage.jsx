import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import CatalogFilter from '../components/CatalogFilter/CatalogFilter';
import CatalogProductCard from '../components/CatalogProductCard/CatalogProductCard';
import InfiniteScrollLoader from '../components/InfiniteScrollLoader/InfiniteScrollLoader';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import { getIconPath } from '../utils/assetPaths';
import CustomButton from '../components/CustomButton';
import './CatalogPage.css';
import api from '../services/api';
import { applyUserOffersToProducts } from '../api/userOffers';
import { catalogService, publicCatalogService } from '../services/api';
import { getProductImageUrl } from '../utils/productImageUtils';
import { shareCatalogPdf } from '../utils/shareProductUtils';

// Función para mezclar array de forma aleatoria (Fisher-Yates shuffle)
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const CatalogPage = ({ catalogId }) => {

  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') || 'all';
  const colorFilter = searchParams.get('color') || '';
  const dtuFilter = searchParams.get('dtu') || '';

  // Recuperar filtros guardados de sessionStorage
  const getSavedFilters = () => {
    try {
      // Usar una key diferente por cada catalogId para mantener filtros separados
      const storageKey = catalogId ? `catalogPageFilters_${catalogId}` : 'catalogPageFilters';
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error recuperando filtros:', e);
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

  // State management for filters and products
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('más recientes');
  const [allProducts, setAllProducts] = useState([]); // Store all products
  const [filteredProducts, setFilteredProducts] = useState([]); // Store filtered products
  const [loading, setLoading] = useState(true);
  const [catalogs, setCatalogs] = useState([]); // Store all available catalogs
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [currentCatalog, setCurrentCatalog] = useState(null); // Store current catalog info
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [filters, setFilters] = useState(getSavedFilters);
  const [hasImageGroups, setHasImageGroups] = useState(false);
  const [checkingImageGroups, setCheckingImageGroups] = useState(false);
  const [hasCatalogPdf, setHasCatalogPdf] = useState(false);
  const [catalogPdfInfo, setCatalogPdfInfo] = useState(null);

  // Cargar colores y tallas disponibles desde productos cargados
  useEffect(() => {
    const extractFiltersFromProducts = () => {
      try {
        // Extraer colores únicos de los productos cargados
        const colorSet = new Set();
        const sizeSet = new Set();
        allProducts.forEach(product => {
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

        setAvailableColors(Array.from(colorSet).sort());
        setAvailableSizes(sortedSizes);
      } catch (error) {
        setAvailableColors([]);
        setAvailableSizes([]);
      }
    };

    // Solo extraer filtros si hay productos cargados
    if (allProducts.length > 0) {
      extractFiltersFromProducts();
    }
  }, [allProducts]);

  // Function to filter products based on current filters - Memoized
  const filterProducts = useCallback((products, currentFilters) => {

    if (!products || products.length === 0) {
      return [];
    }

    let filtered = [...products];


    // Filter by category (soporta selección múltiple)
    const selectedCategories = Array.isArray(currentFilters.categories) && currentFilters.categories.length > 0
      ? currentFilters.categories.filter(cat => cat !== 'todos') // Excluir la opción "todos"
      : (currentFilters.category && currentFilters.category !== '' ? (Array.isArray(currentFilters.category) ? currentFilters.category.filter(cat => cat !== 'todos') : [String(currentFilters.category)]) : []);
    
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(product => {
        const productLineaId = String(product.id_linea || product.linea?.id_linea || product.category_id || '');
        return selectedCategories.some(categoryCode => String(categoryCode) === productLineaId);
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
      const beforePrice = filtered.length;
      filtered = filtered.filter(product => {
        const price = product.price || 0;
        const minPrice = currentFilters.priceRange.min || 0;
        const maxPrice = currentFilters.priceRange.max || 0;

        let passes = false;
        if (maxPrice > 0) {
          passes = price >= minPrice && price <= maxPrice;
        } else {
          passes = price >= minPrice;
        }

        if (!passes) {
        }

        return passes;
      });;
    }

    // Filter by availability
    if (currentFilters.availability === 'con-existencia') {
      filtered = filtered.filter(product => product.stock > 0);
    } else if (currentFilters.availability === 'sin-existencia') {
      filtered = filtered.filter(product => product.stock === 0);
    }

    // Filter by colors
    if (currentFilters.colors && currentFilters.colors.length > 0) {
      const beforeColors = filtered.length;
      filtered = filtered.filter(product => {
        if (!product.colors || product.colors.length === 0) {
          return false;
        }

        const matches = currentFilters.colors.some(filterColor => {
          const filterColorLower = filterColor.toLowerCase();
          return product.colors.some(productColor => {
            const productColorLower = productColor.toLowerCase();
            const match = productColorLower === filterColorLower ||
              productColorLower.includes(filterColorLower) ||
              filterColorLower.includes(productColorLower);
            if (match) {
            }
            return match;
          });
        });

        if (!matches) {
        }

        return matches;
      });;
    }

    // Filter by sizes - EXACT MATCH ONLY (restrictive)
    if (currentFilters.sizes && currentFilters.sizes.length > 0) {
      const beforeSizes = filtered.length;
      filtered = filtered.filter(product => {
        if (!product.sizes || product.sizes.length === 0) {
          return false;
        }

        // Use exact match only - no includes() to avoid "4" matching "14"
        const matches = currentFilters.sizes.some(filterSize => {
          const filterSizeLower = filterSize.toLowerCase().trim();
          return product.sizes.some(productSize => {
            const productSizeLower = productSize.toString().toLowerCase().trim();
            // Exact match only - no partial matching
            return productSizeLower === filterSizeLower;
          });
        });

        return matches;
      });
    }

    return filtered;
  }, []);

  // Function to sort products - Memoized
  const sortProducts = useCallback((products, sortOption) => {
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
  }, []);

  // Load catalogs
  useEffect(() => {
    const loadCatalogs = async () => {
      // Si tenemos catalogId, no necesitamos cargar todos los catálogos
      if (catalogId) {
        setCatalogLoading(false);
        return;
      }

      setCatalogLoading(true);
      try {
        const response = await catalogService.getAll();
        if (response.data.success) {
          const availableCatalogs = response.data.data.catalogs.filter(catalog => catalog.status === 'active');
          setCatalogs(availableCatalogs);

          if (availableCatalogs.length > 0) {
            // Usar el primer catálogo disponible
            setFilters(prev => ({
              ...prev,
              catalog: availableCatalogs[0].name
            }));
          }
        }
      } catch (error) {
        setCatalogs([]);
      } finally {
        setCatalogLoading(false);
      }
    };

    loadCatalogs();
  }, [catalogId]);

  // Load products based on category, catalog and availability
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        let productsData;

        // Si se proporciona catalogId, cargar productos de ese catálogo específico
        if (catalogId) {
          try {
            // Cargar información del catálogo
            const catalogResponse = await publicCatalogService.getById(catalogId);
            if (catalogResponse.data.success) {
              const catalog = catalogResponse.data.data;
              setCurrentCatalog(catalog);
              
              // Verificar si el catálogo tiene PDF directamente
              if (catalog.pdf_path && catalog.pdf_name) {
                setHasCatalogPdf(true);
                setCatalogPdfInfo({
                  pdf_path: catalog.pdf_path,
                  pdf_name: catalog.pdf_name,
                  pdf_url: catalog.pdf_path.startsWith('http') 
                    ? catalog.pdf_path 
                    : `${window.location.origin}/${catalog.pdf_path}`
                });
              } else {
                setHasCatalogPdf(false);
                setCatalogPdfInfo(null);
              }
              
              // Verificar si el catálogo tiene grupos de imágenes activos
              try {
                setCheckingImageGroups(true);
                const groupsResponse = await publicCatalogService.getCatalogImageGroups(catalogId);
                if (groupsResponse.data.success) {
                  const groups = groupsResponse.data.data.image_groups || [];
                  // El endpoint ya filtra solo grupos activos, pero verificamos que haya grupos y que tengan imágenes
                  const groupsWithImages = groups.filter(group => (group.images_count || 0) > 0);
                  setHasImageGroups(groupsWithImages.length > 0);
                } else {
                  setHasImageGroups(false);
                }
              } catch (error) {
                console.error('Error al verificar grupos de imágenes:', error);
                setHasImageGroups(false);
              } finally {
                setCheckingImageGroups(false);
              }
            }

            // Cargar productos del catálogo desde la base de datos local
            // El backend ahora busca productos por catalogoId en la tabla productos
            let localProducts = [];
            try {
              const localResponse = await publicCatalogService.getProducts(catalogId);
              if (localResponse.data.success && localResponse.data.data.products) {
                const backendProducts = localResponse.data.data.products;
                
                // Mapear productos del backend al formato esperado (igual que BuscarPage)
                localProducts = backendProducts.map(product => {
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
                  let finalPrice = product.price;
                  let originalPrice = product.originalPrice;
                  let discountPercentage = product.discount;
                  
                  // Si el backend no envió estos valores, calcularlos aquí como fallback
                  if (finalPrice === undefined || finalPrice === null || finalPrice === 0) {
                    const hasDiscount = product.opc_promo === 'S' && product.desc_promo > 0;
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
                    price: finalPrice, // Usar precio final del backend (con descuento aplicado)
                    originalPrice: originalPrice, // Usar precio original del backend
                    discount: discountPercentage, // Usar descuento reducido del backend
                    image: product.image || getProductImageUrl(product.id_articulo || product.id), // Usar imagen del backend (S3)
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
                    catalogoId: product.catalogoId, // Para filtro de catálogo
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
              }
            } catch (error) {
              console.error('Error loading catalog products:', error);
            }

            // Usar solo productos locales del backend
            productsData = localProducts;
          } catch (error) {
            console.error('Error loading catalog:', error);
            productsData = [];
          }
        } else {
          // Cargar productos desde el backend (similar a BuscarPage)
          let allProductsFromBackend = [];
          try {
            const searchResponse = await api.get('/products/search', {
              params: { q: '' }
            });
            if (searchResponse.data.success && searchResponse.data.data.products) {
              const localProducts = searchResponse.data.data.products;
              allProductsFromBackend = localProducts.map(product => {
                const rawPrice = product.precio1;
                const numericPrice = typeof rawPrice === 'string' ? parseFloat(rawPrice.replace(/[^\d.-]/g, '')) : parseFloat(rawPrice) || 0;

                const productColors = product.detalles ? 
                  [...new Set(product.detalles.map(d => d.nombreColor).filter(Boolean))] : 
                  [];
                const availableColors = productColors.length > 0 ? productColors : ['black'];

                const productSizes = product.detalles ? 
                  [...new Set(product.detalles.map(d => d.detalle).filter(Boolean))] : 
                  [];
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
                  originalPrice = hasDiscount && numericPrice > 0 ? numericPrice : null;
                  finalPrice = hasDiscount && discountPercentage > 0 && numericPrice > 0 
                    ? (numericPrice - (numericPrice * (discountPercentage / 100))) 
                    : numericPrice;
                }

                discountPercentage = discountPercentage !== undefined && discountPercentage !== null ? parseFloat(discountPercentage) : 0;

                return {
                  id: product.id_articulo || product.id,
                  title: product.descripcion || product.title || 'Sin nombre',
                  description: product.descripcion || 'Sin descripción',
                  price: finalPrice,
                  originalPrice: originalPrice,
                  discount: discountPercentage,
                  image: product.image || getProductImageUrl(product.id_articulo || product.id),
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
            }
          } catch (error) {
            allProductsFromBackend = [];
          }
          productsData = allProductsFromBackend;
        }

        // Filtrar productos nulos
        const validProducts = productsData.filter(p => p !== null);

        // Aplicar ofertas de usuario a todos los productos
        const productsWithOffers = await applyUserOffersToProducts(validProducts);
        const shuffledProducts = shuffleArray(productsWithOffers); // 🎲 Orden aleatorio

        setAllProducts(shuffledProducts);
        setFilteredProducts(shuffledProducts);
      } catch (error) {
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [category, filters.catalog, catalogId]);

  // Memoized filtered and sorted products
  const processedProducts = useMemo(() => {

    if (allProducts.length === 0) {
      return [];
    }

    ;

    let filtered = filterProducts(allProducts, filters);;

    // Apply color filter from URL
    if (colorFilter) {
      const colorFilters = colorFilter.split(',').map(c => c.trim());;
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
      });;
    }

    // Apply DTU filter from URL
    if (dtuFilter) {
      const dtuFilters = dtuFilter.split(',').map(d => d.trim());;
      filtered = filtered.filter(product => {
        return dtuFilters.some(filterDtu => {
          const filterDtuLower = filterDtu.toLowerCase();
          return (
            (product.dtu && product.dtu.toLowerCase().includes(filterDtuLower)) ||
            (product.DTU && product.DTU.toLowerCase().includes(filterDtuLower))
          );
        });
      });;
    }

    const sorted = sortProducts(filtered, sortBy);;

    return sorted;
  }, [allProducts, filters, colorFilter, dtuFilter, sortBy, filterProducts, sortProducts]);

  // Update filtered products when processed products change
  useEffect(() => {
    setFilteredProducts(processedProducts);
  }, [processedProducts]);

  // Handle filter modal - Memoized
  const toggleFilterModal = useCallback(() => {
    setIsFilterModalOpen(prev => !prev);
  }, []);

  // Handle sort change - Memoized
  const handleSortChange = useCallback((e) => {
    setSortBy(e.target.value);
  }, []);

  // Handle filter changes - Memoized
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    try {
      const storageKey = catalogId ? `catalogPageFilters_${catalogId}` : 'catalogPageFilters';
      sessionStorage.setItem(storageKey, JSON.stringify(newFilters));
    } catch (e) {
      console.error('Error guardando filtros:', e);
    }
  }, [catalogId]);

  // Handle clear filters - Memoized
  const handleClearFilters = useCallback(() => {
    const defaultFilters = {
      catalog: catalogs.length > 0 ? catalogs[0].name : 'Cherry 2025 - 2026',
      catalogs: [], // Array para selección múltiple
      availability: 'todos',
      category: '',
      categories: [], // Array para selección múltiple
      department: 'Todos los departamentos',
      sector: 'Todos los sectores',
      sizes: [],
      colors: [],
      priceRange: { min: 0, max: 0 }
    };
    setFilters(defaultFilters);
    try {
      const storageKey = catalogId ? `catalogPageFilters_${catalogId}` : 'catalogPageFilters';
      sessionStorage.removeItem(storageKey);
    } catch (e) {
      console.error('Error limpiando filtros:', e);
    }
  }, [catalogs, catalogId]);

  // Handle favorite toggle - Memoized
  const handleFavoriteToggle = useCallback((productId) => {
    // Implement favorite functionality here
  }, []);

  // Handle share functionality - Memoized
  const handleShareCatalog = useCallback(async () => {
    // Solo compartir si hay PDF del catálogo
    if (!catalogPdfInfo || !catalogPdfInfo.pdf_url) {
      if (window.showToast) {
        window.showToast('No hay PDF disponible para compartir', 'error');
      }
      return;
    }

    try {
      await shareCatalogPdf({
        pdf_url: catalogPdfInfo.pdf_url,
        pdf_name: catalogPdfInfo.pdf_name,
        catalogName: currentCatalog?.name || 'Catálogo Cherry'
      });
    } catch (error) {
      console.error('Error al compartir catálogo:', error);
      if (window.showToast) {
        window.showToast('Error al compartir el catálogo', 'error');
      }
    }
  }, [catalogPdfInfo, currentCatalog]);

  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      if (window.showToast) {
        window.showToast('Enlace del catálogo copiado al portapapeles', 'success');
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
        window.showToast('Enlace del catálogo copiado al portapapeles', 'success');
      }
    }
  }, []);

  const totalResults = filteredProducts.length;

  // Infinite scroll
  const infiniteScroll = useInfiniteScroll(filteredProducts, 20);

  // Reset infinite scroll cuando cambian los productos filtrados
  useEffect(() => {
    infiniteScroll.reset();
  }, [filteredProducts.length]);

  return (
    <>
      <Helmet>
        <title>Catálogo de productos - Cherry</title>
        <meta name="description" content="Explora nuestro catálogo completo de productos Cherry. Encuentra las últimas tendencias en moda y accesorios." />
      </Helmet>

      <div className="catalog-page">
        <div className="container">
          {/* Header section with title and filters  -  MOBILE */}
          <div className="catalog-page__header-mobile">
            <div className="catalog-page__mobile-filter-controls">
              <button
                className="catalog-page__mobile-filter-btn"
                onClick={toggleFilterModal}
              >
                <img src={getIconPath('Filter.svg')} alt="Filtros" />
                <img src={getIconPath('Chevron Down.svg')} alt="Expandir" />
              </button>
            </div>
            <div className="catalog-page__header-row">
              <div className="catalog-page__title-section">
                <h1 className="catalog-page__title">
                  {currentCatalog ? currentCatalog.name : 'Catálogo de productos'}
                </h1>
                <div className='catalog-page__content-texts'>
                  <span className="catalog-page__results-count">
                    ({totalResults})
                    <p className="catalog-page__text-results-count">Resultados</p>
                  </span>
                </div>
              </div>
              <div className="catalog-page__pdf-button-wrapper">
                {catalogId && currentCatalog?.is_active && hasCatalogPdf && !checkingImageGroups && (
                  <button
                    type="button"
                    className="custom-btn custom-btn--outlined custom-btn--medium filters-btn"
                    onClick={() => window.location.href = `/catalogo-pdf?id=${catalogId}`}
                  >
                    <span className="custom-btn__content">Ver catálogo PDF</span>
                  </button>
                )}
              </div>
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
              {catalogId && currentCatalog?.is_active && hasCatalogPdf && !checkingImageGroups && (
                <div className="catalog-page__share-button-wrapper">
                  <CustomButton
                    variant="filled"
                    size="medium"
                    onClick={handleShareCatalog}
                  >
                    <span className="catalog-page__whatsapp-text">Compartir a clientes</span>
                  </CustomButton>
                </div>
              )}
            </div>
          </div>

          {/* Header section with title and filters  -  DESKTOP */}
          <div className="catalog-page__header-desktop">
            <div className="catalog-page__header-row">
              <div className="catalog-page__title-section">
                <h1 className="catalog-page__title">
                  {currentCatalog ? currentCatalog.name : 'Catálogo de productos'}
                </h1>
                <div className='catalog-page__content-texts'>
                  <span className="catalog-page__results-count">
                    ({totalResults})
                    <p className="catalog-page__text-results-count">Resultados</p>
                  </span>
                </div>
              </div>
              <div className="catalog-page__pdf-button-wrapper">
                {catalogId && currentCatalog?.is_active && hasCatalogPdf && !checkingImageGroups && (
                  <button
                    type="button"
                    className="custom-btn custom-btn--outlined custom-btn--medium filters-btn"
                    onClick={() => window.location.href = `/catalogo-pdf?id=${catalogId}`}
                  >
                    <span className="custom-btn__content">Ver catálogo PDF</span>
                  </button>
                )}
              </div>
              <div className="catalog-page__sort-section">
                <label htmlFor="sort-select-desktop" className="catalog-page__sort-label">Ordenar por:</label>
                <select
                  id="sort-select-desktop"
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
              {catalogId && currentCatalog?.is_active && hasCatalogPdf && !checkingImageGroups && (
                <div className="catalog-page__share-button-wrapper">
                  <CustomButton
                    variant="filled"
                    size="medium"
                    onClick={handleShareCatalog}
                  >
                    <span className="catalog-page__whatsapp-text">Compartir a clientes</span>
                  </CustomButton>
                </div>
              )}
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
                availableColors={availableColors}
                availableSizes={availableSizes}
                catalogs={catalogs}
                catalogLoading={catalogLoading}
                hideCatalogSelector={!!catalogId}
              />
            </aside>

            {/* Products grid */}
            <main className="catalog-page__products-section">
              {loading ? (
                <div className="catalog-page__loading">
                  <div className="catalog-page__loading-spinner"></div>
                  <p>Cargando productos...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="catalog-page__no-results">
                  <h3>No se encontraron productos</h3>
                  <p>Intenta ajustar los filtros de búsqueda</p>
                </div>
              ) : (
                <>
                  <div className="catalog-page__products-grid">
                    {infiniteScroll.displayedItems.map((product) => (
                      <CatalogProductCard
                        key={product.id}
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
            <div className="catalog-page__filter-modal-overlay" onClick={toggleFilterModal}>
              <div className="catalog-page__filter-modal" onClick={(e) => e.stopPropagation()}>
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
                  hideCatalogSelector={!!catalogId}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CatalogPage; 
