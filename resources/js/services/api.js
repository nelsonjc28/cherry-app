import axios from 'axios';

// Configuración base de axios
const api = axios.create({
  baseURL: '/api',
  // NO establecer Content-Type por defecto para permitir FormData
});

// Interceptor para agregar el token de autenticación
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    // NO agregar token a rutas públicas específicas
    const publicRoutes = [
      '/public/',
      '/home-catalogs',
      '/home-categories',
      '/categories',
      '/welcome-sections',
      '/contact-info',
      '/privacy-policy',
      '/terms-conditions'
    ];
    
    // Rutas que necesitan autenticación opcional (enviar token si existe, pero no requerirlo)
    const optionalAuthRoutes = [
      '/products/with-offers', // Necesita token para ofertas personalizadas, pero funciona sin él
      '/products/search', // Necesita token para ofertas personalizadas, pero funciona sin él
      '/products/top-selling' // Puede necesitar token para personalización
    ];
    
    // Verificar si es una ruta con autenticación opcional
    const isOptionalAuthRoute = optionalAuthRoutes.some(route => config.url.includes(route));
    
    // Rutas públicas exactas (sin incluir admin)
    const exactPublicRoutes = [
      '/catalogs',
      '/catalogs-with-images'
    ];
    
    // Rutas públicas específicas (solo GET)
    const catalogPublicRoutes = [
      /^\/catalogs\/\d+$/, // GET /catalogs/{id}
      /^\/catalogs\/\d+\/products$/, // GET /catalogs/{id}/products
      /^\/catalogs\/\d+\/pdfs/, // GET /catalogs/{id}/pdfs
      /^\/catalogs\/\d+\/image-groups$/, // GET /catalogs/{id}/image-groups
      /^\/catalogs\/\d+\/image-groups\/\d+\/images/ // GET /catalogs/{id}/image-groups/{groupId}/images
    ];
    
    const isPublicCatalogRoute = catalogPublicRoutes.some(pattern => 
      pattern.test(config.url) && config.method.toLowerCase() === 'get'
    );
    
    // Verificar rutas públicas con más precisión
    // IMPORTANTE: Las rutas admin NUNCA son públicas, incluso si contienen palabras públicas
    const isAdminRoute = config.url.includes('/admin/');
    
    const isBasicPublicRoute = !isAdminRoute && publicRoutes.some(route => config.url.includes(route));
    const isExactPublicRoute = !isAdminRoute && exactPublicRoutes.some(route => config.url === route);
    
    const isPublicRoute = isBasicPublicRoute || isExactPublicRoute || isPublicCatalogRoute;
    
    // Para rutas con autenticación opcional, siempre enviar token si existe
    // Para otras rutas, solo enviar token si la ruta no es pública
    const shouldSendTokenForRoute = isOptionalAuthRoute || !isPublicRoute;
    
    // Solo agregar token si existe, la ruta permite token Y el token es válido
    if (token && shouldSendTokenForRoute) {
      // Intentar verificar si el token no ha expirado antes de enviarlo
      let shouldSendToken = true;
      
      try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        // Si el token ha expirado, no lo enviamos y lo eliminamos
        if (tokenData.exp && tokenData.exp < currentTime) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          shouldSendToken = false;
        }
      } catch (error) {
        // Si hay error al parsear el token, aún así lo enviamos
        // El servidor decidirá si es válido o no
      }
      
      // Enviar token si debe enviarse
      if (shouldSendToken) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // NO establecer Content-Type si es FormData
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // NO redirigir automáticamente para rutas públicas
    // IMPORTANTE: Las rutas admin NUNCA son públicas
    const isAdminRoute = error.config?.url?.includes('/admin/');
    
    const isPublicRoute = !isAdminRoute && (
                         error.config?.url?.includes('/public/') ||
                         (error.config?.url?.includes('/catalogs') && !error.config?.url?.includes('/admin/')) ||
                         error.config?.url?.includes('/categories') ||
                         error.config?.url?.includes('/welcome-sections') ||
                         error.config?.url?.includes('/contact-info') ||
                         error.config?.url?.includes('/privacy-policy') ||
                         error.config?.url?.includes('/home-catalogs') ||
                         error.config?.url?.includes('/home-categories') ||
                         error.config?.url?.includes('/terms-conditions')
                       );
    
    // Manejar casos específicos de error
    if (error.response) {
      // Verificar si es una respuesta offline (del Service Worker)
      const isOfflineResponse = error.response.data?.offline === true && 
                                error.response.data?.success === false;
      
      // Verificar si es una petición de notificaciones para no mostrar toasts de error
      const isNotificationRequest = error.config?.url?.includes('/notifications') || 
                                     error.config?.url?.includes('/admin/notifications');
      
      // Si es una respuesta offline, no mostrar ningún toast de error
      if (isOfflineResponse) {
        return Promise.reject(error);
      }
      
      switch (error.response.status) {
        case 401:
          // Token expirado o inválido - solo redirigir si NO es una ruta pública
          // NO mostrar mensaje de error para evitar múltiples toasts cuando la sesión expira
          if (!isPublicRoute) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          } else {
            // Para rutas públicas con error 401, limpiar token inválido y reintentar
            if (localStorage.getItem('token')) {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              // Reintentar la petición sin token
              return api.request(error.config);
            }
          }
          // Retornar sin rechazar para evitar que otros interceptores manejen este error
          return Promise.reject(error);
        case 403:
          // Acceso denegado
          if (window.showToast && !isNotificationRequest) {
            window.showToast('Acceso denegado: No tienes permisos para realizar esta acción', 'error');
          }
          break;
        case 404:
          // Recurso no encontrado
          if (window.showToast && !isNotificationRequest) {
            window.showToast('Recurso no encontrado', 'error');
          }
          break;
        case 422:
          // Error de validación
          if (window.showToast && error.response.data?.message && !isNotificationRequest) {
            window.showToast(error.response.data.message, 'error');
          }
          break;
        case 500:
          // Error interno del servidor - no mostrar para notificaciones
          if (window.showToast && !isNotificationRequest) {
            window.showToast('Error interno del servidor', 'error');
          }
          break;
        default:
          // No mostrar mensaje de error para códigos 401 que ya fueron manejados
          if (error.response?.status === 401) {
            return Promise.reject(error);
          }
          if (window.showToast && !isNotificationRequest) {
            window.showToast('Error del servidor', 'error');
          }
          break;
      }
    } else if (error.request) {
      // La petición fue hecha pero no se recibió respuesta
      // Verificar si es una petición de notificaciones para no mostrar toasts
      const isNotificationRequest = error.config?.url?.includes('/notifications') || 
                                     error.config?.url?.includes('/admin/notifications');
      
      // Solo mostrar este mensaje en casos específicos o no mostrarlo
      // if (window.showToast && !isNotificationRequest) {
      //   window.showToast('No se recibió respuesta del servidor', 'error');
      // }
    } else {
      // Algo sucedió al configurar la petición
      // Verificar si es una petición de notificaciones para no mostrar toasts
      const isNotificationRequest = error.config?.url?.includes('/notifications') || 
                                     error.config?.url?.includes('/admin/notifications');
      
      if (window.showToast && !isNotificationRequest) {
        window.showToast('Error al configurar la petición', 'error');
      }
    }
    
    return Promise.reject(error);
  }
);

