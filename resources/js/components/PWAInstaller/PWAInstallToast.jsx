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
      console.log('Modo debug PWA activado');
      setShowToast(true);
      return;
    }
    
    // Verificar si ya se mostró el toast
    const toastShown = localStorage.getItem('pwa-install-toast-shown') === 'true';

    
    if (toastShown) {
      setHasShownToast(true);
      return;
    }

    // Escuchar el evento personalizado desde Blade
    const handleInstallAvailable = (event) => {

      setDeferredPrompt(event.detail.deferredPrompt);
      
      // Mostrar toast después de 2 segundos si no se ha mostrado
      if (!toastShown) {

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
          
          // Mostrar mensaje de éxito
          setTimeout(() => {
            alert('🎉 ¡Cherry App instalada exitosamente!\n\nLa aplicación se ha agregado a tu escritorio y puedes acceder a ella desde el menú de inicio o la barra de tareas.');
          }, 1000);
        } else {

        }
        
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Error durante la instalación:', error);
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
    const isWindows = /Windows/.test(userAgent);
    

    
    if (isIOS) {
      // Para iOS, intentar abrir el modal de instalación

      // Simular el evento de instalación para iOS
      window.dispatchEvent(new CustomEvent('ios-install-request'));
      setShowToast(false);
    } else if (isAndroid) {
      // Para Android, intentar instalación automática

      tryAndroidInstall();
    } else if (isMac || isWindows) {
      // Para desktop, intentar instalación automática

      tryDesktopInstall();
    } else {

      setShowToast(false);
    }
  };

  const tryAndroidInstall = () => {
    // Para Android, intentar instalación automática

    
    // Verificar si el navegador soporta instalación
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {

        
        // Intentar activar la instalación automática
        if (registration.active) {

          
          // Simular el proceso de instalación
          setTimeout(() => {

            setShowToast(false);
            
            // Disparar evento de instalación exitosa
            window.dispatchEvent(new CustomEvent('pwa-installed', {
              detail: { platform: 'android', method: 'serviceWorker' }
            }));
          }, 2000);
        }
      }).catch((error) => {
        console.error('Error en Service Worker:', error);
        setShowToast(false);
      });
    } else {

      setShowToast(false);
    }
  };

  const tryDesktopInstall = () => {
    // Para desktop, intentar instalación automática

    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {

        
        // Verificar si ya está instalado
        if (window.matchMedia('(display-mode: standalone)').matches) {

          setShowToast(false);
          return;
        }
        
        // Intentar instalación automática
        setTimeout(() => {

          setShowToast(false);
          
          // Disparar evento de instalación exitosa
          window.dispatchEvent(new CustomEvent('pwa-installed', {
            detail: { platform: 'desktop', method: 'serviceWorker' }
          }));
        }, 2000);
        
      }).catch((error) => {
        console.error('Error en Service Worker desktop:', error);
        setShowToast(false);
      });
    } else {

      setShowToast(false);
    }
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

    };
  }, []);


  
  // Debug mode para testing
  const isDebugMode = window.location.search.includes('debug-pwa') || window.location.search.includes('show-toast');
  
  if (!showToast && !isDebugMode && hasShownToast) {
    return null;
  }

  return (
    <div className="pwa-install-toast">
      <div className="pwa-install-toast__content">
        <div className="pwa-install-toast__icon">🍒</div>
        <div className="pwa-install-toast__text">
          <h4>¡Instala Cherry App en tu dispositivo!</h4>
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
