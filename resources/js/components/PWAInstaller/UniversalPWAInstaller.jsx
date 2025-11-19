import React, { useState, useEffect } from 'react';
import './UniversalPWAInstaller.css';

const UniversalPWAInstaller = () => {
  const [showInstaller, setShowInstaller] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState({});
  const [installMethod, setInstallMethod] = useState('');
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Detectar información del dispositivo
    const detectDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);
      const isWindows = /windows/.test(userAgent);
      const isMac = /macintosh|mac os x/.test(userAgent);
      const isLinux = /linux/.test(userAgent);
      const isMobile = /mobile|android|iphone|ipad/.test(userAgent);
      
      // Detectar navegador
      let browser = 'unknown';
      if (userAgent.includes('chrome') && !userAgent.includes('edge')) browser = 'chrome';
      else if (userAgent.includes('firefox')) browser = 'firefox';
      else if (userAgent.includes('safari') && !userAgent.includes('chrome')) browser = 'safari';
      else if (userAgent.includes('edge')) browser = 'edge';
      else if (userAgent.includes('opera')) browser = 'opera';

      return {
        isIOS,
        isAndroid,
        isWindows,
        isMac,
        isLinux,
        isMobile,
        browser,
        userAgent
      };
    };

    const device = detectDevice();
    setDeviceInfo(device);

    // Verificar si ya está instalada
    const isAlreadyInstalled = 
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      localStorage.getItem('pwa-installed') === 'true';

    if (isAlreadyInstalled) {
      return;
    }

    // Escuchar beforeinstallprompt para Android/Desktop
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallMethod('native');
      setShowInstaller(true);
    };

    // Escuchar appinstalled
    const handleAppInstalled = () => {
      localStorage.setItem('pwa-installed', 'true');
      setShowInstaller(false);
      showSuccessMessage();
    };

    // Para iOS, mostrar instrucciones después de un delay
    if (device.isIOS) {
      const timer = setTimeout(() => {
        setInstallMethod('ios');
        setShowInstaller(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // Para Android/Desktop, escuchar eventos nativos
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Fallback: mostrar después de 5 segundos si no hay prompt nativo
    const fallbackTimer = setTimeout(() => {
      if (!deferredPrompt && !isAlreadyInstalled) {
        setInstallMethod('manual');
        setShowInstaller(true);
      }
    }, 5000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);

    try {
      if (deferredPrompt && installMethod === 'native') {
        // Instalación nativa para Android/Desktop
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          localStorage.setItem('pwa-installed', 'true');
          setShowInstaller(false);
          showSuccessMessage();
        }
        setDeferredPrompt(null);
      } else if (installMethod === 'ios') {
        // Para iOS, mostrar instrucciones
        showIOSInstructions();
      } else {
        // Instalación manual
        showManualInstructions();
      }
    } catch (error) {
      showErrorMessage('Error durante la instalación. Intenta nuevamente.');
    } finally {
      setIsInstalling(false);
    }
  };

  const showIOSInstructions = () => {
    // Ya no mostramos alert, solo cerramos el instalador
    setShowInstaller(false);
  };

  const showManualInstructions = () => {
    // Ya no mostramos alert, solo cerramos el instalador
    setShowInstaller(false);
  };

  const showSuccessMessage = () => {
    // El mensaje de éxito se muestra desde PWAInstallAlerts.jsx mediante el evento 'pwa-installed'
  };

  const showErrorMessage = (message) => {
    // Ya no mostramos alert de error
  };

  const handleDismiss = () => {
    setShowInstaller(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const getInstallButtonText = () => {
    if (isInstalling) return 'Instalando...';
    if (installMethod === 'ios') return 'Ver Instrucciones';
    if (installMethod === 'manual') return 'Ver Instrucciones';
    return 'Instalar App';
  };

  const getInstallDescription = () => {
    if (installMethod === 'ios') {
      return 'Toca para ver las instrucciones de instalación en iOS';
    }
    if (installMethod === 'manual') {
      return 'Toca para ver las instrucciones de instalación';
    }
    return 'Instala Cherry App para acceso rápido desde tu pantalla de inicio';
  };

  if (!showInstaller) return null;

  return (
    <div className="universal-pwa-installer">
      <div className="universal-pwa-installer__backdrop" onClick={handleDismiss}></div>
      <div className="universal-pwa-installer__modal">
        <div className="universal-pwa-installer__header">
          <div className="universal-pwa-installer__icon">
            <img src="/images/logo.svg" alt="Cherry App" />
          </div>
          <div className="universal-pwa-installer__title">
            <h3>¡Instala Cherry App!</h3>
            <p>{getInstallDescription()}</p>
          </div>
          <button 
            className="universal-pwa-installer__close"
            onClick={handleDismiss}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="universal-pwa-installer__content">
          <div className="universal-pwa-installer__benefits">
            <div className="benefit-item">
              <span className="benefit-icon">⚡</span>
              <span>Acceso más rápido</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">📱</span>
              <span>Experiencia nativa</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">🔔</span>
              <span>Notificaciones</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">💾</span>
              <span>Funciona offline</span>
            </div>
          </div>

          <div className="universal-pwa-installer__actions">
            <button 
              className="universal-pwa-installer__button universal-pwa-installer__button--primary"
              onClick={handleInstall}
              disabled={isInstalling}
            >
              {getInstallButtonText()}
            </button>
            <button 
              className="universal-pwa-installer__button universal-pwa-installer__button--secondary"
              onClick={handleDismiss}
            >
              Más tarde
            </button>
          </div>
        </div>

        {installMethod === 'ios' && (
          <div className="universal-pwa-installer__ios-hint">
            <p>💡 <strong>Tip:</strong> En iOS, busca el botón "Compartir" en la parte inferior de la pantalla</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UniversalPWAInstaller;
