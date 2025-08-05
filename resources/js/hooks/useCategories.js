import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { categoryService } from '../services/api';

const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // No cargar categorías si estamos en el panel de administración
    if (location.pathname.startsWith('/admin')) {
      setCategories([]);
      setLoading(false);
      return;
    }

    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await categoryService.getAll();
        setCategories(response.data.categories || []);
      } catch (err) {
        setError(err.message);
        // Fallback a categorías estáticas si la API falla
        setCategories([
          { name: 'Ropa', slug: 'ropa' },
          { name: 'Calzado', slug: 'calzado' },
          { name: 'Accesorios', slug: 'accesorios' },
          { name: 'Bolsos', slug: 'bolsos' },
          { name: 'Joyería', slug: 'joyeria' },
          { name: 'Relojes', slug: 'relojes' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [location.pathname]);

  return { categories, loading, error };
};

export default useCategories; 