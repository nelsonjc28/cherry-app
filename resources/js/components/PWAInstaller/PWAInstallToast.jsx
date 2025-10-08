import React, { useState, useEffect } from 'react';
import './PWAInstallToast.css';

const PWAInstallToast = () => {
  const [showToast, setShowToast] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [hasShownToast, setHasShownToast] = useState(false);



  useEffect(() => {
    console.log('PWAInstallToast: Inicializando...');
    
    // Modo debug: mostrar siempre si está en la URL
    const isDebugMode = window.location.search.includes('debug-pwa') || window.location.search.includes('show-toast');
    
    if (isDebugMode) {
      console.log('PWAInstallToast: Modo debug activado');
      setShowToast(true);
      return;
    }
    
    // Verificar si ya se mostró el toast
    const toastShown = localStorage.getItem('pwa-install-toast-shown') === 'true';
    console.log('PWAInstallToast: Toast ya mostrado?', toastShown);
    
    if (toastShown) {
      setHasShownToast(true);
      console.log('PWAInstallToast: Toast ya se mostró antes, no mostrar');
      // No hacer return aquí - seguir escuchando eventos para permitir reset
    }

    // Escuchar el evento personalizado desde Blade
    const handleInstallAvailable = (event) => {
      console.log('PWAInstallToast: Evento pwa-install-available recibido', event.detail);
      setDeferredPrompt(event.detail.deferredPrompt);
      
      // Verificar nuevamente el localStorage por si se limpió
      const currentToastShown = localStorage.getItem('pwa-install-toast-shown') === 'true';
      
      // Mostrar toast después de 2 segundos si no se ha mostrado
      if (!currentToastShown) {
        console.log('PWAInstallToast: Mostrando toast en 2 segundos...');
        setTimeout(() => {
          setShowToast(true);
        }, 2000);
      }
    };

    // Escuchar el evento
    window.addEventListener('pwa-install-available', handleInstallAvailable);

    // Mostrar toast automáticamente después de 3 segundos (fallback)
    const fallbackTimer = setTimeout(() => {
      console.log('PWAInstallToast: Fallback timer ejecutado, toastShown:', toastShown);
      if (!toastShown) {
        console.log('PWAInstallToast: Mostrando toast por fallback');
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
    
    console.log('Intentando instalación alternativa para:', { isIOS, isAndroid, isMac, isWindows });
    
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
    const message = `
📱 Instalar Cherry App en iOS:

1. Toca el botón "Compartir" (📤) en la parte inferior
2. Desplázate hacia abajo y selecciona "Agregar a pantalla de inicio"
3. Personaliza el nombre si deseas
4. Toca "Agregar" en la esquina superior derecha

¡Listo! Cherry App aparecerá en tu pantalla de inicio.
    `;
    
    alert(message);
  };

  const showGeneralInstructions = () => {
    const message = `
📱 Instalar Cherry App:

• Android: Busca el ícono ⊕ en la barra de direcciones
• iOS: Usa el botón "Compartir" → "Agregar a pantalla de inicio"
• Desktop: Busca el ícono ⊕ en la barra de direcciones

¡Instala Cherry App para acceso rápido!
    `;
    
    alert(message);
  };

  const tryAndroidInstall = () => {
    // Para Android, mostrar instrucciones específicas
    console.log('Intentando instalación en Android');
    
    const message = `
📱 Instalar Cherry App en Android:

1. Busca el ícono ⊕ en la barra de direcciones
2. Toca "Instalar Cherry App" o "Agregar a pantalla de inicio"
3. Confirma la instalación

O alternativamente:
• Toca el menú ⋮ (tres puntos)
• Selecciona "Agregar a pantalla de inicio"
    `;
    
    alert(message);
    setShowToast(false);
  };

  const tryDesktopInstall = () => {
    // Para desktop, mostrar instrucciones específicas
    console.log('Intentando instalación en Desktop');
    
    const message = `
💻 Instalar Cherry App en Escritorio:

1. Busca el ícono ⊕ en la barra de direcciones
2. Haz clic en "Instalar Cherry App"
3. Confirma la instalación

O alternativamente:
• Menú ⋮ → "Instalar Cherry App"
• O usa Ctrl+Shift+I → Application → Install
    `;
    
    alert(message);
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
      console.log('PWAInstallToast: Forzando mostrar toast...');
      localStorage.removeItem('pwa-install-toast-shown');
      setHasShownToast(false);
      setShowToast(true);
    };
    
    window.clearPWAInstallCache = () => {
      console.log('PWAInstallToast: Limpiando cache...');
      localStorage.removeItem('pwa-install-toast-shown');
      localStorage.removeItem('pwa-modal-shown');
      localStorage.removeItem('pwa-manually-installed');
      localStorage.removeItem('pwa-installed');
      setHasShownToast(false);
      setShowToast(false);
    };
    
    // Función para mostrar el toast inmediatamente
    window.showPWAToastNow = () => {
      console.log('PWAInstallToast: Mostrando toast inmediatamente...');
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
