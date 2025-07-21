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
      console.log('SmartRedirect: En /admin sin usuario, redirigiendo a login');
      navigate('/login', { replace: true });
      return;
    }

    // Si estamos en /admin pero el usuario no es admin, ir a home
    if (currentPath === '/admin' && user && !isAdmin()) {
      console.log('SmartRedirect: En /admin pero usuario no es admin, redirigiendo a home');
      navigate('/', { replace: true });
      return;
    }

    // Si estamos en /login pero ya hay usuario autenticado
    if (currentPath === '/login' && user) {
      console.log('SmartRedirect: En /login con usuario autenticado, redirigiendo según rol');
      if (isAdmin()) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
      return;
    }

    // Si estamos en / pero hay usuario admin, ir a admin
    if (currentPath === '/' && user && isAdmin()) {
      console.log('SmartRedirect: En / con usuario admin, redirigiendo a admin');
      navigate('/admin', { replace: true });
      return;
    }

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