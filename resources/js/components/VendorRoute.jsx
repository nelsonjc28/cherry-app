import React from 'react';
import { Navigate } from 'react-router-dom';
import useUserStore from '../store/userStore';

/**
 * Guard para rutas /vendor/*.
 * Sólo permite usuarios con rol 'vendedor'.
 * Admin/operador/cliente NO pueden acceder (serían redirigidos al home).
 */
const VendorRoute = ({ children }) => {
  const { user, loading } = useUserStore();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '1.2rem',
          color: '#666',
        }}
      >
        Cargando panel de vendedor...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user?.role?.name;
  if (userRole !== 'vendedor') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default VendorRoute;