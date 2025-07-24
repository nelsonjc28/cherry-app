const CHERRY_API_URL = 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/';

// Cache para productos
const productCache = new Map();

// Cache for products to avoid multiple API calls
let productsCache = null;

// Función de prueba para verificar la API
export const testApiConnection = async () => {
  try {
    console.log('🧪 TEST: Probando conexión a la API...');
    console.log('🧪 TEST: URL:', CHERRY_API_URL);
    
    const response = await fetch(CHERRY_API_URL);
    console.log('🧪 TEST: Status:', response.status);
    console.log('🧪 TEST: OK:', response.ok);
    console.log('🧪 TEST: Headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('🧪 TEST: Datos recibidos:', data);
    console.log('🧪 TEST: Tipo:', typeof data);
    console.log('🧪 TEST: Es array:', Array.isArray(data));
    console.log('🧪 TEST: Longitud:', data ? data.length : 'null/undefined');
    
    return {
      success: true,
      data: data,
      isArray: Array.isArray(data),
      length: data ? data.length : 0
    };
  } catch (error) {
    console.error('🧪 TEST: Error:', error);
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
  
  console.log('🧪 TEST: Probando múltiples endpoints...');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`🧪 TEST: Probando endpoint: ${endpoint}`);
      const response = await fetch(endpoint);
      console.log(`🧪 TEST: Status para ${endpoint}:`, response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`🧪 TEST: Datos para ${endpoint}:`, data);
        console.log(`🧪 TEST: Tipo para ${endpoint}:`, typeof data);
        console.log(`🧪 TEST: Es array para ${endpoint}:`, Array.isArray(data));
        console.log(`🧪 TEST: Longitud para ${endpoint}:`, data ? data.length : 'null/undefined');
        
        if (data && (Array.isArray(data) || (typeof data === 'object' && Object.keys(data).length > 0))) {
          console.log(`✅ TEST: Endpoint válido encontrado: ${endpoint}`);
          return {
            success: true,
            endpoint: endpoint,
            data: data
          };
        }
      }
    } catch (error) {
      console.log(`❌ TEST: Error para ${endpoint}:`, error.message);
    }
  }
  
  console.log('❌ TEST: Ningún endpoint funcionó');
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
    console.log('🔄 getAllProducts: Haciendo petición a:', CHERRY_API_URL);
    const response = await fetch(CHERRY_API_URL);
    console.log('📡 getAllProducts: Response status:', response.status);
    console.log('📡 getAllProducts: Response ok:', response.ok);
    
    if (!response.ok) {
      throw new Error(`Error al obtener productos: ${response.status} ${response.statusText}`);
    }
    
    const products = await response.json();
    console.log('📊 getAllProducts: Productos obtenidos de la API:', products);
    console.log('📊 getAllProducts: Tipo de datos:', typeof products);
    console.log('📊 getAllProducts: Es array:', Array.isArray(products));
    console.log('📊 getAllProducts: Longitud:', products ? products.length : 'null/undefined');
    
    // Verificar si products es válido
    if (!products) {
      console.error('❌ getAllProducts: Los datos son null/undefined');
      return [];
    }
    
    // Si no es un array, intentar convertirlo
    let productsArray = products;
    if (!Array.isArray(products)) {
      console.warn('⚠️ getAllProducts: Los datos no son un array, intentando convertir...');
      
      // Si es un objeto, buscar una propiedad que contenga los productos
      if (typeof products === 'object') {
        const possibleKeys = ['products', 'data', 'items', 'result', 'content'];
        for (const key of possibleKeys) {
          if (products[key] && Array.isArray(products[key])) {
            console.log(`✅ getAllProducts: Encontrados productos en la propiedad '${key}'`);
            productsArray = products[key];
            break;
          }
        }
        
        // Si no se encontró, intentar usar el objeto completo como array
        if (!Array.isArray(productsArray)) {
          console.warn('⚠️ getAllProducts: No se pudo convertir a array, usando datos como están');
          productsArray = [products];
        }
      } else {
        console.error('❌ getAllProducts: Los datos no son un objeto válido');
        return [];
      }
    }
    
    console.log('✅ getAllProducts: Productos procesados correctamente:', productsArray.length);
    
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
    console.error('❌ getAllProducts: Error completo:', error);
    console.error('❌ getAllProducts: Error message:', error.message);
    console.error('❌ getAllProducts: Error stack:', error.stack);
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

