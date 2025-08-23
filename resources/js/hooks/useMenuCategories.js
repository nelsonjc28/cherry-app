import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { categoryService } from '../services/api';

const useMenuCategories = () => {
  const [menuCategories, setMenuCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();

  useEffect(() => {
    console.log('🔄 useMenuCategories useEffect ejecutándose, pathname:', location.pathname);
    
    // No cargar categorías del menú si estamos en el panel de administración
    if (location.pathname.startsWith('/admin')) {
      console.log('🚫 useMenuCategories: En panel admin, no cargando categorías del menú');
      setMenuCategories([]);
      setLoading(false);
      return;
    }

    const fetchMenuCategories = async () => {
      try {
        setLoading(true);
        console.log('🔍 useMenuCategories: Iniciando fetch de categorías del menú...');
        
        // Intentar obtener las categorías del menú primero
        const menuResponse = await fetch('/api/menu-categories');
        const menuData = await menuResponse.json();
        console.log('✅ useMenuCategories: Respuesta del menú recibida:', menuData);
        
        if (menuData.success && menuData.data) {
          console.log('📊 useMenuCategories: Categorías del menú obtenidas:', menuData.data);
          setMenuCategories(menuData.data);
        } else {
          console.log('⚠️ useMenuCategories: No hay categorías del menú configuradas');
          setMenuCategories([]);
        }
      } catch (err) {
        console.error('❌ useMenuCategories: Error al obtener categorías del menú:', err);
        setError(err.message);
        // Si falla, usar categorías vacías
        setMenuCategories([]);
      } finally {
        console.log('🏁 useMenuCategories: Finalizando fetch, setting loading = false');
        setLoading(false);
      }
    };

    fetchMenuCategories();
  }, [location.pathname]);

  return { menuCategories, loading, error };
};

export default useMenuCategories;
