import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useUserStore from '../store/userStore';

const SmartRedirect = ({ children }) => {
  const { user, isAdmin, initialized } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();

  // 🚀 SCROLL AUTOMÁTICO HACIA ARRIBA en cada cambio de página
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [location.pathname]);

  useEffect(() => {
    // Solo ejecutar después de que la autenticación esté inicializada
    if (!initialized) return;

    const currentPath = location.pathname;

    // NO interferir con la ruta raíz - dejarla cargar normalmente
    if (currentPath === '/') {
      return;
    }

    // Si estamos en cualquier ruta /admin pero no hay usuario, ir a login
    if (currentPath.startsWith('/admin') && !user) {
      navigate('/login', { replace: true });
      return;
    }

    // Si estamos en cualquier ruta /admin pero el usuario no es admin ni operador, ir a home
    // Esto bloquea solo a clientes, permite a administradores y operadores
    if (currentPath.startsWith('/admin') && user) {
      const userRole = user?.role?.name;
      if (userRole !== 'admin' && userRole !== 'operador') {
        navigate('/', { replace: true });
        return;
      }
    }

    // Si estamos en /login pero ya hay usuario autenticado
    if (currentPath === '/login' && user) {
      // Los admins pueden ir a admin o home, por defecto van a home
      navigate('/', { replace: true });
      return;
    }

  }, [user, isAdmin, initialized, location.pathname, navigate]);

  // Siempre mostrar la aplicación, no bloquear por inicialización
  return children;
};

export default SmartRedirect; 
