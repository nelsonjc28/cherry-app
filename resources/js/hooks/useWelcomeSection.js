import { useState, useEffect, useCallback, useRef } from 'react';
import { welcomeSectionService } from '../services/api';

const useWelcomeSection = (limit = 3) => {
  const [welcomeSections, setWelcomeSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Usar useRef para evitar llamadas duplicadas
  const isFetching = useRef(false);
  const lastFetchTime = useRef(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  // Memoizar la función fetchWelcomeSections
  const fetchWelcomeSections = useCallback(async () => {
    // Evitar llamadas duplicadas
    if (isFetching.current) return;
    
    // Verificar si los datos están en caché
    const now = Date.now();
    if (now - lastFetchTime.current < CACHE_DURATION && welcomeSections.length > 0) {
      return;
    }

    try {
      isFetching.current = true;
      setLoading(true);
      
      const response = await welcomeSectionService.getActiveSections();
      
      // Limitar el número de secciones y ordenar por display_order
      const limitedSections = (response.data.sections || [])
        .sort((a, b) => a.display_order - b.display_order)
        .slice(0, limit);
      
      setWelcomeSections(limitedSections);
      setError(null);
      lastFetchTime.current = now;
    } catch (err) {
      setError('Error al cargar las secciones de bienvenida');
      console.error('Error en useWelcomeSection:', err);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [limit, welcomeSections.length]);

  useEffect(() => {
    fetchWelcomeSections();
  }, [fetchWelcomeSections]);

  // Función para refrescar los datos manualmente
  const refreshSections = useCallback(() => {
    lastFetchTime.current = 0; // Resetear caché
    fetchWelcomeSections();
  }, [fetchWelcomeSections]);

  return { 
    welcomeSections, 
    loading, 
    error, 
    refreshSections 
  };
};

export default useWelcomeSection; 
