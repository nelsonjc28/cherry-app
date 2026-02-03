import axios from 'axios';
import api from '../config/axios';
import productCache from '../utils/productCacheInMemory';

const CHERRY_API_URL = 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/';

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

/**
 * Verifica si un producto es nuevo basándose en las fechas de movimiento de sus detalles
 * Un producto es nuevo si algún detalle tiene fechaMovimiento menor a 60 días
 */
const isProductNew = (apiProduct) => {
  // Si no tiene detalles, usar el campo tradicional
  if (!apiProduct.detalles || !Array.isArray(apiProduct.detalles) || apiProduct.detalles.length === 0) {
    return apiProduct.opc_nuevo === 'S' || apiProduct.is_new === true;
  }
  
  const now = new Date();
  const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
  
  // Revisar cada detalle del producto
  return apiProduct.detalles.some(detalle => {
    if (!detalle.fechaMovimiento) return false;
    
    try {
      // Parsear la fecha (formato: "YYYY-MM-DD")
      const [year, month, day] = detalle.fechaMovimiento.split('-').map(Number);
      const fechaMovimiento = new Date(year, month - 1, day);
      
      // Si la fecha es válida y es menor a 60 días, el producto es nuevo
      return !isNaN(fechaMovimiento.getTime()) && fechaMovimiento >= sixtyDaysAgo;
    } catch (error) {
      return false;
    }
  });
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
    return [];
  }
};

