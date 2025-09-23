import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';

/**
 * Hook para proteger rutas del admin y verificar autenticación
 * @param {boolean} requireAuth - Si es true, requiere autenticación
 * @param {string} redirectTo - Ruta a la que redirigir si no hay autenticación
 * @returns {Object} - Objeto con funciones de autenticación
 */
const useAuthGuard = (requireAuth = true, redirectTo = '/login') => {
  const navigate = useNavigate();

  // Verificar si el usuario está autenticado
  const isAuthenticated = useCallback(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      return false;
    }

    try {
      // Verificar si el token no ha expirado (JWT básico)
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Agregar un margen de 5 minutos para evitar expiración prematura por diferencias de tiempo
      const expirationBuffer = 5 * 60; // 5 minutos en segundos
      
      if (tokenData.exp && (tokenData.exp - expirationBuffer) < currentTime) {
        console.log('Token expirará pronto o ya expiró:', {
          exp: tokenData.exp,
          current: currentTime,
          expiresIn: tokenData.exp - currentTime,
          expiresInMinutes: Math.floor((tokenData.exp - currentTime) / 60)
        });
        
        // Solo eliminar si realmente ha expirado (sin buffer)
        if (tokenData.exp < currentTime) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return false;
        }
      }
      
      return true;
    } catch (error) {

      // Error al parsear el token, considerarlo inválido
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return false;
    }
  }, []);

  // Verificar autenticación con el servidor
  const checkServerAuth = useCallback(async () => {
    try {
      const response = await authService.checkToken();
      return response.data.success;
    } catch (error) {
      if (error.response?.status === 401) {
        // Token expirado o inválido
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return false;
      }
      // Otro tipo de error, mantener la sesión por ahora
      return true;
    }
  }, []);

  // Redirigir al login
  const redirectToLogin = useCallback(() => {
    if (window.showToast) {
      window.showToast('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'warning');
    }
    
    // Limpiar datos de sesión
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirigir después de un breve delay
    setTimeout(() => {
      navigate(redirectTo);
    }, 1500);
  }, [navigate, redirectTo]);

  // Verificar autenticación al montar el componente
  useEffect(() => {
    if (!requireAuth) return;

    const checkAuth = async () => {
      // Primera verificación local
      if (!isAuthenticated()) {
        redirectToLogin();
        return;
      }

      // Segunda verificación con el servidor (opcional, para casos edge)
      try {
        const isValid = await checkServerAuth();
        if (!isValid) {
          redirectToLogin();
        }
      } catch (error) {
        // Si hay error de red, mantener la sesión local

      }
    };

    checkAuth();

    // Verificar autenticación cada 24 horas (para sesiones de 30 días)
    const interval = setInterval(checkAuth, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [requireAuth, isAuthenticated, checkServerAuth, redirectToLogin]);

  // Función para cerrar sesión manualmente
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    if (window.showToast) {
      window.showToast('Sesión cerrada exitosamente', 'success');
    }
    
    navigate(redirectTo);
  }, [navigate, redirectTo]);

  // Función para extender la sesión
  const extendSession = useCallback(async () => {
    try {
      const response = await authService.extendSession();
      if (response.data.success) {
        // Actualizar el token si es necesario
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
        }
        return true;
      }
      return false;
    } catch (error) {

      return false;
    }
  }, []);

  return {
    isAuthenticated: isAuthenticated(),
    checkAuth: checkServerAuth,
    logout,
    extendSession,
    redirectToLogin
  };
};

export default useAuthGuard;
