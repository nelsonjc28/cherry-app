import React from 'react';
import { Navigate } from 'react-router-dom';
import useUserStore from '../store/userStore';

const AdminRoute = ({ children }) => {
  const { user } = useUserStore();

  // Si no hay usuario, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si hay usuario loggeado, mostrar el contenido (permitir acceso a todos)
  return children;
};

export default AdminRoute;

 