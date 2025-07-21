import React, { useEffect } from 'react';
import useUserStore from '../store/userStore';

const AuthInitializer = ({ children }) => {
  const { fetchUser, loading, initialized } = useUserStore();

  useEffect(() => {
    const initializeAuth = async () => {
      // Verificar si hay un token almacenado
      const token = localStorage.getItem('token');
      if (token && !initialized) {
        try {
          // Intentar cargar el usuario
          await fetchUser();
        } catch (err) {
          console.error('Error initializing auth:', err);
        }
      }
    };

    initializeAuth();
  }, [fetchUser, initialized]);

  // Mostrar loading mientras se inicializa la autenticación
  if (!initialized || loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Inicializando aplicación...
      </div>
    );
  }

  return children;
};

export default AuthInitializer; 