// Servicios específicos para welcome sections

// Servicios para ofertas de catálogos
export const catalogOfferService = {
  // Obtener todas las ofertas
  getAll: async () => {
    try {
      const response = await api.get('/admin/catalog-offers');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener una oferta específica
  getById: async (id) => {
    try {
      const response = await api.get(`/admin/catalog-offers/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Crear una nueva oferta
  create: async (offerData) => {
    try {
      const response = await api.post('/admin/catalog-offers', offerData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Actualizar una oferta existente
  update: async (id, offerData) => {
    try {
      const response = await api.post(`/admin/catalog-offers/${id}`, offerData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Eliminar una oferta
  delete: async (id) => {
    try {
      const response = await api.delete(`/admin/catalog-offers/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Cambiar estado de una oferta
  toggleStatus: async (id) => {
    try {
      const response = await api.patch(`/admin/catalog-offers/${id}/toggle`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Reordenar ofertas
  reorder: async (offers) => {
    try {
      const response = await api.post('/admin/catalog-offers/reorder', { offers });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener todas las ofertas activas (público, sin autenticación)
  getActiveOffers: async () => {
    try {
      const response = await api.get('/active-offers');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener ofertas por catálogo
  getByCatalog: async (catalogId) => {
    try {
      const response = await api.get(`/admin/catalogs/${catalogId}/offers`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};
export const welcomeSectionService = {
  // Obtener todas las secciones (admin)
  getAll: async () => {
    try {
      const response = await api.get('/admin/welcome-sections');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener una sección específica (admin)
  getById: async (id) => {
    try {
      const response = await api.get(`/admin/welcome-sections/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Crear nueva sección (admin)
  create: async (formData) => {
    try {
      // Validar que formData sea una instancia de FormData
      if (!(formData instanceof FormData)) {
        throw new Error('Los datos deben ser enviados como FormData');
      }

      const response = await api.post('/admin/welcome-sections', formData, {
        headers: {
          'Accept': 'application/json',
        },

      });

      return response;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  // Actualizar sección (admin)
  update: async (id, formData) => {
    try {
      // Validar que formData sea una instancia de FormData
      if (!(formData instanceof FormData)) {
        throw new Error('Los datos deben ser enviados como FormData');
      }

      const response = await api.post(`/admin/welcome-sections/${id}`, formData, {
        headers: {
          'Accept': 'application/json',
        },

      });

      return response;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  // Crear o actualizar sección (admin) - método unificado
  createOrUpdate: async (editingSection, formData, imageFile) => {
    try {
    const formDataObj = new FormData();

      // Agregar campos del formulario
      if (formData.title) formDataObj.append('title', formData.title.trim());
      if (formData.subtitle) formDataObj.append('subtitle', formData.subtitle.trim());
      if (formData.button_text) formDataObj.append('button_text', formData.button_text.trim());
      if (formData.button_url) formDataObj.append('button_url', formData.button_url.trim());
      if (formData.is_active !== undefined) formDataObj.append('is_active', formData.is_active ? '1' : '0');
      if (formData.display_order !== undefined) formDataObj.append('display_order', formData.display_order.toString());

      // Agregar imagen si existe
    if (imageFile) {
      formDataObj.append('image', imageFile);
    }

      let response;
    if (editingSection) {
        // Actualizar sección existente
        response = await api.post(`/admin/welcome-sections/${editingSection.id}`, formDataObj, {
          headers: {
            'Accept': 'application/json',
          },

        });
    } else {
        // Crear nueva sección
        response = await api.post('/admin/welcome-sections', formDataObj, {
          headers: {
            'Accept': 'application/json',
          },

        });
      }

      return response;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  // Eliminar sección (admin)
  delete: async (id) => {
    try {
      const response = await api.delete(`/admin/welcome-sections/${id}`, {
        headers: {
          'Accept': 'application/json',
        },
 // 15 segundos para eliminación
      });
      return response;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  // Cambiar estado de sección (admin)
  toggleStatus: async (id) => {
    try {
      const response = await api.patch(`/admin/welcome-sections/${id}/toggle`, {}, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },

      });
      return response;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  // Obtener sección activa (público)
  getActive: async () => {
    try {
      const response = await api.get('/welcome-sections/active', {
 // 10 segundos para consultas públicas
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener todas las secciones activas (público)
  getActiveSections: async () => {
    try {
      const response = await api.get('/welcome-sections', {
 // 10 segundos para consultas públicas
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener secciones por orden de visualización
  getByDisplayOrder: async (order = 'asc') => {
    try {
      const response = await api.get('/admin/welcome-sections', {
        params: { order },

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Buscar secciones por título
  searchByTitle: async (searchTerm) => {
    try {
      const response = await api.get('/admin/welcome-sections', {
        params: { search: searchTerm },

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener estadísticas de secciones
  getStats: async () => {
    try {
      const response = await api.get('/admin/welcome-sections/stats', {

      });
      return response;
    } catch (error) {
      throw error;
    }
  },
};

// Servicios públicos para catálogos (sin autenticación requerida)
export const publicCatalogService = {
  // Obtener todos los catálogos públicos
  getAll: async () => {
    try {
      const response = await api.get('/catalogs', {

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener un catálogo público específico
  getById: async (id) => {
    try {
      const response = await api.get(`/catalogs/${id}`, {

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener productos de un catálogo público específico
  getProducts: async (id) => {
    try {
      const response = await api.get(`/catalogs/${id}/products`, {

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener imágenes de un catálogo público específico (con paginación)
  getCatalogImages: async (id, page = 1) => {
    try {
      const response = await api.get(`/catalogs/${id}/pdfs?page=${page}`, {

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener todos los catálogos con imágenes para selección
  getCatalogsWithImages: async () => {
    try {
      const response = await api.get('/public/catalogs-with-images', {

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener grupos de imágenes de un catálogo
  getCatalogImageGroups: async (catalogId) => {
    try {
      const response = await api.get(`/catalogs/${catalogId}/image-groups`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener imágenes de un grupo específico
  getImageGroupImages: async (catalogId, groupId, page = 1) => {
    try {
      const response = await api.get(`/catalogs/${catalogId}/image-groups/${groupId}/images?page=${page}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Crear un nuevo grupo de imágenes
  createImageGroup: async (catalogId, groupData) => {
    try {
      const response = await api.post(`/catalogs/${catalogId}/image-groups`, groupData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Mantener compatibilidad con el nombre anterior
  getPdfs: async (id, page = 1) => {
    return publicCatalogService.getCatalogImages(id, page);
  }
};

// Servicios públicos para categorías (sin autenticación requerida)
export const publicCategoryService = {
  // Obtener todas las categorías públicas
  getAll: async () => {
    try {
      const response = await api.get('/categories', {

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener una categoría pública específica
  getBySlug: async (slug) => {
    try {
      const response = await api.get(`/categories/${slug}`, {

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener productos de una categoría pública específica
  getProducts: async (slug) => {
    try {
      const response = await api.get(`/categories/${slug}/products`, {

      });
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// Servicios para categorías
export const categoryService = {
  getAll: async () => {
    try {
      const response = await api.get('/admin/categories', {

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/admin/categories/${id}`, {

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  create: async (data) => {
    try {
      const response = await api.post('/admin/categories', data, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  update: async (id, data) => {
    try {
      const response = await api.post(`/admin/categories/${id}`, data, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/admin/categories/${id}`, {

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  toggleStatus: async (id) => {
    try {
      const response = await api.patch(`/admin/categories/${id}/toggle`, {}, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  getBySlug: async (slug) => {
    try {
      const response = await api.get(`/categories/${slug}`, {

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener IDs de productos que están en categorías (admin)
  getCategoryProductIds: async () => {
    try {
      const response = await api.get('/admin/categories/category-product-ids');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Agregar productos a una categoría
  addProductsToCategory: async (categoryId, products) => {
    try {
      const response = await api.post(`/admin/categories/${categoryId}/products`, { products });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Remover producto de una categoría
  removeProductFromCategory: async (categoryId, productId) => {
    try {
      const response = await api.delete(`/admin/categories/${categoryId}/products/${productId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener productos de una categoría
  getCategoryProducts: async (categoryId) => {
    try {
      const response = await api.get(`/admin/categories/${categoryId}/products`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Reordenar productos de una categoría
  reorderCategoryProducts: async (categoryId, products) => {
    try {
      const response = await api.post(`/admin/categories/${categoryId}/reorder-products`, { products });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener categorías del menú
  getMenuCategories: async () => {
    try {
      const response = await api.get('/admin/menu-categories');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Actualizar orden de categorías del menú
  updateMenuOrder: async (categoryIds) => {
    try {
      const response = await api.post('/admin/menu-categories/update-order', { categoryIds });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Agregar categoría al menú
  addCategoryToMenu: async (categoryId) => {
    try {
      const response = await api.post('/admin/menu-categories', { category_id: categoryId });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Remover categoría del menú
  removeCategoryFromMenu: async (categoryId) => {
    try {
      const response = await api.delete(`/admin/menu-categories/${categoryId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },
};

// Servicios para favoritos
export const favoriteService = {
  getAll: async (signal) => {
    try {
      const response = await api.get('/favorites', {
 // 10 segundos
        signal: signal,
      });
      return response;
    } catch (error) {
      // En caso de error, retornar respuesta con array vacío
      return {
        data: {
          success: true,
          favorite_product_ids: []
        }
      };
    }
  },

  add: async (data) => {
    try {
      const response = await api.post('/favorites', data, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },

      });
      return response;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  check: async (productId) => {
    try {
      const response = await api.post('/favorites/check', { product_id: productId }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  toggle: async (data) => {
    try {
      const response = await api.post('/favorites/toggle', data, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },

      });
      return response;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  remove: async (productId) => {
    try {
      const response = await api.delete('/favorites', {
        data: { product_id: productId },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },

      });
      return response;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },
};

// Servicios para ratings
export const ratingService = {
  getUserRating: async () => {
    try {
      const response = await api.get('/ratings/user', {

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  add: async (data) => {
    try {
      const response = await api.post('/ratings', data, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },

      });
      return response;
    } catch (error) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  checkUserRating: async (productId) => {
    try {
      const response = await api.post('/ratings/check', { product_id: productId }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  getProductRatings: async (productId) => {
    try {
      const response = await api.get('/ratings/product', {
        params: { product_id: productId },

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  getBulkRatings: async (productIds) => {
    try {
      const response = await api.post('/ratings/bulk', { product_ids: productIds }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },

      });
      return response;
    } catch (error) {
      throw error;
    }
  },
};

// Servicios específicos para catálogos
export const catalogService = {
  // Obtener todos los catálogos (admin)
  getAll: async () => {
    try {
      const response = await api.get('/admin/catalogs');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener un catálogo específico (admin)
  getById: async (id) => {
    try {
      const response = await api.get(`/admin/catalogs/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Crear un nuevo catálogo (admin)
  create: async (formData) => {
    try {
      const response = await api.post('/admin/catalogs', formData, {
        headers: {
          'Accept': 'application/json',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Actualizar un catálogo existente (admin)
  update: async (id, formData) => {
    try {
      const response = await api.post(`/admin/catalogs/${id}`, formData, {
        headers: {
          'Accept': 'application/json',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Eliminar un catálogo (admin)
  delete: async (id) => {
    try {
      const response = await api.delete(`/admin/catalogs/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Cambiar estado activo/inactivo (admin)
  toggleStatus: async (id) => {
    try {
      const response = await api.patch(`/admin/catalogs/${id}/toggle`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Actualizar solo el orden de visualización (admin)
  updateOrder: async (id, displayOrder) => {
    try {
      const response = await api.patch(`/admin/catalogs/${id}/order`, { display_order: displayOrder });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Agregar PDFs al catálogo (admin)
  addPdfs: async (id, formData) => {
    try {
      const response = await api.post(`/admin/catalogs/${id}/pdfs`, formData, {

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Eliminar PDF del catálogo (admin)
  removePdf: async (catalogId, pdfId) => {
    try {
      const response = await api.delete(`/admin/catalogs/${catalogId}/pdfs/${pdfId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Reordenar PDFs del catálogo (admin)
  reorderPdfs: async (id, reorderData) => {
    try {
      const response = await api.patch(`/admin/catalogs/${id}/reorder`, reorderData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Agregar productos al catálogo (admin)
  addProducts: async (id, products) => {
    try {
      const response = await api.post(`/admin/catalogs/${id}/products`, { products }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Eliminar producto del catálogo (admin)
  removeProduct: async (catalogId, productId) => {
    try {
      const response = await api.delete(`/admin/catalogs/${catalogId}/products/${productId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener IDs de productos que están en catálogos (admin)
  getCatalogProductIds: async () => {
    try {
      const response = await api.get('/admin/catalogs/catalog-product-ids');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener productos de un catálogo específico
  getCatalogProducts: async (catalogId) => {
    try {
      const response = await api.get(`/admin/catalogs/${catalogId}/products`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener IDs de productos que están en categorías (admin)
  getCategoryProductIds: async () => {
    try {
      const response = await api.get('/admin/categories/category-product-ids');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Agregar productos a una categoría
  addProductsToCategory: async (categoryId, products) => {
    try {
      const response = await api.post(`/admin/categories/${categoryId}/products`, { products });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Remover producto de una categoría
  removeProductFromCategory: async (categoryId, productId) => {
    try {
      const response = await api.delete(`/admin/categories/${categoryId}/products/${productId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener productos de una categoría
  getCategoryProducts: async (categoryId) => {
    try {
      const response = await api.get(`/admin/categories/${categoryId}/products`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Reordenar productos de una categoría
  reorderCategoryProducts: async (categoryId, products) => {
    try {
      const response = await api.post(`/admin/categories/${categoryId}/reorder-products`, { products });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Filtrar productos disponibles basándose en una lista externa
  filterAvailableProducts: async (products) => {
    try {
      const response = await api.post('/admin/catalogs/filter-available-products', { products });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Reordenar elementos del catálogo (admin)
  reorder: async (id, type, items) => {
    try {
      const response = await api.post(`/admin/catalogs/${id}/reorder`, { type, items }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },

      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Eliminar grupo de imágenes (admin)
  deleteImageGroup: async (catalogId, groupId) => {
    try {
      const response = await api.delete(`/admin/catalogs/${catalogId}/image-groups/${groupId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Cambiar estado de grupo de imágenes (admin)
  toggleImageGroupStatus: async (catalogId, groupId) => {
    try {
      const response = await api.patch(`/admin/catalogs/${catalogId}/image-groups/${groupId}/toggle`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Subir PDF a un grupo de imágenes (admin)
  uploadGroupPdf: async (catalogId, groupId, formData) => {
    try {
      const response = await api.post(`/admin/catalogs/${catalogId}/image-groups/${groupId}/upload-pdf`, formData, {
        headers: {
          'Accept': 'application/json',
        },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Subir PDF directamente al catálogo (admin)
  uploadCatalogPdf: async (catalogId, formData) => {
    try {
      const response = await api.post(`/admin/catalogs/${catalogId}/upload-pdf`, formData, {
        headers: {
          'Accept': 'application/json',
        },
      });
      return response;
    } catch (error) {
      throw error;
    }
  },
};

// Servicio de autenticación
export const authService = {
  // Extender la sesión del usuario
  extendSession: async () => {
    try {
      const response = await api.post('/auth/extend-session');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Verificar si el token está activo
  checkToken: async () => {
    try {
      const response = await api.get('/auth/check-token');
      return response;
    } catch (error) {
      throw error;
    }
  },
};

// Utilidades para FormData
export const formDataUtils = {
  // Crear FormData desde un objeto de datos
  createFromObject: (data, options = {}) => {
    const formData = new FormData();
    
    Object.keys(data).forEach(key => {
      let value = data[key];
      
      // Saltar campos undefined o null
      if (value === undefined || value === null) {
        return;
      }
      
      // Convertir booleanos a string
      if (typeof value === 'boolean') {
        value = value ? '1' : '0';
      }
      
      // Convertir números a string
      if (typeof value === 'number') {
        value = value.toString();
      }
      
      // Truncar strings si se especifica
      if (typeof value === 'string' && options.trim !== false) {
        value = value.trim();
      }
      
      // Saltar strings vacíos si se especifica
      if (typeof value === 'string' && value === '' && options.skipEmpty !== false) {
        return;
      }
      
      formData.append(key, value);
    });
    
    return formData;
  },

  // Validar que un FormData contenga campos requeridos
  validateRequired: (formData, requiredFields) => {
    const missingFields = [];
    
    requiredFields.forEach(field => {
      if (!formData.has(field) || formData.get(field) === '') {
        missingFields.push(field);
      }
    });
    
    if (missingFields.length > 0) {
      throw new Error(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
    }
    
    return true;
  },

  // Debug: mostrar contenido de FormData (solo en desarrollo)
  debug: (formData, label = 'FormData') => {
    if (process.env.NODE_ENV === 'development') {
      // Debug silencioso en producción
    }
  }
};

// Servicios para órdenes del usuario
export const orderService = {
  // Obtener todas las órdenes del usuario autenticado
  getUserOrders: async () => {
    try {
      const response = await api.get('/orders');
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// Servicios para administración de órdenes
export const adminOrderService = {
  // Obtener todas las órdenes (admin)
  getAllOrders: async () => {
    try {
      const response = await api.get('/admin/orders');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Actualizar estado de orden (admin)
  updateOrderStatus: async (orderId, status) => {
    try {
      const response = await api.put(`/admin/orders/${orderId}/status`, { status });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener detalles de orden específica (admin)
  getOrderDetails: async (orderId) => {
    try {
      const response = await api.get(`/admin/orders/${orderId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Marcar orden a crédito como pagada (admin)
  markCreditOrderAsPaid: async (orderId) => {
    try {
      const response = await api.post(`/admin/orders/${orderId}/mark-credit-paid`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Reenvío manual a API externa de ventas (admin)
  resendToExternalApi: async (orderId) => {
    try {
      const response = await api.post(`/admin/orders/${orderId}/resend-external-api`);
      return response;
    } catch (error) {
      throw error;
    }
  },
};

// Servicios para notificaciones del admin
export const adminNotificationService = {
  // Obtener notificaciones del admin
  getAdminNotifications: async () => {
    try {
      const response = await api.get('/admin/notifications');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Marcar notificación como leída
  markAsRead: async (notificationId) => {
    try {
      const response = await api.post(`/notifications/${notificationId}/mark-read`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Marcar todas las notificaciones como leídas
  markAllAsRead: async () => {
    try {
      const response = await api.post('/notifications/mark-all-read');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener contador de notificaciones no leídas
  getUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// Servicios para notificaciones del usuario
export const userNotificationService = {
  // Obtener notificaciones del usuario
  getUserNotifications: async () => {
    try {
      const response = await api.get('/notifications');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Marcar notificación como leída
  markAsRead: async (notificationId) => {
    try {
      const response = await api.post(`/notifications/${notificationId}/mark-read`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Marcar todas las notificaciones como leídas
  markAllAsRead: async () => {
    try {
      const response = await api.post('/notifications/mark-all-read');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Obtener contador de notificaciones no leídas
  getUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      return response;
    } catch (error) {
      throw error;
    }
  }
};

// Servicios para clientes
export const clientService = {
  // Listar todos los clientes (filtra por idvendedor del vendor si aplica)
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/admin/clients', { params });
      return response;
    } catch (error) {
      throw error;
    }
  },
  // Sincroniza el idvendedor de los clientes oro/diamante desde la API externa.
  // Accesible para admin, operador y vendor. Para vendor, solo sincroniza
  // los clientes de su idvendedor.
  syncIdvendedor: async () => {
    try {
      const response = await api.post('/admin/clients/sync-idvendedor');
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default api;
