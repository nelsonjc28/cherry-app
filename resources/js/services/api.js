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
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Servicios específicos para welcome sections
export const welcomeSectionService = {
  // Obtener todas las secciones (admin)
  getAll: () => api.get('/admin/welcome-sections'),

  // Obtener una sección específica (admin)
  getById: (id) => api.get(`/admin/welcome-sections/${id}`),

  // Crear nueva sección (admin)
  create: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      let value = data[key];
      if (key === 'is_active') {
        value = value ? '1' : '0';
      } else if (key === 'display_order') {
        value = value.toString();
      }
      formData.append(key, value);
    });

    return api.post('/admin/welcome-sections', formData);
  },

  // Actualizar sección (admin)
  update: (id, data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      let value = data[key];
      if (key === 'is_active') {
        value = value ? '1' : '0';
      } else if (key === 'display_order') {
        value = value.toString();
      }
      formData.append(key, value);
    });

    return api.put(`/admin/welcome-sections/${id}`, formData);
  },

  // Crear o actualizar sección (admin)
  createOrUpdate: (editingSection, formData, imageFile) => {
    const formDataObj = new FormData();

    // Agregar todos los campos del formData
    Object.keys(formData).forEach(key => {
      let value = formData[key];
      if (key === 'is_active') {
        value = value ? '1' : '0';
      } else if (key === 'display_order') {
        value = value.toString();
      }
      formDataObj.append(key, value);
    });

    if (imageFile) {
      formDataObj.append('image', imageFile);
    }

    if (editingSection) {
      // Usar POST con _method para simular PUT
      return api.post(`/admin/welcome-sections/${editingSection.id}`, formDataObj);
    } else {
      return api.post('/admin/welcome-sections', formDataObj);
    }
  },

  // Eliminar sección (admin)
  delete: (id) => api.delete(`/admin/welcome-sections/${id}`),

  // Cambiar estado de sección (admin)
  toggleStatus: (id) => api.patch(`/admin/welcome-sections/${id}/toggle`),

  // Obtener sección activa (público)
  getActive: () => api.get('/welcome-sections/active'),

  // Obtener todas las secciones activas (público)
  getActiveSections: () => api.get('/welcome-sections'),
};

// Servicios para categorías
export const categoryService = {
  getAll: () => api.get('/categories'),
  getBySlug: (slug) => api.get(`/categories/${slug}`),
};

// Servicios para favoritos
export const favoriteService = {
  getAll: () => api.get('/favorites'),
  add: (data) => api.post('/favorites', data),
  check: (productId) => api.post('/favorites/check', { product_id: productId }),
  toggle: (data) => api.post('/favorites/toggle', data),
  remove: (productId) => api.delete('/favorites', { data: { product_id: productId } }),
};

// Servicios para ratings
export const ratingService = {
  getUserRating: () => api.get('/ratings/user'),
  add: (data) => api.post('/ratings', data),
  checkUserRating: (productId) => api.post('/ratings/check', { product_id: productId }),
  getProductRatings: (productId) => api.get('/ratings/product', { params: { product_id: productId } }),
  getBulkRatings: (productIds) => api.post('/ratings/bulk', { product_ids: productIds }),
};

export default api;