import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { categoryService } from '../services/api';

const useMenuCategories = () => {
  const [menuCategories, setMenuCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // No cargar categorías del menú si estamos en el panel de administración
    if (location.pathname.startsWith('/admin')) {
      setMenuCategories([]);
      setLoading(false);
      return;
    }

    const fetchMenuCategories = async () => {
      try {
        setLoading(true);
        // Intentar obtener las categorías del menú primero
        const menuResponse = await fetch('/api/menu-categories');
        const menuData = await menuResponse.json();
        if (menuData.success && menuData.data) {
          setMenuCategories(menuData.data);
        } else {
          setMenuCategories([]);
        }
      } catch (err) {
        setError(err.message);
        // Si falla, usar categorías vacías
        setMenuCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuCategories();
  }, [location.pathname]);

  return { menuCategories, loading, error };
};

export default useMenuCategories;
