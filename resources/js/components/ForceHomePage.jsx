import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import HomePage from '../pages/HomePage';

const ForceHomePage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Forzar que siempre estemos en la ruta raíz
    if (location.pathname !== '/') {
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Siempre mostrar HomePage sin importar el estado de autenticación
  return <HomePage />;
};

export default ForceHomePage;
