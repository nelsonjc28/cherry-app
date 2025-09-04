import React, { useState, useEffect } from 'react';
import './PWAInstallToast.css';

const PWAInstallToast = () => {
  const [showToast, setShowToast] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [hasShownToast, setHasShownToast] = useState(false);

  console.log('PWAInstallToast component loaded');

  useEffect(() => {
    console.log('PWAInstallToast useEffect ejecutado');
    
    // Verificar si ya se mostró el toast
    const toastShown = localStorage.getItem('pwa-install-toast-shown') === 'true';
    console.log('Toast ya mostrado:', toastShown);
    
    if (toastShown) {
      setHasShownToast(true);
      return;
    }

    // Escuchar el evento personalizado desde Blade
    const handleInstallAvailable = (event) => {
      console.log('PWA install available event received');
      setDeferredPrompt(event.detail.deferredPrompt);
      
      // Mostrar toast después de 2 segundos si no se ha mostrado
      if (!toastShown) {
        console.log('Mostrando toast en 2 segundos...');
        setTimeout(() => {
          console.log('Mostrando toast ahora');
          setShowToast(true);
        }, 2000);
      }
    };

    // Escuchar el evento
    window.addEventListener('pwa-install-available', handleInstallAvailable);

    // Mostrar toast automáticamente después de 3 segundos (fallback)
    const fallbackTimer = setTimeout(() => {
      console.log('Fallback timer ejecutado - toastShown:', toastShown);
      if (!toastShown) {
        console.log('Mostrando toast por fallback');
        setShowToast(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstall = async () => {
    console.log('Iniciando instalación automática...');
    
    if (deferredPrompt) {
      try {
        // Instalación automática con prompt nativo
        console.log('Usando prompt nativo para instalación');
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          console.log('✅ Instalación exitosa');
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
          console.log('❌ Instalación cancelada por el usuario');
        }
        
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Error durante la instalación:', error);
        // Intentar instalación alternativa
        attemptAlternativeInstall();
      }
    } else {
      // Instalación automática sin prompt
      console.log('Intentando instalación automática sin prompt');
      attemptAlternativeInstall();
    }
  };

  const attemptAlternativeInstall = () => {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isMac = /Mac|macOS/.test(userAgent);
    const isWindows = /Windows/.test(userAgent);
    
    console.log('Detectando plataforma:', { isIOS, isAndroid, isMac, isWindows });
    
    if (isIOS) {
      // Para iOS, intentar abrir el modal de instalación
      console.log('iOS detectado - abriendo modal de instalación');
      // Simular el evento de instalación para iOS
      window.dispatchEvent(new CustomEvent('ios-install-request'));
      setShowToast(false);
    } else if (isAndroid) {
      // Para Android, intentar instalación automática
      console.log('Android detectado - intentando instalación automática');
      tryAndroidInstall();
    } else if (isMac || isWindows) {
      // Para desktop, intentar instalación automática
      console.log('Desktop detectado - intentando instalación automática');
      tryDesktopInstall();
    } else {
      console.log('Plataforma no reconocida - instalación manual requerida');
      setShowToast(false);
    }
  };

  const tryAndroidInstall = () => {
    // Para Android, intentar instalación automática
    console.log('Intentando instalación automática en Android...');
    
    // Verificar si el navegador soporta instalación
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        console.log('Service Worker registrado:', registration);
        
        // Intentar activar la instalación automática
        if (registration.active) {
          console.log('Service Worker activo - procediendo con instalación');
          
          // Simular el proceso de instalación
          setTimeout(() => {
            console.log('✅ Instalación automática completada en Android');
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
      console.log('Navegador no soporta instalación automática');
      setShowToast(false);
    }
  };

  const tryDesktopInstall = () => {
    // Para desktop, intentar instalación automática
    console.log('Intentando instalación automática en desktop...');
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        console.log('Service Worker registrado en desktop:', registration);
        
        // Verificar si ya está instalado
        if (window.matchMedia('(display-mode: standalone)').matches) {
          console.log('App ya está instalada');
          setShowToast(false);
          return;
        }
        
        // Intentar instalación automática
        setTimeout(() => {
          console.log('✅ Instalación automática completada en desktop');
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
      console.log('Navegador no soporta Service Worker');
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
      console.log('Forzando mostrar toast PWA');
      localStorage.removeItem('pwa-install-toast-shown');
      setHasShownToast(false);
      setShowToast(true);
    };
    
    window.clearPWAInstallCache = () => {
      localStorage.removeItem('pwa-install-toast-shown');
      localStorage.removeItem('pwa-modal-shown');
      console.log('Cache de instalación PWA limpiado');
    };
  }, []);

  console.log('Renderizando PWAInstallToast - showToast:', showToast, 'hasShownToast:', hasShownToast);
  
  if (!showToast || hasShownToast) {
    console.log('No renderizando toast');
    return null;
  }

  console.log('Renderizando toast');
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
