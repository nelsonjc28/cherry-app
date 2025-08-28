import { useState, useEffect } from 'react';

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);

  const addDebugLog = (message, data = null) => {
    const log = {
      timestamp: new Date().toISOString(),
      message,
      data
    };
    console.log(`🔍 PWA Hook: ${message}`, data);
    setDebugLogs(prev => [...prev, log]);
  };

  useEffect(() => {
    addDebugLog('Hook inicializado');
    
    // Detectar si es iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);
    addDebugLog('iOS detectado', iOS);

    // Verificar si ya está en modo standalone (instalado)
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches;
      setIsStandalone(standalone);
      addDebugLog('Standalone check', standalone);
      return standalone;
    };

    // Verificar si ya está instalado
    if (checkStandalone()) {
      addDebugLog('Ya está instalado, saliendo');
      return;
    }

    // Escuchar el evento beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e) => {
      addDebugLog('beforeinstallprompt recibido', e);
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      addDebugLog('DeferredPrompt configurado');
    };

    // Escuchar cambios en el modo de visualización
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', (e) => {
      addDebugLog('Cambio en display-mode', e);
      checkStandalone();
    });

    // Agregar event listener
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    addDebugLog('Event listeners configurados');

    // Verificar si ya existe un prompt (para casos donde se recarga la página)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        addDebugLog('Service Worker listo', registration);
      });
    }

    return () => {
      addDebugLog('Limpiando event listeners');
      mediaQuery.removeEventListener('change', checkStandalone);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installPWA = async () => {
    addDebugLog('Intentando instalar PWA');
    
    if (deferredPrompt) {
      try {
        addDebugLog('Prompt disponible, ejecutando...');
        const { outcome } = await deferredPrompt.userChoice;
        
        addDebugLog('Resultado de instalación', outcome);
        
        if (outcome === 'accepted') {
          addDebugLog('Usuario aceptó instalar la PWA');
          setDeferredPrompt(null);
          setIsInstallable(false);
          return { success: true, outcome };
        } else {
          addDebugLog('Usuario rechazó instalar la PWA');
          return { success: false, outcome };
        }
      } catch (error) {
        addDebugLog('Error al instalar PWA', error);
        return { success: false, error };
      }
    }
    
    addDebugLog('No hay prompt disponible');
    return { success: false, reason: 'No prompt available' };
  };

  const resetPrompt = () => {
    addDebugLog('Reseteando prompt');
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const clearDebugLogs = () => {
    setDebugLogs([]);
  };

  return {
    deferredPrompt,
    isInstallable,
    isIOS,
    isStandalone,
    installPWA,
    resetPrompt,
    debugLogs,
    clearDebugLogs,
    addDebugLog
  };
};
