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

  // Verificar explícitamente el rol del usuario
  const userRole = user?.role?.name;
  
  // Permitir acceso a administradores y operadores (bloquear solo clientes)
  if (userRole !== 'admin' && userRole !== 'operador') {
    // Si no es admin ni operador, redirigir al home
    return <Navigate to="/" replace />;
  }

  // Si es admin, mostrar el contenido
  return children;
};

export default AdminRoute;

 
