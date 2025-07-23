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
        console.error('Error fetching welcome section:', err);
        setError(err.message);
        setWelcomeSection(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWelcomeSection();
  }, []);

  return { welcomeSection, loading, error };
};

export default useWelcomeSection; 