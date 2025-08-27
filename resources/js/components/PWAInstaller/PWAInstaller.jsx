import React, { useState, useEffect } from 'react';
import './PWAInstaller.css';

const PWAInstaller = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Detectar si es iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Escuchar el evento beforeinstallprompt (Android/Chrome)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    });

    // Verificar si ya está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android/Chrome
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('Usuario aceptó instalar la PWA');
        setShowInstallButton(false);
      }
      
      setDeferredPrompt(null);
    } else if (isIOS) {
      // Mostrar instrucciones para iOS
      setShowIOSInstructions(true);
    }
  };

  const closeIOSInstructions = () => {
    setShowIOSInstructions(false);
  };

  if (!showInstallButton && !showIOSInstructions) {
    return null;
  }

  return (
    <>
      {/* Botón de instalación */}
      {showInstallButton && (
        <div className="pwa-installer">
          <div className="pwa-installer__content">
            <div className="pwa-installer__icon">🍒</div>
            <div className="pwa-installer__text">
              <h3>Instalar Cherry App</h3>
              <p>Accede más rápido desde tu pantalla de inicio</p>
            </div>
            <button 
              className="pwa-installer__button"
              onClick={handleInstallClick}
            >
              {isIOS ? 'Instalar en iOS' : 'Instalar'}
            </button>
          </div>
        </div>
      )}

      {/* Modal de instrucciones para iOS */}
      {showIOSInstructions && (
        <div className="pwa-installer__modal-overlay" onClick={closeIOSInstructions}>
          <div className="pwa-installer__modal" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-installer__modal-header">
              <h3>📱 Instalar en iPhone/iPad</h3>
              <button 
                className="pwa-installer__modal-close"
                onClick={closeIOSInstructions}
              >
                ✕
              </button>
            </div>
            
            <div className="pwa-installer__modal-content">
              <div className="pwa-installer__step">
                <div className="pwa-installer__step-number">1</div>
                <div className="pwa-installer__step-text">
                  Toca el botón <strong>Compartir</strong> <span className="ios-share">⎋</span> en Safari
                </div>
              </div>
              
              <div className="pwa-installer__step">
                <div className="pwa-installer__step-number">2</div>
                <div className="pwa-installer__step-text">
                  Selecciona <strong>"Agregar a Pantalla de Inicio"</strong>
                </div>
              </div>
              
              <div className="pwa-installer__step">
                <div className="pwa-installer__step-number">3</div>
                <div className="pwa-installer__step-text">
                  Toca <strong>"Agregar"</strong> para confirmar
                </div>
              </div>
              
              <div className="pwa-installer__ios-preview">
                <div className="pwa-installer__ios-screen">
                  <div className="pwa-installer__ios-status-bar"></div>
                  <div className="pwa-installer__ios-content">
                    <div className="pwa-installer__ios-app-icon">🍒</div>
                    <div className="pwa-installer__ios-app-name">Cherry</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pwa-installer__modal-footer">
              <button 
                className="pwa-installer__modal-button"
                onClick={closeIOSInstructions}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstaller;
