import { useState, useEffect } from 'react';
import { welcomeSectionService } from '../services/api';

const useWelcomeSection = (limit = 3) => {
  const [welcomeSections, setWelcomeSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWelcomeSections = async () => {
      try {
        setLoading(true);
        const response = await welcomeSectionService.getActiveSections();
        // Limitar el número de secciones y ordenar por display_order
        const limitedSections = (response.data.sections || [])
          .sort((a, b) => a.display_order - b.display_order)
          .slice(0, limit);
        setWelcomeSections(limitedSections);
        setError(null);
      } catch (err) {
        setError('Error al cargar las secciones de bienvenida');
      } finally {
        setLoading(false);
      }
    };

    fetchWelcomeSections();
  }, [limit]);

  return { welcomeSections, loading, error };
};

export default useWelcomeSection; 