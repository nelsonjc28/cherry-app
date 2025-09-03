import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthGuard from '../../hooks/useAuthGuard';

/**
 * Componente para proteger rutas del admin
 * @param {Object} props - Propiedades del componente
 * @param {React.ReactNode} props.children - Componentes hijos a renderizar
 * @param {boolean} props.requireAuth - Si requiere autenticación (por defecto true)
 * @param {string} props.redirectTo - Ruta a la que redirigir si no hay autenticación
 * @param {boolean} props.showLoading - Si mostrar un indicador de carga
 * @returns {React.ReactNode} - Componente protegido o redirección
 */
const AdminRoute = ({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login',
  showLoading = true 
}) => {
  const location = useLocation();
  const { isAuthenticated, checkAuth } = useAuthGuard(requireAuth, redirectTo);

  // Si no requiere autenticación, mostrar directamente
  if (!requireAuth) {
    return <>{children}</>;
  }

  // Si está verificando autenticación, mostrar loading
  if (showLoading && isAuthenticated === undefined) {
    return (
      <div className="admin-loading">
        <div className="admin-loading__spinner"></div>
        <p>Verificando autenticación...</p>
      </div>
    );
  }

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Si está autenticado, mostrar el contenido
  return <>{children}</>;
};

export default AdminRoute;
