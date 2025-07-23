import { useState, useEffect } from 'react';
import { getCategoryIconPath } from '../utils/assetPaths';
import api from '../services/api';

const useHomeCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHomeCategories = async () => {
      try {
        setLoading(true);
        console.log('Fetching home categories...');
        const response = await api.get('/home-categories');
        console.log('Response received:', response.data);
        
        if (response.data.success && response.data.categories) {
          // Mapear las categorías con sus iconos
          const categoriesWithIcons = response.data.categories.map(category => ({
            id: category.id,
            name: category.name,
            slug: category.slug,
            icon: getCategoryIconPath(`${category.slug}.svg`) || getCategoryIconPath('default-category.svg')
          }));
          
          console.log('Categories with icons:', categoriesWithIcons);
          setCategories(categoriesWithIcons);
        } else {
          console.log('No ordered categories found, using defaults');
          // Si no hay categorías ordenadas, usar las categorías por defecto
          const defaultCategories = [
            { name: 'Vestidos', icon: getCategoryIconPath('vestido-de-novio 1.svg') },
            { name: 'Blusas', icon: getCategoryIconPath('blusa 1.svg') },
            { name: 'Pantalones', icon: getCategoryIconPath('pantalones-ajustados 1.svg') },
            { name: 'Sacos', icon: getCategoryIconPath('vestir 1.svg') },
            { name: 'Conjuntos', icon: getCategoryIconPath('moda 2 1.svg') },
            { name: 'Gabardinas', icon: getCategoryIconPath('gabardina 1.svg') }
          ];
          setCategories(defaultCategories);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching home categories:', err);
        console.error('Error response:', err.response);
        setError(err.response?.data?.message || err.message);
        
        // En caso de error, usar categorías por defecto
        const defaultCategories = [
          { name: 'Vestidos', icon: getCategoryIconPath('vestido-de-novio 1.svg') },
          { name: 'Blusas', icon: getCategoryIconPath('blusa 1.svg') },
          { name: 'Pantalones', icon: getCategoryIconPath('pantalones-ajustados 1.svg') },
          { name: 'Sacos', icon: getCategoryIconPath('vestir 1.svg') },
          { name: 'Conjuntos', icon: getCategoryIconPath('moda 2 1.svg') },
          { name: 'Gabardinas', icon: getCategoryIconPath('gabardina 1.svg') }
        ];
        setCategories(defaultCategories);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeCategories();
  }, []);

  return { categories, loading, error };
};

export default useHomeCategories; 