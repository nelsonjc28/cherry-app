import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const RootRouteGuard = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    // Asegurar que cuando se accede a la ruta raíz, se muestre el contenido correcto
    if (location.pathname === '/') {
      // Forzar scroll al inicio de la página
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      
      // Asegurar que el título de la página sea correcto
      document.title = 'Cherry Central - Moda y Estilo';
    }
  }, [location.pathname]);

  return children;
};

export default RootRouteGuard;





































