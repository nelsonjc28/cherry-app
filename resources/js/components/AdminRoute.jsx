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

  // Verificaciones de seguridad (redundantes con SmartRedirect pero por seguridad)
  if (!user) {
    console.log('AdminRoute: No hay usuario');
    return null; // SmartRedirect se encargará de la redirección
  }

  if (!isAdmin()) {
    console.log('AdminRoute: Usuario no es admin');
    return null; // SmartRedirect se encargará de la redirección
  }

  // Si es admin, mostrar el contenido
  console.log('AdminRoute: Usuario es admin, mostrando contenido');
  return children;
};

export default AdminRoute;

 