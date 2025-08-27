import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import './PWAInstaller.css';

const PWAInstaller = () => {
  const { deferredPrompt, isInstallable, isIOS, isStandalone, installPWA } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Detectar si es móvil
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Solo mostrar en móviles
    if (!isMobile) return;

    // Verificar si ya está instalado
    if (isStandalone) {
      return;
    }

    // Verificar si ya se mostró el modal en esta sesión
    if (localStorage.getItem('pwa-modal-shown')) {
      return;
    }

    // Mostrar modal después de 3 segundos
    const timer = setTimeout(() => {
      setShowInstallModal(true);
      localStorage.setItem('pwa-modal-shown', 'true');
    }, 3000);

    return () => clearTimeout(timer);
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (isInstallable && deferredPrompt) {
      // Android/Chrome
      const result = await installPWA();
      if (result.success) {
        setShowInstallModal(false);
      }
    } else if (isIOS) {
      // Mostrar instrucciones para iOS
      setShowIOSInstructions(true);
      setShowInstallModal(false);
    }
  };

  const closeInstallModal = () => {
    setShowInstallModal(false);
  };

  const closeIOSInstructions = () => {
    setShowIOSInstructions(false);
  };

  const handleDontShowAgain = () => {
    setShowInstallModal(false);
    localStorage.setItem('pwa-modal-shown', 'true');
  };

  // No mostrar nada si ya está instalado o no es móvil
  if (isStandalone || (!showInstallModal && !showIOSInstructions)) {
    return null;
  }

  return (
    <>
      {/* Modal principal de instalación */}
      {showInstallModal && (
        <div className="pwa-installer__modal-overlay" onClick={closeInstallModal}>
          <div className="pwa-installer__modal" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-installer__modal-header">
              <div className="pwa-installer__modal-icon">🍒</div>
              <h3>¡Instala Cherry App!</h3>
              <button 
                className="pwa-installer__modal-close"
                onClick={closeInstallModal}
              >
                ✕
              </button>
            </div>
            
            <div className="pwa-installer__modal-content">
              <p className="pwa-installer__modal-description">
                Accede más rápido a Cherry desde tu pantalla de inicio. 
                Disfruta de una experiencia como app nativa.
              </p>
              
              <div className="pwa-installer__benefits">
                <div className="pwa-installer__benefit">
                  <span className="pwa-installer__benefit-icon">🚀</span>
                  <span>Acceso rápido</span>
                </div>
                <div className="pwa-installer__benefit">
                  <span className="pwa-installer__benefit-icon">📱</span>
                  <span>Como app nativa</span>
                </div>
                <div className="pwa-installer__benefit">
                  <span className="pwa-installer__benefit-icon">⚡</span>
                  <span>Funciona offline</span>
                </div>
              </div>
            </div>
            
            <div className="pwa-installer__modal-footer">
              <button 
                className="pwa-installer__modal-button pwa-installer__modal-button--primary"
                onClick={handleInstallClick}
              >
                {isIOS ? 'Instalar en iOS' : 'Instalar Ahora'}
              </button>
              
              <button 
                className="pwa-installer__modal-button pwa-installer__modal-button--secondary"
                onClick={handleDontShowAgain}
              >
                No mostrar de nuevo
              </button>
            </div>
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