// Función optimizada para obtener productos con ratings y filtros
// AHORA USA CACHÉ EN MEMORIA PARA EVITAR DESCARGAS REPETIDAS
export const getProductsWithRatings = async (catalog = 'Cherry 2025 - 2026', options = {}) => {
  try {
    const {
      limit = 20,  // Por defecto 20 productos
      offset = 0,
      random = false,
      category = null,  // Filtrar por categoría
      onlyPromos = false,  // Solo productos con promoción
      onlyNew = false,  // Solo productos nuevos
      catalogCode = null  // Filtrar por código de catálogo
    } = options;
    
    const startTime = Date.now();
    
    // 🚀 USAR CACHÉ EN MEMORIA (carga UNA VEZ por sesión)
    let rawProducts = await productCache.getAllProducts();
    if (!Array.isArray(rawProducts)) {
      return { products: [], total: 0, hasMore: false };
    }
    
    // APLICAR FILTROS usando las funciones optimizadas del caché
    
    // Filtrar por catálogo si se especifica
    if (catalogCode) {
      rawProducts = productCache.filterByCatalog(rawProducts, catalogCode);
    } else if (catalog && catalog !== 'Cherry 2025 - 2026') {
      // Filtrar por temporada
      rawProducts = rawProducts.filter(product => product.temporada === catalog);
    }
    
    // Filtrar por categoría (línea)
    if (category) {
      rawProducts = productCache.filterByCategory(rawProducts, category);
    }
    
    // Filtrar solo promociones
    if (onlyPromos) {
      rawProducts = productCache.filterOnlyPromos(rawProducts);
    }
    
    // Filtrar solo nuevos
    if (onlyNew) {
      rawProducts = productCache.filterOnlyNew(rawProducts);
    }
    
    
    // Mezclar aleatoriamente si se solicita
    if (random) {
      rawProducts = productCache.shuffle(rawProducts);
    }
    
    // Aplicar paginación (si limit no es null)
    const paginatedProducts = limit !== null 
      ? rawProducts.slice(offset, offset + limit)
      : rawProducts;
    
    
    // Extraer IDs de productos para obtener ratings en bulk
    const productIds = paginatedProducts.map(product => 
      product.id_articulo || product.id || product.codigo
    ).filter(Boolean);
    
    // Obtener ratings en bulk
    const ratingsCache = await getBulkRatings(productIds);
    
    // Mapear productos con ratings
    const mappedProducts = await Promise.all(
      paginatedProducts.map(product => mapApiProductToAppProduct(product, ratingsCache))
    );
    
    const validProducts = mappedProducts.filter(p => p !== null);
    
    const duration = Date.now() - startTime;
    
    // Retornar productos con metadata de paginación
    return {
      products: validProducts,
      total: rawProducts.length,
      hasMore: limit !== null && (offset + limit) < rawProducts.length
    };
  } catch (error) {
    return { products: [], total: 0, hasMore: false };
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
    // Normalizar id_linea y lineId a números para comparación (ignorar ceros a la izquierda)
    const normalizedLineId = parseInt(String(lineId), 10);
    return products.filter(product => {
      const productLineaId = product.linea?.id_linea;
      const normalizedProductLineaId = productLineaId ? parseInt(String(productLineaId), 10) : null;
      return normalizedProductLineaId !== null && normalizedLineId === normalizedProductLineaId;
    });
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
  } else {
  }
  
  // Generar URL de imagen S3 usando el id_articulo
  const image = generateS3ImageUrl(id);
  
  // Obtener colores únicos de los detalles
  let colors = [];
  let sizes = [];
  
  if (apiProduct.detalles && Array.isArray(apiProduct.detalles)) {
    colors = [...new Set(apiProduct.detalles.map(d => d.nombreColor).filter(Boolean))];
    sizes = [...new Set(apiProduct.detalles.map(d => d.detalle).filter(Boolean))];
  } else if (apiProduct.colores && Array.isArray(apiProduct.colores)) {
    colors = apiProduct.colores;
  } else if (apiProduct.colors && Array.isArray(apiProduct.colors)) {
    colors = apiProduct.colors;
  }
  
  // Si no hay colores, agregar colores de prueba
  if (!colors || colors.length === 0) {
    colors = ['white', 'black', 'navy'];
  }
  
  // Si no hay tallas, agregar tallas de prueba
  if (!sizes || sizes.length === 0) {
    sizes = ['S', 'M', 'L'];
  }
  
  // Obtener categoría de la línea
  const category = apiProduct.linea?.descripcion || apiProduct.categoria || apiProduct.category || 'Sin categoría';
  const category_id = apiProduct.linea?.id_linea || apiProduct.categoria_id || apiProduct.category_id || '';
  const catalog = apiProduct.catalogoId != '' ? apiProduct.catalogoId : '';
  
  // Obtener calificación del cache o usar valores por defecto
  let rating = 0;
  let ratingCount = 0;
  
  if (ratingsCache[id]) {
    rating = ratingsCache[id].average || 0;
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
    totalRatings: ratingCount, // Agregar totalRatings para compatibilidad con StarRating
    description: apiProduct.descripcion || apiProduct.descripcion_corta || title,
    brand: apiProduct.marca || apiProduct.brand || 'Cherry',
    category: category,
    catalog: catalog,
    catalogoId: apiProduct.catalogoId || catalog, // Para filtro de catálogo
    category_id: category_id,
    colors: colors,
    sizes: sizes,
    stock: apiProduct.inventario || apiProduct.stock || 0,
    isActive: apiProduct.activo === 1 || apiProduct.active === true,
    isNew: isProductNew(apiProduct),
    isPromo: apiProduct.opc_promo === 'S' || apiProduct.is_promo === true,
    codigo: id,
    barcode: apiProduct.ean || apiProduct.sku || apiProduct.codigo_barras || id, // Código de barras
    dtu: apiProduct.DTU || apiProduct.dtu,
    // Campos adicionales para debugging
    precio1: apiProduct.precio1,
    desc_promo: apiProduct.desc_promo,
    // Mantener detalles originales para filtros
    detalles: apiProduct.detalles || []
  };
  
  return mappedProduct;
};

