import { useState, useEffect } from 'react';
import colorService from '../services/colorService';

export const useProductColors = (colorNames = []) => {
  const [colorData, setColorData] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Identificar colores cuando cambien los nombres
  useEffect(() => {
    if (!Array.isArray(colorNames) || colorNames.length === 0) {
      setColorData(new Map());
      return;
    }

    const identifyColors = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Filtrar colores que ya están en cache
        const uncachedColors = colorNames.filter(name => !colorService.isColorCached(name));
        
        if (uncachedColors.length === 0) {
          // Todos los colores están en cache
          const cachedData = new Map();
          colorNames.forEach(name => {
            const cached = colorService.getCachedColor(name);
            if (cached) {
              cachedData.set(name, cached);
            }
          });
          setColorData(cachedData);
          setIsLoading(false);
          return;
        }

        // Identificar colores no cacheados
        const identifiedColors = await colorService.identifyMultipleColors(uncachedColors);
        
        // Combinar con colores cacheados
        const allColorData = new Map();
        
        // Agregar colores identificados
        identifiedColors.forEach(color => {
          allColorData.set(color.name, color);
        });
        
        // Agregar colores cacheados
        colorNames.forEach(name => {
          if (!allColorData.has(name)) {
            const cached = colorService.getCachedColor(name);
            if (cached) {
              allColorData.set(name, cached);
            }
          }
        });

        setColorData(allColorData);
      } catch (err) {
        setError(err.message);
        console.error('Error identifying colors:', err);
      } finally {
        setIsLoading(false);
      }
    };

    identifyColors();
  }, [colorNames]);

  // Obtener información de un color específico
  const getColorInfo = (colorName) => {
    return colorData.get(colorName) || null;
  };

  // Obtener código hexadecimal de un color
  const getColorHex = (colorName) => {
    const colorInfo = getColorInfo(colorName);
    return colorInfo ? colorInfo.hex : null;
  };

  // Verificar si un color ha sido identificado
  const isColorIdentified = (colorName) => {
    return colorData.has(colorName);
  };

  // Forzar re-identificación de un color
  const refreshColor = async (colorName) => {
    if (!colorName) return;
    
    try {
      const colorInfo = await colorService.identifyColor(colorName);
      if (colorInfo) {
        setColorData(prev => new Map(prev).set(colorName, colorInfo));
      }
    } catch (err) {
      console.error(`Error refreshing color "${colorName}":`, err);
    }
  };

  // Actualizar lista de colores
  const refreshColors = async (newColorNames) => {
    if (!Array.isArray(newColorNames) || newColorNames.length === 0) {
      setColorData(new Map());
      return;
    }

    try {
      const identifiedColors = await colorService.identifyMultipleColors(newColorNames);
      const newColorData = new Map();
      
      identifiedColors.forEach(color => {
        newColorData.set(color.name, color);
      });
      
      setColorData(newColorData);
    } catch (err) {
      console.error('Error refreshing colors:', err);
    }
  };

  // Limpiar cache
  const clearCache = () => {
    colorService.clearCache();
    setColorData(new Map());
  };

  return {
    colorData,
    isLoading,
    error,
    getColorInfo,
    getColorHex,
    isColorIdentified,
    refreshColor,
    refreshColors,
    clearCache
  };
};
