import React from 'react';
import { Navigate } from 'react-router-dom';
import useUserStore from '../store/userStore';

const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useUserStore();

  // Si está cargando, mostrar loading
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Cargando panel de administración...
      </div>
    );
  }

  // Si no hay usuario, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si el usuario no es admin, redirigir al home
  if (!isAdmin()) {
    return <Navigate to="/" replace />;
  }

  // Si es admin, mostrar el contenido
  return children;
};

export default AdminRoute;

 