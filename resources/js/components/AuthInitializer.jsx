import React, { useEffect } from 'react';
import useUserStore from '../store/userStore';

const AuthInitializer = ({ children }) => {
  const { fetchUser, loading, initialized } = useUserStore();

  useEffect(() => {
    const initializeAuth = async () => {
      // Solo intentar inicializar si no está ya inicializado
      if (!initialized) {
        try {
          await fetchUser();
        } catch (err) {
          // Error initializing auth
        }
      }
    };

    initializeAuth();
  }, [fetchUser, initialized]);

  // Temporalmente, siempre mostrar la aplicación
  return children;
};

export default AuthInitializer; 
