const CHERRY_API_URL = 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/';

// Función para obtener todos los productos
export const getAllProducts = async () => {
  try {
    const response = await fetch(CHERRY_API_URL);
    if (!response.ok) {
      throw new Error('Error al obtener productos');
    }
    const products = await response.json();
    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
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
    console.error('Error getting categories:', error);
    return [];
  }
};

// Función para obtener productos por línea/categoría
export const getProductsByLine = async (lineId) => {
  try {
    const products = await getAllProducts();
    return products.filter(product => product.linea?.id_linea === lineId);
  } catch (error) {
    console.error('Error fetching products by line:', error);
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
    console.error('Error fetching products by line description:', error);
    return [];
  }
};

// Función para mapear productos de la API al formato de la app
export const mapApiProductToAppProduct = (apiProduct) => {
  // Obtener la primera imagen disponible
  let image = apiProduct.imagen || '/images/placeholder.jpg';
  // Si la imagen es relativa, hacerla absoluta
  if (image && !image.startsWith('http')) {
    image = 'https://cherryapi.estrategiadmgs.com.mx/' + image.replace(/^\//, '');
  }
  
  // Calcular precio con descuento si aplica
  const originalPrice = apiProduct.precio1 || 0;
  const discount = apiProduct.desc_promo || 0;
  const finalPrice = discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;
  
  // Obtener colores únicos de los detalles
  const colors = [...new Set(apiProduct.detalles?.map(d => d.nombreColor) || [])];
  
  return {
    id: apiProduct.id_articulo,
    title: apiProduct.descripcion,
    image: image,
    price: finalPrice,
    originalPrice: discount > 0 ? originalPrice : null,
    discount: discount > 0 ? discount : null,
    rating: 5, // Mantener rating por defecto
    description: apiProduct.descripcion,
    brand: apiProduct.marca,
    category: apiProduct.linea?.descripcion || 'Sin categoría',
    colors: colors,
    stock: apiProduct.inventario || 0,
    isActive: apiProduct.activo === 1,
    isNew: apiProduct.opc_nuevo === 'S',
    isPromo: apiProduct.opc_promo === 'S'
  };
};

// Función para obtener productos destacados (activos y con stock)
export const getFeaturedProducts = async (limit = 8) => {
  try {
    const products = await getAllProducts();
    const featured = products
      .filter(product => product.activo === 1 && product.inventario > 0)
      .slice(0, limit)
      .map(mapApiProductToAppProduct);
    return featured;
  } catch (error) {
    console.error('Error fetching featured products:', error);
    return [];
  }
};

// Función para obtener productos nuevos
export const getNewProducts = async (limit = 8) => {
  try {
    const products = await getAllProducts();
    const newProducts = products
      .filter(product => product.opc_nuevo === 'S' && product.activo === 1)
      .slice(0, limit)
      .map(mapApiProductToAppProduct);
    return newProducts;
  } catch (error) {
    console.error('Error fetching new products:', error);
    return [];
  }
};

// Función para obtener productos en promoción
export const getPromoProducts = async (limit = 8) => {
  try {
    const products = await getAllProducts();
    const promoProducts = products
      .filter(product => product.opc_promo === 'S' && product.desc_promo > 0)
      .slice(0, limit)
      .map(mapApiProductToAppProduct);
    return promoProducts;
  } catch (error) {
    console.error('Error fetching promo products:', error);
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
export const getProductsByCategory = async (category) => {
  try {
    // Obtener todos los productos sin mapear para el filtrado
    const rawProducts = await getAllProducts();
    
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
    console.error('❌ Error al obtener productos por categoría:', error);
    return [];
  }
};

// Función para obtener todos los productos y mapearlos al formato de la app
export const fetchProducts = async () => {
  try {
    const products = await getAllProducts();
    return products.map(mapApiProductToAppProduct);
  } catch (error) {
    console.error('Error fetching and mapping products:', error);
    return [];
  }
}; 