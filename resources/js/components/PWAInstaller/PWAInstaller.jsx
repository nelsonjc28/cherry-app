import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import './PWAInstaller.css';

const PWAInstaller = () => {

  
  const { deferredPrompt, isInstallable, isIOS, isStandalone, installPWA } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const [hasShownModal, setHasShownModal] = useState(false);



  useEffect(() => {

    
    // Verificar si ya se mostró el modal anteriormente
    const modalShown = localStorage.getItem('pwa-modal-shown');
    if (modalShown === 'true') {
      setHasShownModal(true);
      return;
    }
    
    // Detectar si es móvil
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // En desarrollo, mostrar siempre (para testing)
    const isDevelopment = process.env.NODE_ENV === 'development';
    const forceShow = isDevelopment && !isMobile;
    
    // Solo mostrar en móviles o forzar en desarrollo
    if (!isMobile && !forceShow) {
      return;
    }

    // Verificar si ya está instalado
    if (isStandalone) {
      return;
    }

    // Mostrar modal después de 3 segundos (o inmediatamente en desarrollo)
    const delay = forceShow ? 1000 : 3000;
    const timer = setTimeout(() => {
      setShowInstallModal(true);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [isStandalone]); // Solo dependemos de isStandalone



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
    } else {
      // Mostrar mensaje de error
      alert('No se puede instalar en este momento. Verifica que estés usando Chrome en Android o Safari en iOS.');
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
    setHasShownModal(true);
    localStorage.setItem('pwa-modal-shown', 'true');
  };



  // No mostrar nada si ya está instalado o si ya se mostró el modal
  if (isStandalone || hasShownModal) {
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
                <div className="pwa-installer__ios-preview-content">
                  <div className="pwa-installer__ios-preview-header">
                    <div className="pwa-installer__ios-preview-icon">🍒</div>
                    <div className="pwa-installer__ios-preview-text">
                      <strong>Cherry App</strong>
                      <span>cherry-app.com</span>
                    </div>
                  </div>
                  <div className="pwa-installer__ios-preview-button">
                    Agregar
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pwa-installer__modal-footer">
              <button 
                className="pwa-installer__modal-button pwa-installer__modal-button--primary"
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