// Función para obtener productos más vendidos
export const getFeaturedProducts = async (limit = 8) => {
  try {
    const products = await getAllProducts();
    const featured = products
      .filter(product => product.inventario > 0)
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
    
    // Filtrar productos con stock (inventario > 0) y habilitados para web
    const activeProducts = products.filter(product => {
      const hasStock = product.inventario > 0;
      const isWebEnabled = product.opc_web === 'S';
      
      return hasStock && isWebEnabled;
    });
    
    // Filtrar productos con fechaMovimiento menor a 60 días
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
    
    const recentProducts = activeProducts.filter(product => {
      // Si no tiene detalles, no lo incluimos
      if (!product.detalles || !Array.isArray(product.detalles) || product.detalles.length === 0) {
        return false;
      }
      
      // Revisar cada detalle del producto
      return product.detalles.some(detalle => {
        if (!detalle.fechaMovimiento) return false;
        
        try {
          // Parsear la fecha (formato: "YYYY-MM-DD")
          const [year, month, day] = detalle.fechaMovimiento.split('-').map(Number);
          const fechaMovimiento = new Date(year, month - 1, day);
          
          // Si la fecha es válida y es menor a 60 días, incluir el producto
          return !isNaN(fechaMovimiento.getTime()) && fechaMovimiento >= sixtyDaysAgo;
        } catch (error) {
          return false;
        }
      });
    });
    
    if (recentProducts.length === 0) {
      // Si no hay productos recientes, retornar array vacío
      // (solo mostramos productos con menos de 60 días)
      return [];
    }
    
    // Mezclar el array de productos recientes para obtener una selección aleatoria
    const shuffled = recentProducts.sort(() => 0.5 - Math.random());
    
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
    
    // Filtrar productos con stock y habilitados para web
    const activeProducts = products.filter(product => {
      const hasStock = product.inventario > 0;
      const isWebEnabled = product.opc_web === 'S';
      
      return hasStock && isWebEnabled;
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

// Función para obtener productos en promoción (CON ofertas personalizadas)
export const getPromoProducts = async (limit = 50) => {
  try {
    // PASO 1: Obtener datos completos de ofertas personalizadas del backend
    const { productIds: userOfferIds, offerData } = await getUserOfferData();
    
    // PASO 2: Obtener TODOS los productos de la API externa (sin filtrar por desc_promo)
    const allExternalProducts = await getExternalPromoProducts(1000, true); // includeAll = true
    
    // PASO 3: Buscar productos con ofertas personalizadas en TODA la API externa
    const userOfferProducts = [];
    
    for (const productId of userOfferIds) {
      const product = allExternalProducts.find(p => 
        p.id === productId || 
        p.codigo === productId || 
        p.id_articulo === productId
      );
      
      if (product) {
        // Obtener datos reales de la oferta para este producto
        const offerDataForProduct = offerData[productId];
        
        
        // Marcar como producto con oferta personalizada usando datos reales
        product.hasUserOffer = true;
        
        // Calcular el descuento visual según el tipo
        let visualDiscount = 0;
        let discountAmount = 0;
        let showPriceDiscount = true;
        
        const originalPrice = product.price || product.precio1 || 0;
        let finalPrice = originalPrice;
        
        // Para ofertas buy_x_get_y y free_shipping, NO mostrar descuento de precio
        if (offerDataForProduct.discount_category === 'buy_x_get_y') {
          visualDiscount = 0; // No mostrar descuento de precio para buy X get Y
          showPriceDiscount = false;
          finalPrice = originalPrice; // Mantener precio original
        } else if (offerDataForProduct.discount_category === 'free_shipping') {
          visualDiscount = 0; // No mostrar descuento de precio para envío gratis
          showPriceDiscount = false;
          finalPrice = originalPrice; // Mantener precio original
        } else {
          // Solo para product_discount y order_discount
          if (offerDataForProduct.discount_type === 'percentage') {
            visualDiscount = parseFloat(offerDataForProduct.discount_percentage) || 0;
            discountAmount = originalPrice * (visualDiscount / 100);
            finalPrice = originalPrice - discountAmount;
          } else if (offerDataForProduct.discount_type === 'fixed') {
            // Para descuentos fijos, el discount_percentage contiene el monto en dinero
            discountAmount = parseFloat(offerDataForProduct.discount_percentage) || 0;
            finalPrice = Math.max(0, originalPrice - discountAmount);
            if (originalPrice > 0) {
              visualDiscount = Math.round((discountAmount / originalPrice) * 100);
            }
          }
          
          // Aplicar límites de descuento si están configurados
          if (offerDataForProduct.max_discount_amount && offerDataForProduct.discount_type === 'percentage') {
            const maxDiscount = parseFloat(offerDataForProduct.max_discount_amount);
            const calculatedDiscount = originalPrice - finalPrice;
            if (calculatedDiscount > maxDiscount) {
              finalPrice = originalPrice - maxDiscount;
            }
          }
        }
        
        // Validar fechas de la oferta
        const now = new Date();
        const startDate = offerDataForProduct.start_date ? new Date(offerDataForProduct.start_date) : null;
        const endDate = offerDataForProduct.end_date ? new Date(offerDataForProduct.end_date) : null;
        
        let isActive = true;
        let timeRemaining = null;
        
        if (endDate) {
          isActive = endDate >= now;
          if (isActive) {
            const timeDiff = endDate.getTime() - now.getTime();
            const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            timeRemaining = daysRemaining;
          }
        }
        
        
        product.userOffer = {
          discount_percentage: visualDiscount, // Porcentaje visual para mostrar
          discount_amount: discountAmount, // Monto real del descuento
          discount_type: offerDataForProduct.discount_type,
          discount_category: offerDataForProduct.discount_category,
          title: offerDataForProduct.title,
          start_date: offerDataForProduct.start_date,
          end_date: offerDataForProduct.end_date,
          is_active: isActive,
          days_remaining: timeRemaining,
          buy_quantity: offerDataForProduct.buy_quantity,
          get_quantity: offerDataForProduct.get_quantity,
          max_discount_amount: offerDataForProduct.max_discount_amount,
          min_purchase_amount: offerDataForProduct.min_purchase_amount,
          showPriceDiscount: showPriceDiscount // Indicar si debe mostrar descuento de precio
        };
        
        // Asignar userDiscount para compatibilidad con PromocionesPage
        product.userDiscount = visualDiscount;
        
        // Actualizar precios del producto solo si debe mostrar descuento de precio
        if (showPriceDiscount) {
          product.originalPrice = originalPrice;
          product.price = finalPrice;
          product.discount = visualDiscount;
        } else {
          // Para buy_x_get_y y free_shipping, mantener precio original sin descuento visual
          product.price = originalPrice;
          product.originalPrice = null; // No mostrar precio tachado
          product.discount = 0; // No mostrar porcentaje de descuento
        }
        userOfferProducts.push(product);
      }
    }
    
    // PASO 4: Filtrar productos externos con desc_promo > 0 que NO tengan ofertas personalizadas
    const externalPromoProducts = allExternalProducts.filter(product => {
      const hasExternalDiscount = product.desc_promo && parseFloat(product.desc_promo) > 0;
      const hasUserOffer = userOfferIds.includes(product.id || product.codigo || product.id_articulo);
      return hasExternalDiscount && !hasUserOffer;
    });
    
    // PASO 5: Combinar productos (primero ofertas personalizadas, luego externas)
    const finalProducts = [...userOfferProducts, ...externalPromoProducts];
    
    // Limitar al número solicitado (si limit es 0, mostrar todos)
    const limitedProducts = limit > 0 ? finalProducts.slice(0, limit) : finalProducts;
    
    return limitedProducts;
    
  } catch (error) {
    // Fallback a ofertas externas
    return await getExternalPromoProducts(limit);
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

    // Importar utilidades de búsqueda flexible
    const { flexibleMatch } = await import('../utils/searchNormalizer');

    const queryLower = query.toLowerCase().trim();
    const searchTerms = queryLower.split(' ').filter(term => term.length > 0);

    // Filtrar productos que coincidan con la búsqueda
    const filteredProducts = products.filter(product => {
      // Si no hay términos de búsqueda, devolver todos los productos
      if (searchTerms.length === 0) {
        return true;
      }

      // LÓGICA INTELIGENTE DE BÚSQUEDA CON SOPORTE PARA PLURALES/SINGULARES
      if (searchTerms.length === 1) {
        // UNA PALABRA: Buscar en todos los campos (color, talla, ID, SKU, etc.)
        const singleTerm = searchTerms[0];
        
        return (
          // Búsqueda flexible en descripción/nombre (soporta plurales/singulares)
          flexibleMatch(singleTerm, product.descripcion || '') ||
          flexibleMatch(singleTerm, product.marca || '') ||
          flexibleMatch(singleTerm, product.linea?.descripcion || '') ||
          flexibleMatch(singleTerm, product.sector?.descripcion || '') ||
          flexibleMatch(singleTerm, product.genero?.descripcion || '') ||
          // Búsqueda exacta en códigos (no aplicar plurales aquí)
          (product.DTU && product.DTU.toLowerCase().includes(singleTerm)) ||
          (product.dtu && product.dtu.toLowerCase().includes(singleTerm)) ||
          (product.id_articulo && product.id_articulo.toString().includes(singleTerm)) ||
          (product.sku && product.sku.toLowerCase().includes(singleTerm)) ||
          (product.ean && product.ean.toLowerCase().includes(singleTerm)) ||
          // Búsqueda flexible en especificaciones y notas
          flexibleMatch(singleTerm, product.especificaciones || '') ||
          flexibleMatch(singleTerm, product.notas || '') ||
          // Búsqueda flexible en colores
          product.detalles?.some(d => 
            flexibleMatch(singleTerm, d.nombreColor || '') ||
            (d.codigoColor && d.codigoColor.toLowerCase().includes(singleTerm))
          ) ||
          // Búsqueda en tallas (exacta)
          product.detalles?.some(d => 
            d.detalle?.toLowerCase().includes(singleTerm)
          )
        );
      } else {
        // MÚLTIPLES PALABRAS: Buscar principalmente en nombre/descripción del producto
        const productName = product.descripcion || '';
        const productBrand = product.marca || '';
        const productCategory = product.linea?.descripcion || '';
        
        // Crear texto combinado del nombre del producto
        const productText = `${productName} ${productBrand} ${productCategory}`.trim();
        
        // Verificar si TODAS las palabras están en el nombre del producto (con búsqueda flexible)
        const allTermsInName = searchTerms.every(term => 
          flexibleMatch(term, productText)
        );
        
        // Si todas las palabras están en el nombre, es una coincidencia fuerte
        if (allTermsInName) {
          return true;
        }
        
        // Si no, buscar en descripción específicamente
        const descriptionMatch = searchTerms.every(term => 
          flexibleMatch(term, productName)
        );
        
        return descriptionMatch;
      }
    });

    // Aplicar filtros adicionales si se proporcionan
    let finalProducts = filteredProducts;

    // Filtrar por disponibilidad
    if (filters.availability === 'con-existencia') {
      finalProducts = finalProducts.filter(product => product.inventario > 0);
    }

    // Filtrar por categoría (soporta selección múltiple)
    const selectedCategories = Array.isArray(filters.categories) && filters.categories.length > 0
      ? filters.categories.filter(cat => cat !== 'todos') // Excluir la opción "todos"
      : (filters.category && filters.category !== '' ? (Array.isArray(filters.category) ? filters.category.filter(cat => cat !== 'todos') : [String(filters.category)]) : []);
    
    if (selectedCategories.length > 0) {
      finalProducts = finalProducts.filter(product => {
        const productLineaId = String(product.linea?.id_linea || '');
        return selectedCategories.some(categoryCode => String(categoryCode) === productLineaId);
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
    const validProducts = mappedProducts.filter(p => p !== null);
    
    
    return validProducts;
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

// Función para obtener tallas únicas disponibles
export const getAvailableSizes = async (catalog = 'Cherry 2025 - 2026') => {
  try {
    const products = await getAllProducts(catalog);
    const sizeSet = new Set();
    
    products.forEach(product => {
      if (product.detalles && product.detalles.length > 0) {
        product.detalles.forEach(detalle => {
          if (detalle.detalle && detalle.detalle.trim()) {
            sizeSet.add(detalle.detalle.trim());
          }
        });
      }
    });
    
    // Ordenar tallas de manera lógica (XS, S, M, L, XL, XXL, etc.)
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    const sizes = Array.from(sizeSet);
    
    return sizes.sort((a, b) => {
      const indexA = sizeOrder.indexOf(a.toUpperCase());
      const indexB = sizeOrder.indexOf(b.toUpperCase());
      
      // Si ambas tallas están en el orden predefinido
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // Si solo una está en el orden predefinido, esa va primero
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      // Si ninguna está en el orden predefinido, ordenar alfabéticamente
      return a.localeCompare(b);
    });
  } catch (error) {
    return [];
  }
};

// Función para obtener categorías únicas disponibles
export const getAvailableCategoriesFromAPI = async (catalog = 'Cherry 2025 - 2026') => {
  try {
    const products = await getAllProducts(catalog);
    const categoryMap = new Map();
    
    products.forEach(product => {
      if (product.linea?.id_linea && product.linea?.descripcion && product.linea.descripcion.trim()) {
        const code = product.linea.id_linea.toString();
        const name = product.linea.descripcion.trim();
        
        // Solo agregar si no existe ya (para evitar duplicados)
        if (!categoryMap.has(code)) {
          categoryMap.set(code, { code, name });
        }
      }
    });
    
    // Convertir Map a array y ordenar por nombre
    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    return [];
  }
}; 

// Función para obtener un producto específico por ID
export const getProductById = async (productId) => {
  try {
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
    
    // 🔥 IMPORTANTE: Aplicar el mapeo para que funcionen las ofertas
    const mappedProduct = mapApiProductToAppProduct(product);;
    
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

/**
 * Obtener los productos más vendidos
 * Usa el endpoint /api/products/top-selling que retorna productos completos desde la BD local
 */
export const getTopSellingProducts = async (limit = 20) => {
  try {
    // Obtener productos más vendidos directamente del backend local
    const response = await api.get('/products/top-selling', {
      params: { limit }
    });
    
    if (!response.data.success || !response.data.data || !response.data.data.products) {
      return [];
    }
    
    const products = response.data.data.products;
    
    if (products.length === 0) {
      return [];
    }
    
    // Los productos ya vienen con el formato correcto desde TopSellingController
    // Solo necesitamos mapearlos al formato esperado por el frontend
    const mappedProducts = products.map(product => {
      // Calcular stock total desde detalles si está disponible
      let stock = product.inventario || 0;
      if (product.detalles && Array.isArray(product.detalles)) {
        stock = product.detalles.reduce((total, detalle) => {
          return total + (detalle.inventario_d || 0);
        }, 0);
      }
      
      return {
        id: product.id || product.id_articulo,
        id_articulo: product.id_articulo || product.id,
        title: product.title || product.descripcion,
        description: product.descripcion || product.title,
        price: product.price || product.precio1 || 0,
        originalPrice: product.originalPrice || null,
        discount: product.discount || 0,
        image: product.image,
        brand: product.marca || 'Sin marca',
        stock: stock,
        inventario: stock,
        colors: product.colors || product.colores || [],
        colores: product.colores || product.colors || [],
        sizes: product.sizes || [],
        tallas: product.sizes || [],
        isNew: product.isNew || false,
        rating: product.rating || 0,
        ratingCount: product.ratingCount || product.totalRatings || 0,
        totalRatings: product.totalRatings || product.ratingCount || 0,
        opc_nuevo: product.opc_nuevo,
        opc_promo: product.opc_promo,
        desc_promo: product.desc_promo,
        fecha_alta: product.fecha_alta,
        detalles: product.detalles || [],
        ranking: product.ranking || null
      };
    });
    
    return mappedProducts;
    
  } catch (error) {
    console.error('Error al obtener productos más vendidos:', error);
    return [];
  }
};

/**
 * Verificar si hay una sesión de usuario activa
 */
export const isUserSessionActive = () => {
  try {
    // Verificar si hay token en localStorage
    const token = localStorage.getItem('token');
    
    if (!token) {
      return false;
    }
    
    // Verificar si el token no está vacío
    if (token.trim() === '') {
      return false;
    }
    
    // TODO: Aquí se podría agregar validación adicional del token
    // como verificar si no ha expirado, pero por ahora con que exista es suficiente
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Obtener productos promocionales externos (sin ofertas personalizadas)
 */
export const getExternalPromoProducts = async (limit = 50, includeAll = false) => {
  try {
    
    const response = await axios.get(CHERRY_API_URL);
    const data = response.data;
    
    let allProducts = [];
    if (Array.isArray(data)) {
      allProducts = data;
    } else if (data && data.productos && Array.isArray(data.productos)) {
      allProducts = data.productos;
    } else {
      return [];
    }

    let finalProducts = [];

    if (includeAll) {
      // Si includeAll = true, obtener TODOS los productos (sin filtrar por desc_promo)
      finalProducts = allProducts.filter(product => {
        const isWebEnabled = product.opc_web === 'S';
        return isWebEnabled;
      });
    } else {
    // Filtrar productos con desc_promo > 0 (ofertas reales de la API externa)
    const promoProducts = allProducts.filter(product => {
      const hasPromoDiscount = product.desc_promo && parseFloat(product.desc_promo) > 0;
      const isWebEnabled = product.opc_web === 'S';
      
      return hasPromoDiscount && isWebEnabled;
    });;

    // Si no hay productos con desc_promo, usar productos con opc_promo = 'S'
      finalProducts = promoProducts;
    if (finalProducts.length === 0) {
      finalProducts = allProducts.filter(product => {
        const hasPromoOption = product.opc_promo === 'S';
        const isWebEnabled = product.opc_web === 'S';
        
        return hasPromoOption && isWebEnabled;
      });;
      }
    }

    if (finalProducts.length === 0) {
      return [];
    }

    // Ordenar por descuento (mayor descuento primero) y mostrar TODOS
    const sortedProducts = finalProducts.sort((a, b) => {
      const discountA = parseFloat(a.desc_promo) || 0;
      const discountB = parseFloat(b.desc_promo) || 0;
      return discountB - discountA; // Mayor descuento primero
    });
    
    // Si se especifica un límite, aplicarlo; si no, mostrar todos
    const selectedProducts = limit > 0 ? sortedProducts.slice(0, limit) : sortedProducts;

    // Obtener IDs para ratings
    const productIds = selectedProducts.map(product => 
      product.id_articulo || product.id || product.codigo
    ).filter(Boolean);

    // Obtener ratings en bulk
    const ratingsCache = await getBulkRatings(productIds);

    // Mapear productos (SIN aplicar ofertas personalizadas)
    const mappedProducts = await Promise.all(
      selectedProducts.map(product => mapApiProductToAppProduct(product, ratingsCache))
    );

    const validProducts = mappedProducts.filter(p => p !== null);;

    return validProducts;

  } catch (error) {
    return [];
  }
};


/**
 * Obtener datos completos de ofertas personalizadas del backend
 */
export const getUserOfferData = async () => {
  try {
    // Verificar si hay sesión activa
    if (!isUserSessionActive()) {
      return { productIds: [], offerData: {} };
    }

    // Obtener token del localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      return { productIds: [], offerData: {} };
    }

    // PASO 1: Obtener IDs de productos con ofertas personalizadas
    const idsResponse = await fetch('/api/user-offer-products', {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });
    
    if (!idsResponse.ok) {
      return { productIds: [], offerData: {} };
    }

    const idsData = await idsResponse.json();
    
    if (!idsData.success || !idsData.product_ids || idsData.product_ids.length === 0) {
      return { productIds: [], offerData: {} };
    }

    // PASO 2: Obtener datos completos de las ofertas usando el endpoint existente
    const detailsResponse = await fetch('/api/user-discounts/check', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product_ids: idsData.product_ids
      })
    });
    
    if (!detailsResponse.ok) {
      return { productIds: idsData.product_ids, offerData: {} };
    }

    const detailsData = await detailsResponse.json();
    
    if (!detailsData.success || !detailsData.discounts) {
      return { productIds: idsData.product_ids, offerData: {} };
    }

    return { productIds: idsData.product_ids, offerData: detailsData.discounts };

  } catch (error) {
    return { productIds: [], offerData: {} };
  }
};

/**
 * Obtener productos que tienen ofertas personalizadas activas para el usuario
 */
export const getUserOfferProducts = async () => {
  try {
    // Verificar si hay sesión activa
    if (!isUserSessionActive()) {
      return [];
    }

    // Obtener token del localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      return [];
    }
    
    // Obtener IDs de productos con ofertas personalizadas del backend
    const response = await fetch('/api/user-offer-products', {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.success || !data.product_ids || data.product_ids.length === 0) {
      return [];
    }

    const productIds = data.product_ids;;

    // Obtener datos completos de la API externa
    const apiResponse = await axios.get(CHERRY_API_URL);
    const apiData = apiResponse.data;
    
    let allApiProducts = [];
    if (Array.isArray(apiData)) {
      allApiProducts = apiData;
    } else if (apiData && apiData.productos && Array.isArray(apiData.productos)) {
      allApiProducts = apiData.productos;
    }
    

    // Filtrar productos que coincidan con los IDs de ofertas
    const userOfferProducts = [];;;;
    
    for (const productId of productIds) {
      const product = allApiProducts.find(p => {
        const matchesId = (p.id_articulo && p.id_articulo.toString() === productId.toString()) ||
        (p.id && p.id.toString() === productId.toString()) ||
                         (p.codigo && p.codigo.toString() === productId.toString());
        
        if (matchesId) {
          }
        
        return matchesId;
      });
      
      if (product) {
        userOfferProducts.push(product);;
      } else {
        }
    }

    if (userOfferProducts.length === 0) {
      return [];
    }

    // Obtener IDs para ratings
    const productIdsForRatings = userOfferProducts.map(product => 
      product.id_articulo || product.id || product.codigo
    ).filter(Boolean);

    // Obtener ratings en bulk
    const ratingsCache = await getBulkRatings(productIdsForRatings);

    // Mapear productos
    const mappedProducts = await Promise.all(
      userOfferProducts.map(product => mapApiProductToAppProduct(product, ratingsCache))
    );

    const validProducts = mappedProducts.filter(p => p !== null);;

    return validProducts;

  } catch (error) {
    return [];
  }
};

/**
 * Función inteligente que elige automáticamente entre ofertas con o sin sesión
 */
export const getSmartPromoProducts = async (limit = 0) => {
  try {
    const hasActiveSession = isUserSessionActive();
    
    if (hasActiveSession) {
      return await getPromoProducts(limit);
    } else {
      // Si limit es 0, mostrar todos los productos con descuentos
      return await getExternalPromoProducts(limit);
    }
    
  } catch (error) {
    // Fallback a ofertas externas en caso de error
    return await getExternalPromoProducts(limit);
  }
}; 
