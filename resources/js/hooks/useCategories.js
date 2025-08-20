import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { publicCategoryService } from '../services/api';

const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();

  useEffect(() => {
    console.log('🔄 useCategories useEffect ejecutándose, pathname:', location.pathname);
    
    // No cargar categorías si estamos en el panel de administración
    if (location.pathname.startsWith('/admin')) {
      console.log('🚫 useCategories: En panel admin, no cargando categorías');
      setCategories([]);
      setLoading(false);
      return;
    }

    const fetchCategories = async () => {
      try {
        setLoading(true);
        console.log('🔍 useCategories: Iniciando fetch de categorías...');
        const response = await publicCategoryService.getAll();
        console.log('✅ useCategories: Respuesta recibida:', response);
        console.log('📊 useCategories: Categorías en response.data:', response.data);
        console.log('📋 useCategories: Categorías en response.data.categories:', response.data.categories);
        console.log('📊 useCategories: Categorías obtenidas, cantidad:', (response.data.categories || []).length);
        setCategories(response.data.categories || []);
      } catch (err) {
        console.error('❌ useCategories: Error al obtener categorías:', err);
        setError(err.message);
        // Fallback a categorías estáticas si la API falla
        setCategories([
          { name: 'Ropa', slug: 'ropa' },
          { name: 'Calzado', slug: 'calzado' },
          { name: 'Accesorios', slug: 'accesorios' },
          { name: 'Joyería', slug: 'joyeria' },
          { name: 'Relojes', slug: 'relojes' }
        ]);
      } finally {
        console.log('🏁 useCategories: Finalizando fetch, setting loading = false');
        setLoading(false);
      }
    };

    fetchCategories();
  }, [location.pathname]);

  return { categories, loading, error };
};

export default useCategories; 