// Función para mapear productos de la API al formato de la app
export const mapApiProductToAppProduct = async (apiProduct) => {
  console.log('🔄 mapApiProductToAppProduct: Procesando producto:', apiProduct);
  
  // Verificar que el producto tenga los campos necesarios
  if (!apiProduct) {
    console.error('❌ mapApiProductToAppProduct: Producto es null/undefined');
    return null;
  }
  
  // Extraer campos con fallbacks específicos para la API real
  const id = apiProduct.id_articulo || apiProduct.id || apiProduct.codigo || 'unknown';
  const title = apiProduct.descripcion || apiProduct.nombre || apiProduct.title || 'Producto sin nombre';
  const originalPrice = apiProduct.precio1 || apiProduct.precio || apiProduct.price || 0;
  const discount = apiProduct.desc_promo || apiProduct.descuento || apiProduct.discount || 0;
  const finalPrice = discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;
  
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
  
  // Obtener categoría de la línea
  const category = apiProduct.linea?.descripcion || apiProduct.categoria || apiProduct.category || 'Sin categoría';
  
  // Obtener calificación real del sistema local
  let rating = 0;
  let ratingCount = 0;
  
  try {
    console.log(`🔍 Obteniendo rating para producto: ${id}`);
    const ratingResponse = await fetch(`http://localhost:8000/api/ratings/product?product_id=${id}`);
    console.log(`📡 Rating response status:`, ratingResponse.status);
    console.log(`📡 Rating response ok:`, ratingResponse.ok);
    
    if (ratingResponse.ok) {
      const ratingData = await ratingResponse.json();
      console.log(`📊 Rating data recibida:`, ratingData);
      
      if (ratingData.success && ratingData.average_rating) {
        rating = ratingData.average_rating.average || 0;
        ratingCount = ratingData.average_rating.count || 0;
        console.log(`⭐ Rating real para ${id}: ${rating} (${ratingCount} calificaciones)`);
      } else {
        console.warn(`⚠️ Rating data no tiene el formato esperado:`, ratingData);
      }
    } else {
      console.warn(`⚠️ Rating response no ok: ${ratingResponse.status} ${ratingResponse.statusText}`);
    }
  } catch (error) {
    console.error(`❌ Error obteniendo rating para ${id}:`, error);
    // Usar rating por defecto si falla
    rating = 5;
    ratingCount = 0;
  }
  
  const mappedProduct = {
    id: id,
    title: title,
    image: image,
    price: finalPrice,
    originalPrice: discount > 0 ? originalPrice : null,
    discount: discount > 0 ? discount : null,
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
    dtu: apiProduct.DTU || apiProduct.dtu
  };
  
  console.log('✅ mapApiProductToAppProduct: Producto mapeado:', mappedProduct);
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
    console.log('🔄 getRandomProducts: Iniciando...');
    const products = await getAllProducts();
    console.log('📊 getRandomProducts: Total productos obtenidos:', products.length);
    
    // Filtrar productos activos (activo: 1) y con stock (inventario > 0)
    const activeProducts = products.filter(product => {
      const isActive = product.activo === 1;
      const hasStock = product.inventario > 0;
      const isWebEnabled = product.opc_web === 'S';
      
      console.log(`🔍 Producto ${product.id_articulo}: activo=${product.activo}, inventario=${product.inventario}, opc_web=${product.opc_web}`);
      
      return isActive && hasStock && isWebEnabled;
    });
    
    console.log('✅ getRandomProducts: Productos activos con stock:', activeProducts.length);
    
    if (activeProducts.length === 0) {
      console.warn('⚠️ getRandomProducts: No hay productos activos, usando productos con inventario > 0');
      // Si no hay productos activos, usar productos con stock
      const productsWithStock = products.filter(product => product.inventario > 0);
      console.log('📦 getRandomProducts: Productos con stock:', productsWithStock.length);
      
      if (productsWithStock.length === 0) {
        console.warn('⚠️ getRandomProducts: No hay productos con stock, usando todos los productos');
        // Si no hay productos con stock, usar todos
        const shuffled = products.sort(() => 0.5 - Math.random());
        const selectedProducts = shuffled.slice(0, limit);
        
        // Mapear productos de forma asíncrona
        const randomProducts = await Promise.all(selectedProducts.map(mapApiProductToAppProduct));
        console.log('🎲 getRandomProducts: Productos aleatorios seleccionados (todos):', randomProducts.length);
        return randomProducts.filter(p => p !== null);
      }
      
      // Mezclar productos con stock
      const shuffled = productsWithStock.sort(() => 0.5 - Math.random());
      const selectedProducts = shuffled.slice(0, limit);
      
      // Mapear productos de forma asíncrona
      const randomProducts = await Promise.all(selectedProducts.map(mapApiProductToAppProduct));
      console.log('🎲 getRandomProducts: Productos aleatorios seleccionados (con stock):', randomProducts.length);
      return randomProducts.filter(p => p !== null);
    }
    
    // Mezclar el array de productos para obtener una selección aleatoria
    const shuffled = activeProducts.sort(() => 0.5 - Math.random());
    
    // Tomar solo los primeros 'limit' productos
    const selectedProducts = shuffled.slice(0, limit);
    
    // Mapear productos de forma asíncrona
    const randomProducts = await Promise.all(selectedProducts.map(mapApiProductToAppProduct));
    console.log('🎲 getRandomProducts: Productos aleatorios seleccionados (activos):', randomProducts.length);
    
    return randomProducts.filter(p => p !== null);
  } catch (error) {
    console.error('❌ getRandomProducts: Error:', error);
    return [];
  }
};

