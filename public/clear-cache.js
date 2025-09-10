// Script para limpiar cache problemático
(function() {
  'use strict';

  // Función para limpiar todos los caches
  function clearAllCaches() {
    if ('caches' in window) {
      caches.keys().then(function(names) {
        for (let name of names) {
          caches.delete(name);
        }
      });
    }
  }

  // Función para limpiar localStorage problemático
  function clearProblematicStorage() {
    try {
      // Limpiar datos que pueden causar problemas
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        // Remover caches de productos que pueden estar corruptos
        if (key && (
          key.includes('randomProducts_') ||
          key.includes('allProducts') ||
          key.includes('categories') ||
          key.includes('welcomeSections')
        )) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('Cache problemático limpiado:', keysToRemove.length, 'items removidos');
    } catch (error) {
      console.error('Error al limpiar localStorage:', error);
    }
  }

  // Función para forzar recarga sin cache
  function forceReload() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
          registration.unregister();
        }
        
        // Limpiar caches y recargar
        clearAllCaches();
        clearProblematicStorage();
        
        setTimeout(() => {
          window.location.reload(true);
        }, 1000);
      });
    } else {
      clearProblematicStorage();
      window.location.reload(true);
    }
  }

  // Detectar si la página ha estado cargando por más de 10 segundos
  let loadingTimeout;
  
  window.addEventListener('load', function() {
    clearTimeout(loadingTimeout);
  });

  // Si la página no carga en 10 segundos, mostrar opción de limpiar cache
  loadingTimeout = setTimeout(function() {
    if (document.readyState !== 'complete') {
      const shouldClear = confirm(
        'La página está tardando mucho en cargar. ¿Deseas limpiar el cache para intentar solucionarlo?'
      );
      
      if (shouldClear) {
        forceReload();
      }
    }
  }, 10000);

  // Exponer función global para limpiar cache manualmente
  window.clearCherryCache = forceReload;
  
  // Detectar problemas de rendimiento
  if (window.performance && window.performance.navigation) {
    const perfData = window.performance.navigation;
    
    // Si es una recarga y ha pasado tiempo, sugerir limpiar cache
    if (perfData.type === 1) { // TYPE_RELOAD
      const lastClearTime = localStorage.getItem('lastCacheClear');
      const now = Date.now();
      
      if (!lastClearTime || (now - parseInt(lastClearTime)) > 24 * 60 * 60 * 1000) {
        console.log('Considerando limpiar cache debido a recargas frecuentes');
        
        // Limpiar cache automáticamente si han pasado más de 24 horas
        clearProblematicStorage();
        localStorage.setItem('lastCacheClear', now.toString());
      }
    }
  }

})();

