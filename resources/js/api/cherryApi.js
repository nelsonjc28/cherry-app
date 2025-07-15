const CHERRY_API_URL = 'https://cherryapi.estrategiadmgs.com.mx/cherryApi/';

// Mapeo de catálogos a parámetros de la API
const CATALOG_MAPPING = {
  'Cherry 2025 - 2026': { season: '2025-2026', active: true },
  'Cherry 2024 - 2025': { season: '2024-2025', active: true },
  'Cherry 2023 - 2024': { season: '2023-2024', active: false }
};

// Función para obtener todos los productos
export const getAllProducts = async (catalog = 'Cherry 2025 - 2026') => {
  try {
    const response = await fetch(CHERRY_API_URL);
    if (!response.ok) {
      throw new Error('Error al obtener productos');
    }
    const products = await response.json();
    
    // Filtrar productos por catálogo si es necesario
    if (catalog && catalog !== 'Cherry 2025 - 2026') {
      const catalogConfig = CATALOG_MAPPING[catalog];
      if (catalogConfig) {
        // Filtrar por temporada o estado activo
        const filteredProducts = products.filter(product => {
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
    isPromo: apiProduct.opc_promo === 'S',
    codigo: apiProduct.id_articulo,
    dtu: apiProduct.DTU || apiProduct.dtu
  };
};

// Función para obtener productos destacados
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
    console.error('❌ Error al obtener productos por categoría:', error);
    return [];
  }
};

// Función para obtener todos los productos y mapearlos al formato de la app
export const fetchProducts = async (catalog = 'Cherry 2025 - 2026') => {
  try {
    const products = await getAllProducts(catalog);
    return products.map(mapApiProductToAppProduct);
  } catch (error) {
    console.error('Error fetching and mapping products:', error);
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
    console.error('Error fetching products by availability:', error);
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
      // Crear un texto de búsqueda que incluya todos los campos relevantes
      const searchText = [
        product.descripcion || '',
        product.marca || '',
        product.linea?.descripcion || '',
        product.DTU || product.dtu || '',
        product.id_articulo?.toString() || '',
        // Incluir colores de los detalles
        ...(product.detalles?.map(d => d.nombreColor) || []),
        // Incluir códigos de color
        ...(product.detalles?.map(d => d.codigoColor) || [])
      ].join(' ').toLowerCase();

      // Verificar si todos los términos de búsqueda están presentes
      const allTermsMatch = searchTerms.every(term => {
        return searchText.includes(term) || 
               product.descripcion?.toLowerCase().includes(term) ||
               product.marca?.toLowerCase().includes(term) ||
               product.linea?.descripcion?.toLowerCase().includes(term) ||
               (product.DTU && product.DTU.toLowerCase().includes(term)) ||
               (product.dtu && product.dtu.toLowerCase().includes(term)) ||
               (product.id_articulo && product.id_articulo.toString().includes(term));
      });

      return allTermsMatch;
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
        return productCategory.includes(categoryLower) || 
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
    console.error('Error en búsqueda avanzada:', error);
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
    console.error('Error obteniendo colores disponibles:', error);
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
    console.error('Error obteniendo categorías disponibles:', error);
    return [];
  }
}; 