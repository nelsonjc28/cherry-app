import { useState, useEffect } from 'react';
import { checkUserDiscounts } from '../api/userDiscounts';
import useUserStore from '../store/userStore';

/**
 * Hook para obtener descuentos personalizados del usuario
 * @param {Array} productIds - Array de IDs de productos para verificar descuentos
 * @returns {Object} { userDiscounts, loading, error, refetch }
 */
export const useUserDiscounts = (productIds = []) => {
  const [userDiscounts, setUserDiscounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { user, isLoggedIn } = useUserStore();

  const fetchDiscounts = async (ids) => {
    if (!isLoggedIn || !ids || ids.length === 0) {
      setUserDiscounts({});
      setLoading(false);
      return;
    }

    // Filtrar IDs válidos
    const validIds = ids.filter(id => id && typeof id === 'string' && id.trim() !== '');
    
    if (validIds.length === 0) {
      setUserDiscounts({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await checkUserDiscounts(validIds);
      
      if (response.success) {
        setUserDiscounts(response.discounts || {});
      } else {
        console.warn('Error al verificar descuentos:', response.error);
        setUserDiscounts({});
        setError(response.error || 'Error al verificar descuentos');
      }
    } catch (err) {
      console.error('Error en useUserDiscounts:', err);
      setUserDiscounts({});
      setError(err.message || 'Error al cargar descuentos');
    } finally {
      setLoading(false);
    }
  };

  // Efecto para cargar descuentos cuando cambian los productIds o el estado de login
  useEffect(() => {
    fetchDiscounts(productIds);
  }, [productIds.join(','), isLoggedIn, user?.id]); // Usar join para comparar arrays

  // Función para refrescar manualmente
  const refetch = () => {
    fetchDiscounts(productIds);
  };

  return {
    userDiscounts,
    loading,
    error,
    refetch
  };
};

export default useUserDiscounts;

