import React, { createContext, useContext, useState, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { getRandomProducts, getAllProducts, getAvailableCategories } from '../api/cherryApi';

const ExternalApiContext = createContext();

export const useExternalApiContext = () => {
  const context = useContext(ExternalApiContext);
  if (!context) {
    // En lugar de lanzar error, retornar valores por defecto
    // Esto hace que el componente sea más robusto
    return {
      dataCache: {},
      loading: {},
      error: null,
      getRandomProductsCached: async () => [],
      getAllProductsCached: async () => [],
      getCategoriesCached: async () => [],
      loadRandomProducts: async () => [],
      loadAllProducts: async () => [],
      loadCategories: async () => []
    };
  }
  return context;
};

export const ExternalApiProvider = ({ children }) => {
  const dataCacheRef = useRef({});
  const loadingRef = useRef({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);
  const location = useLocation();
  
  // Verificar si estamos en el panel de administración
  const isAdminPage = location.pathname.startsWith('/admin');
  
  // Función para cargar productos aleatorios solo cuando se soliciten explícitamente
  const loadRandomProducts = useCallback(async (count = 5) => {
    // No cargar datos si estamos en el panel de administración
    if (isAdminPage) {
      return [];
    }
    
    const cacheKey = `randomProducts_${count}`;
    
    // Si ya están en caché, devolverlos
    if (dataCacheRef.current[cacheKey]) {
      return dataCacheRef.current[cacheKey];
    }

    // Evitar llamadas múltiples simultáneas
    if (loadingRef.current[cacheKey]) {
      return [];
    }

    try {
      loadingRef.current[cacheKey] = true;
      setLoading(prev => ({ ...prev, [cacheKey]: true }));
      setError(null);
      
      const products = await getRandomProducts(count);
      const cachedData = products || [];
      
      dataCacheRef.current[cacheKey] = cachedData;
      return cachedData;
    } catch (err) {
      if (window.showToast) {
        window.showToast('Error al cargar productos aleatorios', 'error');
      }
      return [];
    } finally {
      loadingRef.current[cacheKey] = false;
      setLoading(prev => ({ ...prev, [cacheKey]: false }));
    }
  }, [isAdminPage]);

  // Función para cargar todos los productos solo cuando se soliciten explícitamente
  const loadAllProducts = useCallback(async () => {
    // No cargar datos si estamos en el panel de administración
    if (isAdminPage) {
      return [];
    }
    
    const cacheKey = 'allProducts';
    
    // Si ya están en caché, devolverlos
    if (dataCacheRef.current[cacheKey]) {
      return dataCacheRef.current[cacheKey];
    }

    // Evitar llamadas múltiples simultáneas
    if (loadingRef.current[cacheKey]) {
      return [];
    }

    try {
      loadingRef.current[cacheKey] = true;
      setLoading(prev => ({ ...prev, [cacheKey]: true }));
      setError(null);
      
      const products = await getAllProducts();
      const cachedData = products || [];
      
      dataCacheRef.current[cacheKey] = cachedData;
      return cachedData;
    } catch (err) {
      if (window.showToast) {
        window.showToast('Error al cargar todos los productos', 'error');
      }
      return [];
    } finally {
      loadingRef.current[cacheKey] = false;
      setLoading(prev => ({ ...prev, [cacheKey]: false }));
    }
  }, [isAdminPage]);

  // Función para cargar categorías solo cuando se soliciten explícitamente
  const loadCategories = useCallback(async () => {
    // No cargar datos si estamos en el panel de administración
    if (isAdminPage) {
      return [];
    }
    
    const cacheKey = 'categories';
    
    // Si ya están en caché, devolverlos
    if (dataCacheRef.current[cacheKey]) {
      return dataCacheRef.current[cacheKey];
    }

    // Evitar llamadas múltiples simultáneas
    if (loadingRef.current[cacheKey]) {
      return [];
    }

    try {
      loadingRef.current[cacheKey] = true;
      setLoading(prev => ({ ...prev, [cacheKey]: true }));
      setError(null);
      
      const categoriesData = await getAvailableCategories();
      const cachedData = categoriesData || [];
      
      dataCacheRef.current[cacheKey] = cachedData;
      return cachedData;
    } catch (err) {
      if (window.showToast) {
        window.showToast('Error al cargar categorías', 'error');
      }
      return [];
    } finally {
      loadingRef.current[cacheKey] = false;
      setLoading(prev => ({ ...prev, [cacheKey]: false }));
    }
  }, [isAdminPage]);

  // Función para obtener productos aleatorios (carga si es necesario)
  const getRandomProductsCached = useCallback(async (count = 5) => {
    return await loadRandomProducts(count);
  }, [loadRandomProducts]);

  // Función para obtener todos los productos (carga si es necesario)
  const getAllProductsCached = useCallback(async () => {
    return await loadAllProducts();
  }, [loadAllProducts]);

  // Función para obtener categorías (carga si es necesario)
  const getCategoriesCached = useCallback(async () => {
    return await loadCategories();
  }, [loadCategories]);

  const value = useMemo(() => ({
    dataCache: dataCacheRef.current,
    loading,
    error,
    getRandomProductsCached,
    getAllProductsCached,
    getCategoriesCached,
    loadRandomProducts,
    loadAllProducts,
    loadCategories
  }), [loading, error, getRandomProductsCached, getAllProductsCached, getCategoriesCached, loadRandomProducts, loadAllProducts, loadCategories]);

  return (
    <ExternalApiContext.Provider value={value}>
      {children}
    </ExternalApiContext.Provider>
  );
}; 
