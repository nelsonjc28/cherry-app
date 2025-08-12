import { useState, useEffect } from 'react';
import { welcomeSectionService } from '../services/api';

const useWelcomeSection = () => {
  const [welcomeSection, setWelcomeSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWelcomeSection = async () => {
      try {
        setLoading(true);
        const response = await welcomeSectionService.getActive();
        setWelcomeSection(response.data.section);
        setError(null);
      } catch (err) {
        setError('Error al cargar la sección de bienvenida');
      } finally {
        setLoading(false);
      }
    };

    fetchWelcomeSection();
  }, []);

  return { welcomeSection, loading, error };
};

export default useWelcomeSection; 