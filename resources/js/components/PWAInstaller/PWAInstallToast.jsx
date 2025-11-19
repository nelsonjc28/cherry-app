import React, { useState, useEffect } from 'react';
import './PWAInstallToast.css';

const PWAInstallToast = () => {
  const [showToast, setShowToast] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [hasShownToast, setHasShownToast] = useState(false);



  useEffect(() => {
    // Modo debug: mostrar siempre si está en la URL
    const isDebugMode = window.location.search.includes('debug-pwa') || window.location.search.includes('show-toast');
    
    if (isDebugMode) {
      setShowToast(true);
      return;
    }
    
    // Verificar si ya se mostró el toast
    const toastShown = localStorage.getItem('pwa-install-toast-shown') === 'true';;
    
    if (toastShown) {
      setHasShownToast(true);;
      // No hacer return aquí - seguir escuchando eventos para permitir reset
    }

    // Escuchar el evento personalizado desde Blade
    const handleInstallAvailable = (event) => {
      setDeferredPrompt(event.detail.deferredPrompt);
      
      // Verificar nuevamente el localStorage por si se limpió
      const currentToastShown = localStorage.getItem('pwa-install-toast-shown') === 'true';
      
      // Mostrar toast después de 2 segundos si no se ha mostrado
      if (!currentToastShown) {
        setTimeout(() => {
          setShowToast(true);
        }, 2000);
      }
    };

    // Escuchar el evento
    window.addEventListener('pwa-install-available', handleInstallAvailable);

    // Mostrar toast automáticamente después de 3 segundos (fallback)
    const fallbackTimer = setTimeout(() => {
      if (!toastShown) {
        setShowToast(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstall = async () => {

    
    if (deferredPrompt) {
      try {
        // Instalación automática con prompt nativo

        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {

          setShowToast(false);
          
          // Marcar como instalada manualmente
          localStorage.setItem('pwa-manually-installed', 'true');
          
          // Disparar evento de instalación exitosa
          window.dispatchEvent(new CustomEvent('pwa-installed', {
            detail: { platform: 'native', method: 'prompt' }
          }));
          
          // Ya no mostramos alert aquí, se muestra desde PWAInstallAlerts
        } else {

        }
        
        setDeferredPrompt(null);
      } catch (error) {
        // Intentar instalación alternativa
        attemptAlternativeInstall();
      }
    } else {
      // Instalación automática sin prompt

      attemptAlternativeInstall();
    }
  };

  const attemptAlternativeInstall = () => {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isMac = /Mac|macOS/.test(userAgent);
    const isWindows = /Windows/.test(userAgent);;
    
    if (isIOS) {
      // Para iOS, mostrar instrucciones específicas
      showIOSInstructions();
      setShowToast(false);
    } else if (isAndroid) {
      // Para Android, intentar instalación automática
      tryAndroidInstall();
    } else if (isMac || isWindows) {
      // Para desktop, intentar instalación automática
      tryDesktopInstall();
    } else {
      // Para otros dispositivos, mostrar instrucciones generales
      showGeneralInstructions();
      setShowToast(false);
    }
  };

  const showIOSInstructions = () => {
    // Ya no mostramos alert de instrucciones
  };

  const showGeneralInstructions = () => {
    // Ya no mostramos alert de instrucciones
  };

  const tryAndroidInstall = () => {
    // Ya no mostramos alert de instrucciones
    setShowToast(false);
  };

  const tryDesktopInstall = () => {
    // Ya no mostramos alert de instrucciones
    setShowToast(false);
  };

  const handleDismiss = () => {
    setShowToast(false);
    localStorage.setItem('pwa-install-toast-shown', 'true');
    setHasShownToast(true);
  };

  // Función global para forzar mostrar el toast (para testing)
  useEffect(() => {
    window.forceShowPWAToast = () => {
      localStorage.removeItem('pwa-install-toast-shown');
      setHasShownToast(false);
      setShowToast(true);
    };
    
    window.clearPWAInstallCache = () => {
      localStorage.removeItem('pwa-install-toast-shown');
      localStorage.removeItem('pwa-modal-shown');
      localStorage.removeItem('pwa-manually-installed');
      localStorage.removeItem('pwa-installed');
      setHasShownToast(false);
      setShowToast(false);
    };
    
    // Función para mostrar el toast inmediatamente
    window.showPWAToastNow = () => {
      setShowToast(true);
    };
  }, []);


  
  // Debug mode para testing
  const isDebugMode = window.location.search.includes('debug-pwa') || window.location.search.includes('show-toast');
  
  if (!showToast && !isDebugMode && hasShownToast) {
    return null;
  }

  return (
    <div className="pwa-install-toast">
      <button 
        className="pwa-install-toast__close"
        onClick={handleDismiss}
        aria-label="Cerrar"
      >
        ×
      </button>
      <div className="pwa-install-toast__content">
        <div className="pwa-install-toast__icon">
          <img src="/images/logo.svg" alt="Cherry App" />
        </div>
        <div className="pwa-install-toast__text">
          <h4>¡Instala Cherry App!</h4>
          <p>Accede más rápido desde tu pantalla de inicio</p>
        </div>
        <div className="pwa-install-toast__actions">
          <button 
            className="pwa-install-toast__button pwa-install-toast__button--primary"
            onClick={handleInstall}
          >
            Instalar
          </button>
          <button 
            className="pwa-install-toast__button pwa-install-toast__button--secondary"
            onClick={handleDismiss}
          >
            Más tarde
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallToast;
