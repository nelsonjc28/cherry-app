import axios from 'axios';

const CHERRY_API_URL = 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/';

// Cache para productos
const productCache = new Map();

// Cache for products to avoid multiple API calls
let productsCache = null;

// Función de prueba para verificar la API
export const testApiConnection = async () => {
  try {
    const response = await axios.get(CHERRY_API_URL);
    const data = response.data;
    
    return {
      success: true,
      data: data,
      isArray: Array.isArray(data),
      length: data ? data.length : 0
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

// Función para probar diferentes endpoints
export const testMultipleEndpoints = async () => {
  const endpoints = [
    'https://cherryapi.estrategiadmgs.com.mx/cherryApi/',
    'https://cherryapi.estrategiadmgs.com.mx/cherryApi/products',
    'https://cherryapi.estrategiadmgs.com.mx/cherryApi/items',
    'https://cherryapi.estrategiadmgs.com.mx/cherryApi/data',
    'https://cherryapi.estrategiadmgs.com.mx/cherryApi/catalog'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint);
      const data = response.data;
        
      if (data && (Array.isArray(data) || (typeof data === 'object' && Object.keys(data).length > 0))) {
        return {
          success: true,
          endpoint: endpoint,
          data: data
        };
      }
    } catch (error) {
      // Error silencioso, continuar con el siguiente endpoint
    }
  }
  
  return {
    success: false,
    error: 'Ningún endpoint funcionó'
  };
};

// Función para generar URL de imagen S3
export const generateS3ImageUrl = (id_articulo) => {
  return `https://cherry-fotos.s3.amazonaws.com/shopify/${id_articulo}/${id_articulo}_1.jpg`;
};

// Función para generar múltiples URLs de imagen S3 para un producto
export const generateS3ImageUrls = (id_articulo, count = 4) => {
  const urls = [];
  for (let i = 1; i <= count; i++) {
    urls.push(`https://cherry-fotos.s3.amazonaws.com/shopify/${id_articulo}/${id_articulo}_${i}.jpg`);
  }
  return urls;
};

// Mapeo de catálogos a parámetros de la API
const CATALOG_MAPPING = {
  'Cherry 2025 - 2026': { season: '2025-2026', active: true },
  'Cherry 2024 - 2025': { season: '2024-2025', active: true },
  'Cherry 2023 - 2024': { season: '2023-2024', active: false }
};

// Función para obtener todos los productos
export const getAllProducts = async (catalog = 'Cherry 2025 - 2026') => {
  try {
    const response = await axios.get(CHERRY_API_URL);
    
    
    const products = response.data;
    
    // Verificar si products es válido
    if (!products) {
      return [];
    }
    
    // Si no es un array, intentar convertirlo
    let productsArray = products;
    if (!Array.isArray(products)) {
      // Si es un objeto, buscar una propiedad que contenga los productos
      if (typeof products === 'object') {
        const possibleKeys = ['products', 'data', 'items', 'result', 'content'];
        for (const key of possibleKeys) {
          if (products[key] && Array.isArray(products[key])) {
            productsArray = products[key];
            break;
          }
        }
        
        // Si no se encontró, intentar usar el objeto completo como array
        if (!Array.isArray(productsArray)) {
          productsArray = [products];
        }
      } else {
        return [];
      }
    }
    
    // Filtrar productos por catálogo si es necesario
    if (catalog && catalog !== 'Cherry 2025 - 2026') {
      const catalogConfig = CATALOG_MAPPING[catalog];
      if (catalogConfig) {
        // Filtrar por temporada o estado activo
        const filteredProducts = productsArray.filter(product => {
          // Simular diferentes productos según el catálogo
          if (catalog === 'Cherry 2024 - 2025') {
            // Para catálogo 2024-2025, mostrar productos con descuentos moderados
            return product.desc_promo > 0 && product.desc_promo <= 30;
          } else if (catalog === 'Cherry 2023 - 2024') {
            // Para catálogo 2023-2024, mostrar productos con grandes descuentos
            return product.desc_promo > 30 || product.opc_promo === 'S';
          }
          return true; // Para catálogo actual, mostrar todos
        });
        
        return filteredProducts;
      }
    }
    
    
    return productsArray;
  } catch (error) {
    console.error('❌ Error en getAllProducts:', error);
    return [];
  }
};

// Función optimizada para obtener productos con ratings
export const getProductsWithRatings = async (catalog = 'Cherry 2025 - 2026') => {
  try {
    // Obtener productos de la API externa
    const rawProducts = await getAllProducts(catalog);
    
    if (!rawProducts || rawProducts.length === 0) {
      return [];
    }
    
    // Extraer IDs de productos para obtener ratings en bulk
    const productIds = rawProducts.map(product => 
      product.id_articulo || product.id || product.codigo
    ).filter(Boolean);
    
    // Obtener ratings en bulk
    const ratingsCache = await getBulkRatings(productIds);
    
    // Mapear productos con ratings
    const mappedProducts = await Promise.all(
      rawProducts.map(product => mapApiProductToAppProduct(product, ratingsCache))
    );
    
    return mappedProducts.filter(p => p !== null);
  } catch (error) {
    return [];
  }
};

// Función para debug - obtener todas las categorías disponibles
export const getAvailableCategories = async () => {
  try {
    const products = await getAllProducts();
    const categories = [...new Set(products.map(p => p.linea?.descripcion).filter(Boolean))];
    const lineIds = [...new Set(products.map(p => p.linea?.id_linea).filter(Boolean))];
    
    // Mostrar mapeo de categorías a IDs
    const categoryToIds = {};
    products.forEach(product => {
      if (product.linea?.descripcion && product.linea?.id_linea) {
        if (!categoryToIds[product.linea.descripcion]) {
          categoryToIds[product.linea.descripcion] = [];
        }
        if (!categoryToIds[product.linea.descripcion].includes(product.linea.id_linea)) {
          categoryToIds[product.linea.descripcion].push(product.linea.id_linea);
        }
      }
    });
    
    return categories;
  } catch (error) {
    return [];
  }
};

// Función para obtener productos por línea/categoría
export const getProductsByLine = async (lineId) => {
  try {
    const products = await getAllProducts();
    return products.filter(product => product.linea?.id_linea === lineId);
  } catch (error) {
    return [];
  }
};

// Función para obtener productos por descripción de línea
export const getProductsByLineDescription = async (lineDescription) => {
  try {
    const products = await getAllProducts();
    return products.filter(product => 
      product.linea?.descripcion?.toLowerCase().includes(lineDescription.toLowerCase())
    );
  } catch (error) {
    return [];
  }
};

// Función para obtener ratings en bulk para múltiples productos
export const getBulkRatings = async (productIds) => {
  try {
    const response = await axios.post('/api/ratings/bulk', {
      product_ids: productIds
    });

    return response.data.ratings || {};
  } catch (error) {
    return {};
  }
};

export const mapApiProductToAppProduct = (apiProduct, ratingsCache = {}) => {
  // Verificar que el producto tenga los campos necesarios
  if (!apiProduct) {
    return null;
  }
  
  // Extraer campos con fallbacks específicos para la API real
  const id = apiProduct.id_articulo || apiProduct.id || apiProduct.codigo || 'unknown';
  const title = apiProduct.descripcion || apiProduct.nombre || apiProduct.title || 'Producto sin nombre';
  
  // Nueva lógica: usar desc_promo como porcentaje de descuento directo sobre precio1
  const originalPrice = apiProduct.precio1 || apiProduct.precio || apiProduct.price || 0;
  const discountPromo = apiProduct.desc_promo || 0; // Solo usar desc_promo real de la API
  const productId = apiProduct.id_articulo || apiProduct.id;
  
  // Calcular precio final aplicando desc_promo como porcentaje de descuento
  let discountPercentage = 0;
  let finalPrice = originalPrice;
  
  // Solo aplicar descuento si desc_promo > 0
  if (discountPromo > 0 && originalPrice > 0) {
    discountPercentage = Math.round(discountPromo);
    finalPrice = originalPrice - (originalPrice * (discountPromo / 100));
    console.log(`✅ DESCUENTO - Producto ${id}: ${discountPercentage}% | ${originalPrice} → ${finalPrice}`);
  } else {
    console.log(`ℹ️ SIN DESCUENTO - Producto ${id}: desc_promo=${discountPromo}`);
  }
  
  // Generar URL de imagen S3 usando el id_articulo
  const image = generateS3ImageUrl(id);
  
  // Obtener colores únicos de los detalles
  let colors = [];
  
  
  if (apiProduct.detalles && Array.isArray(apiProduct.detalles)) {
    colors = [...new Set(apiProduct.detalles.map(d => d.nombreColor).filter(Boolean))];
  } else if (apiProduct.colores && Array.isArray(apiProduct.colores)) {
    colors = apiProduct.colores;
  } else if (apiProduct.colors && Array.isArray(apiProduct.colors)) {
    colors = apiProduct.colors;
  }
  
  // TEMPORAL: Si no hay colores, agregar colores de prueba
  if (!colors || colors.length === 0) {
    colors = ['white', 'black', 'navy'];
  }
  
  // Obtener categoría de la línea
  const category = apiProduct.linea?.descripcion || apiProduct.categoria || apiProduct.category || 'Sin categoría';
  
  // Obtener calificación del cache o usar valores por defecto
  let rating = 5;
  let ratingCount = 0;
  
  if (ratingsCache[id]) {
    rating = ratingsCache[id].average || 5;
    ratingCount = ratingsCache[id].count || 0;
  }
  
  const mappedProduct = {
    id: id,
    title: title,
    image: image,
    price: finalPrice,
    originalPrice: discountPercentage > 0 ? originalPrice : null,
    discount: discountPercentage > 0 ? discountPercentage : null,
    rating: rating,
    ratingCount: ratingCount,
    description: apiProduct.descripcion || apiProduct.descripcion_corta || title,
    brand: apiProduct.marca || apiProduct.brand || 'Cherry',
    category: category,
    colors: colors,
    stock: apiProduct.inventario || apiProduct.stock || 0,
    isActive: apiProduct.activo === 1 || apiProduct.active === true,
    isNew: apiProduct.opc_nuevo === 'S' || apiProduct.is_new === true,
    isPromo: apiProduct.opc_promo === 'S' || apiProduct.is_promo === true,
    codigo: id,
    dtu: apiProduct.DTU || apiProduct.dtu,
    // Campos adicionales para debugging
    precio1: apiProduct.precio1,
    desc_promo: apiProduct.desc_promo
  };
  
  return mappedProduct;
};

// Función para obtener productos destacados
export const getFeaturedProducts = async (limit = 8) => {
  try {
    const products = await getAllProducts();
    const featured = products
      .filter(product => product.activo === 1 && product.inventario > 0)
      .slice(0, limit);
    
    // Mapear productos de forma asíncrona
    const mappedProducts = await Promise.all(featured.map(mapApiProductToAppProduct));
    return mappedProducts.filter(p => p !== null);
  } catch (error) {
    return [];
  }
};

// Función para obtener productos aleatorios
export const getRandomProducts = async (limit = 5) => {
  try {
    // Llamar directamente a la API en lugar de usar getAllProducts para evitar bucles
    const response = await axios.get(CHERRY_API_URL);
    const data = response.data;
    
    // La API devuelve un array directo, no un objeto con clave 'productos'
    let products = [];
    if (Array.isArray(data)) {
      products = data;
    } else if (data && data.productos && Array.isArray(data.productos)) {
      products = data.productos;
    } else {
      return [];
    }
    
    if (products.length === 0) {
      return [];
    }
    
    // Filtrar productos activos (activo: 1) y con stock (inventario > 0)
    const activeProducts = products.filter(product => {
      const isActive = product.activo === 1;
      const hasStock = product.inventario > 0;
      const isWebEnabled = product.opc_web === 'S';
      
      return isActive && hasStock && isWebEnabled;
    });
    
    if (activeProducts.length === 0) {
      // Si no hay productos activos, usar productos con stock
      const productsWithStock = products.filter(product => product.inventario > 0);
      
      if (productsWithStock.length === 0) {
        // Si no hay productos con stock, usar todos
        const shuffled = products.sort(() => 0.5 - Math.random());
        const selectedProducts = shuffled.slice(0, limit);
        
        // Mapear productos de forma asíncrona
        const randomProducts = await Promise.all(selectedProducts.map(mapApiProductToAppProduct));
        return randomProducts.filter(p => p !== null);
      }
      
      // Mezclar productos con stock
      const shuffled = productsWithStock.sort(() => 0.5 - Math.random());
      const selectedProducts = shuffled.slice(0, limit);
      
      // Mapear productos de forma asíncrona
      const randomProducts = await Promise.all(selectedProducts.map(mapApiProductToAppProduct));
      return randomProducts.filter(p => p !== null);
    }
    
    // Mezclar el array de productos para obtener una selección aleatoria
    const shuffled = activeProducts.sort(() => 0.5 - Math.random());
    
    // Tomar solo los primeros 'limit' productos
    const selectedProducts = shuffled.slice(0, limit);
    
    // Mapear productos de forma asíncrona
    const randomProducts = await Promise.all(selectedProducts.map(mapApiProductToAppProduct));
    
    return randomProducts.filter(p => p !== null);
  } catch (error) {
    return [];
  }
};

// Función para obtener productos nuevos
export const getNewProducts = async (limit = 5) => {
  try {
    const response = await axios.get(CHERRY_API_URL);
    const data = response.data;
    
    let products = [];
    if (Array.isArray(data)) {
      products = data;
    } else if (data && data.productos && Array.isArray(data.productos)) {
      products = data.productos;
    } else {
      return [];
    }
    
    if (products.length === 0) {
      return [];
    }
    
    // Filtrar productos activos y con stock
    const activeProducts = products.filter(product => {
      const isActive = product.activo === 1;
      const hasStock = product.inventario > 0;
      const isWebEnabled = product.opc_web === 'S';
      
      return isActive && hasStock && isWebEnabled;
    });
    
    if (activeProducts.length === 0) {
      const productsWithStock = products.filter(product => product.inventario > 0);
      
      if (productsWithStock.length === 0) {
        const shuffled = products.sort(() => 0.5 - Math.random());
        const selectedProducts = shuffled.slice(0, limit);
        
        const newProducts = await Promise.all(selectedProducts.map(mapApiProductToAppProduct));
        return newProducts.filter(p => p !== null);
      }
      
      const shuffled = productsWithStock.sort(() => 0.5 - Math.random());
      const selectedProducts = shuffled.slice(0, limit);
      
      const newProducts = await Promise.all(selectedProducts.map(mapApiProductToAppProduct));
      return newProducts.filter(p => p !== null);
    }
    
    const shuffled = activeProducts.sort(() => 0.5 - Math.random());
    const selectedProducts = shuffled.slice(0, limit);
    
    const newProducts = await Promise.all(selectedProducts.map(mapApiProductToAppProduct));
    
    return newProducts.filter(p => p !== null);
  } catch (error) {
    return [];
  }
};

// Función para obtener productos en promoción
export const getPromoProducts = async (limit = 5) => {
  try {
    const response = await axios.get(CHERRY_API_URL);
    const data = response.data;
    
    let products = [];
    if (Array.isArray(data)) {
      products = data;
    } else if (data && data.productos && Array.isArray(data.productos)) {
      products = data.productos;
    } else {
      return [];
    }
    
    if (products.length === 0) {
      return [];
    }
    
    // Filtrar productos activos y con stock
    const activeProducts = products.filter(product => {
      const isActive = product.activo === 1;
      const hasStock = product.inventario > 0;
      const isWebEnabled = product.opc_web === 'S';
      
      return isActive && hasStock && isWebEnabled;
    });
    
    if (activeProducts.length === 0) {
      const productsWithStock = products.filter(product => product.inventario > 0);
      
      if (productsWithStock.length === 0) {
        const shuffled = products.sort(() => 0.5 - Math.random());
        const selectedProducts = shuffled.slice(0, limit);
        
        const promoProducts = await Promise.all(selectedProducts.map(mapApiProductToAppProduct));
        return promoProducts.filter(p => p !== null);
      }
      
      const shuffled = productsWithStock.sort(() => 0.5 - Math.random());
      const selectedProducts = shuffled.slice(0, limit);
      
      const promoProducts = await Promise.all(selectedProducts.map(mapApiProductToAppProduct));
      return promoProducts.filter(p => p !== null);
    }
    
    const shuffled = activeProducts.sort(() => 0.5 - Math.random());
    const selectedProducts = shuffled.slice(0, limit);
    
    const promoProducts = await Promise.all(selectedProducts.map(mapApiProductToAppProduct));
    
    return promoProducts.filter(p => p !== null);
  } catch (error) {
    return [];
  }
};

// Mapeo de categorías comunes a términos de búsqueda
export const CATEGORY_SEARCH_TERMS = {
  'vestidos': ['vestido', 'dress'],
  'blusas': ['blusa', 'blouse', 'camisa'],
  'pantalones': ['pantalon', 'pants', 'jeans'],
  'sueteres': ['sueter', 'sweater', 'jersey'],
  'jumpsuits': ['jumpsuit', 'mono'],
  'faldas': ['falda', 'skirt'],
  'accesorios': ['accesorio', 'accessory', 'bolsa', 'bag']
};

// Mapeo completo de todas las categorías disponibles - ACTUALIZADO CON DATOS REALES
export const CATEGORY_MAPPING = {
  'vestidos': ['01'], // Vestidos
  'blusas': ['06'], // BLUSA
  'pantalones': ['04', '20'], // PANTALON + PANTS
  'sueteres': ['07'], // SUETER
  'jumpsuits': ['14'], // JUMPSUIT
  'faldas': ['05'], // FALDA
  'conjuntos': ['03'], // Conjuntos
  'abrigos': ['08'], // ABRIGO
  'chalecos': ['09'], // CHALECO
  'chamarras': ['12'], // CHAMARRA
  'gabardinas': ['13'], // GABARDINA
  'sacos': ['11'], // SACO
  'rompers': ['15'], // ROMPER
  'shorts': ['22'], // SHORT
  'calzado': ['17'], // CALZADO
  // Mapeo directo por nombre exacto
  'jumpsuit': ['14'],
  'pantalon': ['04'],
  'blusa': ['06'],
  'chamarra': ['12'],
  'conjuntos': ['03'],
  'romper': ['15'],
  'falda': ['05'],
  'calzado': ['17'],
  'gabardina': ['13'],
  'sueter': ['07'],
  'saco': ['11'],
  'chaleco': ['09'],
  'short': ['22'],
  'abrigo': ['08'],
  'pants': ['20']
};

// Función para obtener productos por categoría
export const getProductsByCategory = async (category, catalog = 'Cherry 2025 - 2026') => {
  try {
    // Obtener todos los productos sin mapear para el filtrado
    const rawProducts = await getAllProducts(catalog);
    
    if (!rawProducts || rawProducts.length === 0) {
      return [];
    }
    
    // Normalizar el nombre de la categoría
    const normalizedCategory = category.toLowerCase().trim();
    
    // Buscar en el mapeo de categorías
    const categoryIds = CATEGORY_MAPPING[normalizedCategory];
    
    let filteredRawProducts = [];
    
    if (categoryIds && categoryIds.length > 0) {
      // Filtrar por IDs de línea
      filteredRawProducts = rawProducts.filter(product => {
        const lineId = product.linea?.id_linea;
        const hasMatchingLineId = categoryIds.some(id => 
          lineId === id || lineId === parseInt(id)
        );
        
        return hasMatchingLineId;
      });
    }
    
    // Si no se encontraron productos por ID, buscar por términos de búsqueda
    if (filteredRawProducts.length === 0) {
      const searchTerms = CATEGORY_SEARCH_TERMS[normalizedCategory] || [normalizedCategory];
      
      filteredRawProducts = rawProducts.filter(product => {
        const productText = `${product.descripcion || ''} ${product.linea?.descripcion || ''}`.toLowerCase();
        
        const hasMatchingTerm = searchTerms.some(term => 
          productText.includes(term.toLowerCase())
        );
        
        return hasMatchingTerm;
      });
    }
    
    // Si aún no se encontraron productos, buscar por coincidencia parcial en el nombre de la categoría
    if (filteredRawProducts.length === 0) {
      filteredRawProducts = rawProducts.filter(product => {
        const productText = `${product.descripcion || ''} ${product.linea?.descripcion || ''}`.toLowerCase();
        return productText.includes(normalizedCategory);
      });
    }
    
    // Mapear los productos filtrados al formato de la app de forma asíncrona
    const mappedProducts = await Promise.all(filteredRawProducts.map(mapApiProductToAppProduct));
    
    return mappedProducts.filter(p => p !== null);
  } catch (error) {
    return [];
  }
};

// Función para obtener todos los productos y mapearlos al formato de la app
export const fetchProducts = async (catalog = 'Cherry 2025 - 2026') => {
  try {
    const products = await getAllProducts(catalog);
    const mappedProducts = await Promise.all(products.map(mapApiProductToAppProduct));
    return mappedProducts.filter(p => p !== null);
  } catch (error) {
    return [];
  }
};

// Función para obtener productos por disponibilidad
export const getProductsByAvailability = async (availability, catalog = 'Cherry 2025 - 2026') => {
  try {
    const response = await axios.get(CHERRY_API_URL);
    const products = response.data;
    
    let filteredProducts = products;
    
    // Filtrar por catálogo primero
    if (catalog && catalog !== 'Cherry 2025 - 2026') {
      const catalogConfig = CATALOG_MAPPING[catalog];
      if (catalogConfig) {
        filteredProducts = products.filter(product => {
          if (catalog === 'Cherry 2024 - 2025') {
            return product.desc_promo > 0 && product.desc_promo <= 30;
          } else if (catalog === 'Cherry 2023 - 2024') {
            return product.desc_promo > 30 || product.opc_promo === 'S';
          }
          return true;
        });
      }
    }
    
    // Filtrar por disponibilidad
    if (availability === 'con-existencia') {
      filteredProducts = filteredProducts.filter(product => product.inventario > 0);
    }
    
    // Mapear productos al formato de la app
    const mappedProducts = await Promise.all(filteredProducts.map(mapApiProductToAppProduct));
    return mappedProducts.filter(p => p !== null);
  } catch (error) {
    return [];
  }
}; 

// Función para búsqueda avanzada de productos
export const searchProductsAdvanced = async (query, filters = {}, catalog = 'Cherry 2025 - 2026') => {
  try {
    const products = await getAllProducts(catalog);
    if (!products || products.length === 0) {
      return [];
    }

    const queryLower = query.toLowerCase().trim();
    const searchTerms = queryLower.split(' ').filter(term => term.length > 0);

    // Filtrar productos que coincidan con la búsqueda
    const filteredProducts = products.filter(product => {
      // Si no hay términos de búsqueda, devolver todos los productos
      if (searchTerms.length === 0) {
        return true;
      }

      // Crear un texto de búsqueda que incluya todos los campos relevantes
      const searchableFields = [
        product.descripcion || '',
        product.marca || '',
        product.linea?.descripcion || '',
        product.sector?.descripcion || '',
        product.genero?.descripcion || '',
        product.DTU || product.dtu || '',
        product.id_articulo?.toString() || '',
        product.sku || '',
        product.ean || '',
        // Incluir colores de los detalles
        ...(product.detalles?.map(d => d.nombreColor) || []),
        // Incluir códigos de color
        ...(product.detalles?.map(d => d.codigoColor) || []),
        // Incluir especificaciones
        product.especificaciones || '',
        // Incluir notas
        product.notas || ''
      ];

      const searchText = searchableFields.join(' ').toLowerCase();

      // Verificar si al menos uno de los términos de búsqueda coincide
      const anyTermMatches = searchTerms.some(term => {
        return searchText.includes(term) || 
               product.descripcion?.toLowerCase().includes(term) ||
               product.marca?.toLowerCase().includes(term) ||
               product.linea?.descripcion?.toLowerCase().includes(term) ||
               product.sector?.descripcion?.toLowerCase().includes(term) ||
               product.genero?.descripcion?.toLowerCase().includes(term) ||
               (product.DTU && product.DTU.toLowerCase().includes(term)) ||
               (product.dtu && product.dtu.toLowerCase().includes(term)) ||
               (product.id_articulo && product.id_articulo.toString().includes(term)) ||
               (product.sku && product.sku.toLowerCase().includes(term)) ||
               (product.ean && product.ean.toLowerCase().includes(term)) ||
               (product.especificaciones && product.especificaciones.toLowerCase().includes(term)) ||
               (product.notas && product.notas.toLowerCase().includes(term)) ||
               // Buscar en colores
               product.detalles?.some(d => 
                 d.nombreColor?.toLowerCase().includes(term) ||
                 d.codigoColor?.toLowerCase().includes(term)
               );
      });

      return anyTermMatches;
    });

    // Aplicar filtros adicionales si se proporcionan
    let finalProducts = filteredProducts;

    // Filtrar por disponibilidad
    if (filters.availability === 'con-existencia') {
      finalProducts = finalProducts.filter(product => product.inventario > 0);
    }

    // Filtrar por categoría
    if (filters.category && filters.category !== 'Todas las categorías') {
      const categoryLower = filters.category.toLowerCase();
      finalProducts = finalProducts.filter(product => {
        const productCategory = product.linea?.descripcion?.toLowerCase() || '';
        const productSector = product.sector?.descripcion?.toLowerCase() || '';
        const productGenero = product.genero?.descripcion?.toLowerCase() || '';
        return productCategory.includes(categoryLower) || 
               productSector.includes(categoryLower) ||
               productGenero.includes(categoryLower) ||
               product.descripcion?.toLowerCase().includes(categoryLower);
      });
    }

    // Filtrar por rango de precio
    if (filters.priceRange && (filters.priceRange.min > 0 || filters.priceRange.max > 0)) {
      finalProducts = finalProducts.filter(product => {
        const price = product.precio1 || 0;
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
      finalProducts = finalProducts.filter(product => {
        const productColors = product.detalles?.map(d => d.nombreColor?.toLowerCase()) || [];
        return filters.colors.some(filterColor => {
          const filterColorLower = filterColor.toLowerCase();
          return productColors.some(productColor => 
            productColor && (
              productColor === filterColorLower || 
              productColor.includes(filterColorLower) ||
              filterColorLower.includes(productColor)
            )
          );
        });
      });
    }

    // Filtrar por código específico
    if (filters.codigo && filters.codigo.trim() !== '') {
      const codigoLower = filters.codigo.trim().toLowerCase();
      finalProducts = finalProducts.filter(product => {
        return (
          (product.id_articulo && product.id_articulo.toString().toLowerCase().includes(codigoLower)) ||
          (product.sku && product.sku.toLowerCase().includes(codigoLower)) ||
          (product.ean && product.ean.toLowerCase().includes(codigoLower)) ||
          (product.descripcion && product.descripcion.toLowerCase().includes(codigoLower))
        );
      });
    }

    // Filtrar por DTU específico
    if (filters.dtu && filters.dtu.trim() !== '') {
      const dtuLower = filters.dtu.trim().toLowerCase();
      finalProducts = finalProducts.filter(product => {
        return (
          (product.DTU && product.DTU.toLowerCase().includes(dtuLower)) ||
          (product.dtu && product.dtu.toLowerCase().includes(dtuLower))
        );
      });
    }

    // Mapear los productos al formato de la app
    const mappedProducts = await Promise.all(finalProducts.map(mapApiProductToAppProduct));
    return mappedProducts.filter(p => p !== null);
  } catch (error) {
    return [];
  }
};

// Función para obtener colores únicos disponibles
export const getAvailableColors = async (catalog = 'Cherry 2025 - 2026') => {
  try {
    const products = await getAllProducts(catalog);
    const colorSet = new Set();
    
    products.forEach(product => {
      if (product.detalles && product.detalles.length > 0) {
        product.detalles.forEach(detalle => {
          if (detalle.nombreColor && detalle.nombreColor.trim()) {
            colorSet.add(detalle.nombreColor.trim());
          }
        });
      }
    });
    
    return Array.from(colorSet).sort();
  } catch (error) {
    return [];
  }
};

// Función para obtener categorías únicas disponibles
export const getAvailableCategoriesFromAPI = async (catalog = 'Cherry 2025 - 2026') => {
  try {
    const products = await getAllProducts(catalog);
    const categorySet = new Set();
    
    products.forEach(product => {
      if (product.linea?.descripcion && product.linea.descripcion.trim()) {
        categorySet.add(product.linea.descripcion.trim());
      }
    });
    
    return Array.from(categorySet).sort();
  } catch (error) {
    return [];
  }
}; 

// Función para obtener un producto específico por ID
export const getProductById = async (productId) => {
  try {
    console.log(`🔍 OBTENIENDO PRODUCTO POR ID: ${productId}`);
    
    // Make direct API call with specific product ID
    const response = await axios.get(`https://cherryapi.estrategiadmgs.com.mx/cherryApi/?id_articulo=${productId}`);
    const data = response.data;
    
    if (!data || data.length === 0) {
      throw new Error(`Producto con ID ${productId} no encontrado`);
    }
    
    // Since the API parameter doesn't work properly, filter the correct product
    const product = data.find(p => p.id_articulo === productId);
    
    if (!product) {
      throw new Error(`Producto con ID ${productId} no encontrado en la respuesta`);
    }
    
    console.log(`✅ PRODUCTO ENCONTRADO: ${product.descripcion}, precio1: ${product.precio1}, desc_promo: ${product.desc_promo}`);
    
    // 🔥 IMPORTANTE: Aplicar el mapeo para que funcionen las ofertas
    const mappedProduct = mapApiProductToAppProduct(product);
    
    console.log(`🎯 PRODUCTO MAPEADO: discount: ${mappedProduct?.discount}%, price: ${mappedProduct?.price}, originalPrice: ${mappedProduct?.originalPrice}`);
    
    // Retornar el producto original con los campos mapeados agregados
    return {
      ...product,
      // Agregar campos mapeados para las ofertas
      mappedDiscount: mappedProduct?.discount,
      mappedPrice: mappedProduct?.price,
      mappedOriginalPrice: mappedProduct?.originalPrice,
      // Mantener desc_promo original de la API
      desc_promo: product.desc_promo || 0
    };
  } catch (error) {
    console.error(`❌ ERROR obteniendo producto ${productId}:`, error);
    throw error;
  }
}; 

// Función para probar con una API pública de ejemplo
export const testWithPublicApi = async () => {
  try {
    const response = await axios.get('https://jsonplaceholder.typicode.com/posts?_limit=5');
    const data = response.data;
    
    // Convertir los datos de ejemplo a formato de productos
    const mockProducts = data.map((post, index) => ({
      id: `MOCK${post.id}`,
      title: `Producto ${post.title}`,
      image: `https://picsum.photos/300/400?random=${post.id}`,
      price: Math.floor(Math.random() * 200) + 50,
      rating: Math.floor(Math.random() * 2) + 4, // 4-5 estrellas
      description: post.body,
      brand: 'Cherry',
      category: 'Vestidos',
      colors: ['Negro', 'Rojo'],
      stock: Math.floor(Math.random() * 20) + 5,
      isActive: true,
      isNew: Math.random() > 0.5,
      isPromo: Math.random() > 0.7
    }));
    
    return {
      success: true,
      data: mockProducts
    };
  } catch (error) {
    // Error silencioso
  }
  
  return {
    success: false,
    error: 'API pública no funcionó'
  };
}; 
