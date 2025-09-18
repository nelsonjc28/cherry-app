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
          // Error initializing auth - no bloquear la aplicación
          console.log('Auth initialization error:', err);
        }
      }
    };

    // Inicializar en background sin bloquear
    initializeAuth();
  }, [fetchUser, initialized]);

  // Siempre mostrar la aplicación, no bloquear por autenticación
  return children;
};

export default AuthInitializer; 