// Función para obtener productos nuevos
export const getNewProducts = async (limit = 8) => {
  try {
    const products = await getAllProducts();
    const newProducts = products
      .filter(product => product.opc_nuevo === 'S' && product.activo === 1)
      .slice(0, limit);
    
    // Mapear productos de forma asíncrona
    const mappedProducts = await Promise.all(newProducts.map(mapApiProductToAppProduct));
    return mappedProducts.filter(p => p !== null);
  } catch (error) {
    return [];
  }
};

// Función para obtener productos en promoción
export const getPromoProducts = async (limit = 8) => {
  try {
    const products = await getAllProducts();
    const promoProducts = products
      .filter(product => product.opc_promo === 'S' && product.desc_promo > 0)
      .slice(0, limit);
    
    // Mapear productos de forma asíncrona
    const mappedProducts = await Promise.all(promoProducts.map(mapApiProductToAppProduct));
    return mappedProducts.filter(p => p !== null);
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
    
    // Mapear los productos filtrados al formato de la app
    const mappedProducts = filteredRawProducts.map(mapApiProductToAppProduct);
    
    return mappedProducts;
  } catch (error) {
    return [];
  }
};

// Función para obtener todos los productos y mapearlos al formato de la app
export const fetchProducts = async (catalog = 'Cherry 2025 - 2026') => {
  try {
    const products = await getAllProducts(catalog);
    return products.map(mapApiProductToAppProduct);
  } catch (error) {
    return [];
  }
};

// Función para obtener productos por disponibilidad
export const getProductsByAvailability = async (availability, catalog = 'Cherry 2025 - 2026') => {
  try {
    const response = await fetch(CHERRY_API_URL);
    if (!response.ok) {
      throw new Error('Error al obtener productos');
    }
    const products = await response.json();
    
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
    
    return filteredProducts;
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
    return finalProducts.map(mapApiProductToAppProduct);
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
    // Make direct API call with specific product ID
    const response = await fetch(`https://cherryapi.estrategiadmgs.com.mx/cherryApi/?id_articulo=${productId}`);
    
    if (!response.ok) {
      throw new Error('No se pudo obtener el producto');
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error(`Producto con ID ${productId} no encontrado`);
    }
    
    // Since the API parameter doesn't work properly, filter the correct product
    const product = data.find(p => p.id_articulo === productId);
    
    if (!product) {
      throw new Error(`Producto con ID ${productId} no encontrado en la respuesta`);
    }
    
    return product;
  } catch (error) {
    throw error;
  }
}; 

// Función para probar con una API pública de ejemplo
export const testWithPublicApi = async () => {
  try {
    console.log('🧪 TEST: Probando con API pública de ejemplo...');
    const response = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5');
    console.log('🧪 TEST: Status API pública:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('🧪 TEST: Datos API pública:', data);
      
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
      
      console.log('🧪 TEST: Productos mock generados:', mockProducts);
      return {
        success: true,
        data: mockProducts
      };
    }
  } catch (error) {
    console.error('🧪 TEST: Error con API pública:', error);
  }
  
  return {
    success: false,
    error: 'API pública no funcionó'
  };
}; 