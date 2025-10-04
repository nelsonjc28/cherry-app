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
    colors: colors,
    sizes: sizes,
    stock: apiProduct.inventario || apiProduct.stock || 0,
    isActive: apiProduct.activo === 1 || apiProduct.active === true,
    isNew: apiProduct.opc_nuevo === 'S' || apiProduct.is_new === true,
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
    console.log('🔍 getPromoProducts: Iniciando ofertas con sesión activa...');
    
    // Primero obtener productos de la API externa
    const externalProducts = await getExternalPromoProducts(limit);
    console.log(`📊 getPromoProducts: ${externalProducts.length} productos de API externa con desc_promo > 0`);
    
    // Obtener productos con ofertas personalizadas del usuario
    console.log('🎁 getUserOfferProducts: Obteniendo productos con ofertas personalizadas...');
    const userOfferProducts = await getUserOfferProducts();
    console.log(`🎯 getPromoProducts: ${userOfferProducts.length} productos con ofertas personalizadas activas`);
    
    // Combinar productos externos con productos de ofertas personalizadas
    const combinedProducts = [...externalProducts];
    
    // Agregar productos que solo tienen ofertas personalizadas (no están en externos)
    for (const userProduct of userOfferProducts) {
      const existsInExternal = externalProducts.some(extProduct => 
        extProduct.id === userProduct.id || 
        extProduct.codigo === userProduct.codigo ||
        extProduct.id_articulo === userProduct.id_articulo
      );
      
      if (!existsInExternal) {
        console.log(`➕ getPromoProducts: Agregando producto ${userProduct.id} (solo tiene oferta personalizada)`);
        combinedProducts.push(userProduct);
      }
    }
    
    console.log(`🎉 getPromoProducts: COMBINADOS - ${combinedProducts.length} productos únicos (${externalProducts.length} API externa + ${combinedProducts.length - externalProducts.length} solo ofertas personalizadas)`);
    
    if (combinedProducts.length === 0) {
      return [];
    }
    
    // Aplicar ofertas personalizadas a todos los productos
    const { applyUserOffersToProducts } = await import('./userOffers');
    const productsWithUserOffers = await applyUserOffersToProducts(combinedProducts);
    
    // Filtrar solo productos que tienen algún tipo de descuento
    const productsWithDiscounts = productsWithUserOffers.filter(product => {
      const hasExternalDiscount = product.desc_promo && parseFloat(product.desc_promo) > 0;
      const hasUserOffer = product.hasUserOffer;
      const hasCalculatedDiscount = product.discount && parseFloat(product.discount) > 0;
      
      return hasExternalDiscount || hasUserOffer || hasCalculatedDiscount;
    });
    
    console.log(`🔍 getPromoProducts: FILTRADOS - ${productsWithDiscounts.length} productos con descuentos reales`);
    
    // Separar productos con ofertas personalizadas para priorizarlos
    const userOfferProductsFiltered = productsWithDiscounts.filter(product => product.hasUserOffer);
    const otherProducts = productsWithDiscounts.filter(product => !product.hasUserOffer);
    
    console.log(`🎯 getPromoProducts: ${userOfferProductsFiltered.length} productos con ofertas personalizadas pasaron el filtro`);
    
    // Priorizar productos con ofertas personalizadas
    const finalProducts = [...userOfferProductsFiltered, ...otherProducts];
    
    // Limitar al número solicitado
    const limitedProducts = finalProducts.slice(0, limit);
    
    console.log(`🎯 getPromoProducts: ${userOfferProductsFiltered.length} productos con ofertas personalizadas incluidos en el resultado final`);
    console.log(`✅ getPromoProducts: FINAL - ${limitedProducts.length} productos mostrados`);
    
    return limitedProducts;
    
  } catch (error) {
    console.error('❌ getPromoProducts: Error al obtener productos con ofertas personalizadas:', error);
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

    const queryLower = query.toLowerCase().trim();
    const searchTerms = queryLower.split(' ').filter(term => term.length > 0);

    // Filtrar productos que coincidan con la búsqueda
    const filteredProducts = products.filter(product => {
      // Si no hay términos de búsqueda, devolver todos los productos
      if (searchTerms.length === 0) {
        return true;
      }

      // LÓGICA INTELIGENTE DE BÚSQUEDA
      if (searchTerms.length === 1) {
        // UNA PALABRA: Buscar en todos los campos (color, talla, ID, SKU, etc.)
        const singleTerm = searchTerms[0];
        
        return (
          // Búsqueda en descripción/nombre
          (product.descripcion && product.descripcion.toLowerCase().includes(singleTerm)) ||
          (product.marca && product.marca.toLowerCase().includes(singleTerm)) ||
          (product.linea?.descripcion && product.linea.descripcion.toLowerCase().includes(singleTerm)) ||
          (product.sector?.descripcion && product.sector.descripcion.toLowerCase().includes(singleTerm)) ||
          (product.genero?.descripcion && product.genero.descripcion.toLowerCase().includes(singleTerm)) ||
          // Búsqueda en códigos
          (product.DTU && product.DTU.toLowerCase().includes(singleTerm)) ||
          (product.dtu && product.dtu.toLowerCase().includes(singleTerm)) ||
          (product.id_articulo && product.id_articulo.toString().includes(singleTerm)) ||
          (product.sku && product.sku.toLowerCase().includes(singleTerm)) ||
          (product.ean && product.ean.toLowerCase().includes(singleTerm)) ||
          // Búsqueda en especificaciones y notas
          (product.especificaciones && product.especificaciones.toLowerCase().includes(singleTerm)) ||
          (product.notas && product.notas.toLowerCase().includes(singleTerm)) ||
          // Búsqueda en colores
          product.detalles?.some(d => 
            d.nombreColor?.toLowerCase().includes(singleTerm) ||
            d.codigoColor?.toLowerCase().includes(singleTerm)
          ) ||
          // Búsqueda en tallas
          product.detalles?.some(d => 
            d.detalle?.toLowerCase().includes(singleTerm)
          )
        );
      } else {
        // MÚLTIPLES PALABRAS: Buscar principalmente en nombre/descripción del producto
        const productName = (product.descripcion || '').toLowerCase();
        const productBrand = (product.marca || '').toLowerCase();
        const productCategory = (product.linea?.descripcion || '').toLowerCase();
        
        // Crear texto combinado del nombre del producto
        const productText = `${productName} ${productBrand} ${productCategory}`.trim();
        
        // Verificar si TODAS las palabras están en el nombre del producto
        const allTermsInName = searchTerms.every(term => 
          productText.includes(term)
        );
        
        // Si todas las palabras están en el nombre, es una coincidencia fuerte
        if (allTermsInName) {
          return true;
        }
        
        // Si no, buscar en descripción específicamente
        const descriptionMatch = searchTerms.every(term => 
          productName.includes(term)
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
    const validProducts = mappedProducts.filter(p => p !== null);
    
    console.log('🔍 DEBUG searchProductsAdvanced - Productos finales mapeados:', validProducts.length);
    if (validProducts.length > 0) {
      console.log('🔍 DEBUG searchProductsAdvanced - Primer producto mapeado:', validProducts[0]);
      console.log('🔍 DEBUG searchProductsAdvanced - Colores del primer producto:', validProducts[0].colors);
      console.log('🔍 DEBUG searchProductsAdvanced - Tallas del primer producto:', validProducts[0].sizes);
      console.log('🔍 DEBUG searchProductsAdvanced - Detalles del primer producto:', validProducts[0].detalles);
    }
    
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

/**
 * Obtener los productos más vendidos del mes actual
 */
export const getTopSellingProducts = async (limit = 20) => {
  try {
    
    // Obtener IDs de productos más vendidos del backend
    const response = await fetch('/api/featured/top-selling-products?limit=' + limit);
    
    if (!response.ok) {
      console.log('❌ getTopSellingProducts: Error en respuesta del backend:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data.product_ids || data.data.product_ids.length === 0) {
      console.log('🔍 getTopSellingProducts: No hay productos más vendidos este mes');
      return [];
    }
    
    const productIds = data.data.product_ids;
    
    // Obtener datos completos de la API externa
    const apiResponse = await axios.get(CHERRY_API_URL);
    const apiData = apiResponse.data;
    
    let allApiProducts = [];
    if (Array.isArray(apiData)) {
      allApiProducts = apiData;
    } else if (apiData && apiData.productos && Array.isArray(apiData.productos)) {
      allApiProducts = apiData.productos;
    }
    
    // Filtrar y ordenar productos según el ranking de ventas
    const topSellingProducts = [];
    
    for (const productId of productIds) {
      const product = allApiProducts.find(p => 
        (p.id_articulo && p.id_articulo.toString() === productId.toString()) ||
        (p.id && p.id.toString() === productId.toString()) ||
        (p.codigo && p.codigo.toString() === productId.toString())
      );
      
      if (product) {
        topSellingProducts.push(product);
      }
    }
    
    
    if (topSellingProducts.length === 0) {
      return [];
    }
    
    // Obtener IDs para ratings
    const productIdsForRatings = topSellingProducts.map(product => 
      product.id_articulo || product.id || product.codigo
    ).filter(Boolean);
    
    // Obtener ratings en bulk
    const ratingsCache = await getBulkRatings(productIdsForRatings);
    
    // Mapear productos manteniendo el orden de ventas
    const mappedProducts = await Promise.all(
      topSellingProducts.map(product => mapApiProductToAppProduct(product, ratingsCache))
    );
    
    const validProducts = mappedProducts.filter(p => p !== null);
    
    return validProducts;
    
  } catch (error) {
    console.error('❌ getTopSellingProducts: Error al obtener productos más vendidos:', error);
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
    console.error('❌ isUserSessionActive: Error al verificar sesión:', error);
    return false;
  }
};

/**
 * Obtener productos promocionales externos (sin ofertas personalizadas)
 */
export const getExternalPromoProducts = async (limit = 50) => {
  try {
    console.log('🔓 getExternalPromoProducts: PRODUCTOS SOLO DE API EXTERNA (sin ofertas personalizadas)');
    
    const response = await axios.get(CHERRY_API_URL);
    const data = response.data;
    
    let allProducts = [];
    if (Array.isArray(data)) {
      allProducts = data;
    } else if (data && data.productos && Array.isArray(data.productos)) {
      allProducts = data.productos;
    } else {
      console.log('❌ getExternalPromoProducts: No se encontraron productos en la API');
      return [];
    }

    console.log(`📊 getExternalPromoProducts: ${allProducts.length} productos recibidos de la API`);

    // Filtrar productos con desc_promo > 0 (ofertas reales de la API externa)
    const promoProducts = allProducts.filter(product => {
      const hasPromoDiscount = product.desc_promo && parseFloat(product.desc_promo) > 0;
      const isWebEnabled = product.opc_web === 'S';
      
      return hasPromoDiscount && isWebEnabled;
    });

    console.log(`🎯 getExternalPromoProducts: ${promoProducts.length} productos con desc_promo > 0`);

    // Si no hay productos con desc_promo, usar productos con opc_promo = 'S'
    let finalProducts = promoProducts;
    if (finalProducts.length === 0) {
      console.log('🔍 getExternalPromoProducts: No hay productos con desc_promo, buscando opc_promo = "S"');
      
      finalProducts = allProducts.filter(product => {
        const hasPromoOption = product.opc_promo === 'S';
        const isWebEnabled = product.opc_web === 'S';
        
        return hasPromoOption && isWebEnabled;
      });

      console.log(`🎯 getExternalPromoProducts: ${finalProducts.length} productos con opc_promo = "S"`);
    }

    if (finalProducts.length === 0) {
      console.log('❌ getExternalPromoProducts: No se encontraron productos promocionales');
      return [];
    }

    // Mezclar y limitar
    const shuffled = finalProducts.sort(() => 0.5 - Math.random());
    const selectedProducts = shuffled.slice(0, limit);

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

    const validProducts = mappedProducts.filter(p => p !== null);
    console.log(`🎉 getExternalPromoProducts: FINAL - ${validProducts.length} productos SOLO de API externa`);

    return validProducts;

  } catch (error) {
    console.error('❌ getExternalPromoProducts: Error al obtener productos externos:', error);
    return [];
  }
};

/**
 * Obtener productos que tienen ofertas personalizadas activas para el usuario
 */
export const getUserOfferProducts = async () => {
  try {
    // Verificar si hay sesión activa
    if (!isUserSessionActive()) {
      console.log('❌ getUserOfferProducts: No hay sesión activa');
      return [];
    }

    console.log('🔍 getUserOfferProducts: Obteniendo IDs de productos con ofertas...');
    
    // Obtener IDs de productos con ofertas personalizadas del backend
    const response = await fetch('/api/user-offer-products');
    
    if (!response.ok) {
      console.log('❌ getUserOfferProducts: Error en respuesta del backend:', response.status);
      return [];
    }

    console.log('🔍 getUserOfferProducts: Respuesta del endpoint:', { status: response.status, ok: response.ok });

    const data = await response.json();
    
    console.log('📋 getUserOfferProducts: Datos recibidos:', data);

    if (!data.success || !data.product_ids || data.product_ids.length === 0) {
      console.log('🔍 getUserOfferProducts: No hay productos con ofertas personalizadas');
      return [];
    }

    const productIds = data.product_ids;
    console.log(`📋 getUserOfferProducts: ${productIds.length} productos con ofertas encontrados`);

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
    const userOfferProducts = [];
    
    for (const productId of productIds) {
      const product = allApiProducts.find(p => 
        (p.id_articulo && p.id_articulo.toString() === productId.toString()) ||
        (p.id && p.id.toString() === productId.toString()) ||
        (p.codigo && p.codigo.toString() === productId.toString())
      );
      
      if (product) {
        userOfferProducts.push(product);
      }
    }

    console.log(`🎯 getUserOfferProducts: ${userOfferProducts.length} productos encontrados en API externa`);

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

    const validProducts = mappedProducts.filter(p => p !== null);
    console.log(`✅ getUserOfferProducts: ${validProducts.length} productos con ofertas personalizadas mapeados`);

    return validProducts;

  } catch (error) {
    console.error('❌ getUserOfferProducts: Error al obtener productos con ofertas:', error);
    return [];
  }
};

/**
 * Función inteligente que elige automáticamente entre ofertas con o sin sesión
 */
export const getSmartPromoProducts = async (limit = 50) => {
  try {
    const hasActiveSession = isUserSessionActive();
    
    console.log(`🤖 getSmartPromoProducts: Modo inteligente - Sesión ${hasActiveSession ? 'ACTIVA' : 'INACTIVA'}`);
    
    if (hasActiveSession) {
      console.log('🔐 getSmartPromoProducts: Sesión activa detectada - usando ofertas personalizadas');
      return await getPromoProducts(limit);
    } else {
      console.log('🔓 getSmartPromoProducts: Sin sesión - usando ofertas externas únicamente');
      return await getExternalPromoProducts(limit);
    }
    
  } catch (error) {
    console.error('❌ getSmartPromoProducts: Error en función inteligente:', error);
    // Fallback a ofertas externas en caso de error
    return await getExternalPromoProducts(limit);
  }
}; 
