import { useState, useEffect } from 'react';
import { categoryService } from '../services/api';

const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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
  }, []);

  return { categories, loading, error };
};

export default useCategories; 