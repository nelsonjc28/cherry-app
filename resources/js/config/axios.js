import axios from 'axios';

// Crear instancia de axios con configuración base
const api = axios.create({
  baseURL: '/api',
  timeout: 15000, // Aumentado a 15s para evitar timeouts
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor para agregar token de autenticación automáticamente
api.interceptors.request.use(
  (config) => {
    // Obtener token del localStorage
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // No sobrescribir Content-Type si ya está configurado (para FormData)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Manejar errores de autenticación
    if (error.response?.status === 401) {
      // Token expirado o inválido - NO mostrar mensaje para evitar múltiples toasts
      // El interceptor en api.js ya maneja la redirección
      
      // Limpiar token del localStorage
      localStorage.removeItem('token');
      
      // Redirigir a login si no estamos ya ahí (solo si no es una ruta pública)
      const isPublicRoute = error.config?.url?.includes('/public/') ||
                           (error.config?.url?.includes('/catalogs') && !error.config?.url?.includes('/admin/')) ||
                           error.config?.url?.includes('/categories') ||
                           error.config?.url?.includes('/welcome-sections') ||
                           error.config?.url?.includes('/contact-info') ||
                           error.config?.url?.includes('/privacy-policy') ||
                           error.config?.url?.includes('/home-catalogs') ||
                           error.config?.url?.includes('/home-categories') ||
                           error.config?.url?.includes('/terms-conditions');
      
      if (!isPublicRoute && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
