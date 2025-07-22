import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useUserStore from '../store/userStore';

const SmartRedirect = ({ children }) => {
  const { user, isAdmin, initialized } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Solo ejecutar después de que la autenticación esté inicializada
    if (!initialized) return;

    const currentPath = location.pathname;

    // Si estamos en /admin pero no hay usuario, ir a login
    if (currentPath === '/admin' && !user) {
      navigate('/login', { replace: true });
      return;
    }

    // Si estamos en /admin pero el usuario no es admin, ir a home
    if (currentPath === '/admin' && user && !isAdmin()) {
      navigate('/', { replace: true });
      return;
    }

    // Si estamos en /login pero ya hay usuario autenticado
    if (currentPath === '/login' && user) {
      // Los admins pueden ir a admin o home, por defecto van a home
      navigate('/', { replace: true });
      return;
    }

    // NO redirigir automáticamente desde / si el usuario es admin
    // Los admins pueden acceder libremente a las vistas de clientes

  }, [user, isAdmin, initialized, location.pathname, navigate]);

  // Si no está inicializado, mostrar loading
  if (!initialized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Verificando sesión...
      </div>
    );
  }

  return children;
};

export default SmartRedirect; 