import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import './PWAInstaller.css';

const PWAInstaller = () => {

  
  const { deferredPrompt, isInstallable, isIOS, isIOSSafari, isStandalone, installPWA } = usePWAInstall();
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
  }, [isStandalone, isInstallable, isIOS]); // Dependencias actualizadas



  const handleInstallClick = async () => {





    
    if (isInstallable && deferredPrompt) {
      // Android/Chrome - Instalación automática

      try {
        // Mostrar el prompt nativo del navegador
        await deferredPrompt.prompt();
        
        // Esperar la respuesta del usuario
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {

          // Mostrar toast de éxito
          if (window.Toast) {
            window.Toast.show('¡Cherry App instalada exitosamente! 🎉', 'success', 4000);
          }
          setShowInstallModal(false);
        } else {

          if (window.Toast) {
            window.Toast.show('Instalación cancelada', 'warning', 3000);
          }
        }
        
        // El prompt se limpia automáticamente en el hook
      } catch (error) {
        console.error('Error durante la instalación:', error);
        if (window.Toast) {
          window.Toast.show('Error durante la instalación', 'error', 3000);
        }
      }
    } else if (isIOS) {
      // iOS - Mostrar instrucciones

      setShowIOSInstructions(true);
      setShowInstallModal(false);
    } else {
      // Detectar plataforma y mostrar instrucciones específicas
      const userAgent = navigator.userAgent;
      const isMac = /Mac|macOS/.test(userAgent);
      const isWindows = /Windows/.test(userAgent);
      const isAndroid = /Android/.test(userAgent);
      
      let message = '';
      
      if (isMac) {
        message = 'Para instalar Cherry App en Mac:\n\n1. Haz clic en el menú de Chrome (⋮) en la barra de direcciones\n2. Selecciona "Instalar Cherry App"\n3. Confirma la instalación\n\nLa app aparecerá en tu Launchpad y Dock.';
      } else if (isWindows) {
        message = 'Para instalar Cherry App en Windows:\n\n1. Haz clic en el menú de Chrome (⋮) en la barra de direcciones\n2. Selecciona "Instalar Cherry App"\n3. Confirma la instalación\n\nLa app aparecerá en tu menú de inicio y escritorio.';
      } else if (isAndroid) {
        message = 'Para instalar Cherry App en Android:\n\n1. Haz clic en el menú de Chrome (⋮)\n2. Selecciona "Agregar a pantalla de inicio"\n3. Confirma la instalación\n\nLa app aparecerá en tu pantalla de inicio.';
      } else if (userAgent.includes('Chrome')) {
        message = 'Para instalar Cherry App:\n\n1. Haz clic en el menú de Chrome (⋮) en la barra de direcciones\n2. Busca "Instalar Cherry App" o "Agregar a pantalla de inicio"\n3. Confirma la instalación';
      } else {
        message = 'Para instalar esta app:\n\n1. Busca la opción "Instalar" o "Agregar a pantalla de inicio" en el menú de tu navegador\n2. Confirma la instalación\n\nNota: No todos los navegadores soportan la instalación de PWAs.';
      }
      
      alert(message);
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

  const handleShowInstallModal = () => {


    setShowInstallModal(true);

  };



  // No mostrar nada si ya está instalado o si ya se mostró el modal

  
  // Siempre mostrar el botón flotante, independientemente del estado
  // El modal se puede mostrar manualmente incluso si ya se mostró antes
  const shouldShowModal = !isStandalone;


  
  return (
    <>

      {/* Modal principal de instalación */}
      {(() => {
        const shouldRender = showInstallModal && shouldShowModal;

        return shouldRender;
      })() && (
        <div 
          className="pwa-installer__modal-overlay" 
          onClick={closeInstallModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
        >
          <div 
            className="pwa-installer__modal" 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '24px',
              maxWidth: '90vw',
              width: '400px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              position: 'relative'
            }}
          >
            <div 
              className="pwa-installer__modal-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '24px 24px 16px',
                borderBottom: '1px solid #f0f0f0',
                position: 'relative'
              }}
            >
              <div 
                className="pwa-installer__modal-icon"
                style={{ 
                  width: '48px',
                  height: '48px',
                  marginRight: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img 
                  src="/images/logo.svg" 
                  alt="Cherry App" 
                  style={{ 
                    width: '100%', 
                    height: 'auto',
                    maxHeight: '48px'
                  }} 
                />
              </div>
              <h3 
                style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#333',
                  flex: 1
                }}
              >
                ¡Instala Cherry App!
              </h3>
              <button 
                className="pwa-installer__modal-close"
                onClick={closeInstallModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#999',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>
            
            <div 
              className="pwa-installer__modal-content"
              style={{ padding: '24px' }}
            >
              <p 
                className="pwa-installer__modal-description"
                style={{
                  margin: '0 0 24px 0',
                  fontSize: '16px',
                  lineHeight: 1.5,
                  color: '#666'
                }}
              >
                Accede más rápido a Cherry desde tu pantalla de inicio. 
                Disfruta de una experiencia como app nativa.
              </p>
              
              <div 
                className="pwa-installer__benefits"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  marginBottom: '24px'
                }}
              >
                <div 
                  className="pwa-installer__benefit"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '14px',
                    color: '#333'
                  }}
                >
                  <span className="pwa-installer__benefit-icon" style={{ fontSize: '20px', width: '24px', textAlign: 'center' }}>🚀</span>
                  <span>Acceso rápido</span>
                </div>
                <div 
                  className="pwa-installer__benefit"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '14px',
                    color: '#333'
                  }}
                >
                  <span className="pwa-installer__benefit-icon" style={{ fontSize: '20px', width: '24px', textAlign: 'center' }}>📱</span>
                  <span>Como app nativa</span>
                </div>
                <div 
                  className="pwa-installer__benefit"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '14px',
                    color: '#333'
                  }}
                >
                  <span className="pwa-installer__benefit-icon" style={{ fontSize: '20px', width: '24px', textAlign: 'center' }}>⚡</span>
                  <span>Funciona offline</span>
                </div>
              </div>
            </div>
            
            <div 
              className="pwa-installer__modal-footer"
              style={{
                padding: '16px 24px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <button 
                className="pwa-installer__modal-button pwa-installer__modal-button--primary"
                onClick={handleInstallClick}
                style={{
                  padding: '14px 24px',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #E91E63, #9C27B0)',
                  color: 'white',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
              >
                {isIOS ? 'Instalar en iOS' : 'Instalar Ahora'}
              </button>
              
              <button 
                className="pwa-installer__modal-button pwa-installer__modal-button--secondary"
                onClick={handleDontShowAgain}
                style={{
                  padding: '14px 24px',
                  border: '2px solid #e9ecef',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: '#f8f9fa',
                  color: '#666',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
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
              {isIOS && !isIOSSafari && (
                <div style={{ 
                  background: '#f8d7da', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  marginBottom: '16px',
                  border: '1px solid #f5c6cb'
                }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#721c24', lineHeight: 1.5 }}>
                    ⛔ <strong>No estás en Safari:</strong> Para instalar la app en iOS, debes abrir esta página en <strong>Safari</strong>. 
                    Copia esta URL y ábrela en Safari para continuar.
                  </p>
                </div>
              )}
              {isIOSSafari && (
                <div style={{ 
                  background: '#d4edda', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  marginBottom: '16px',
                  border: '1px solid #c3e6cb'
                }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#155724' }}>
                    ✅ <strong>Perfecto:</strong> Estás usando Safari. Sigue los pasos a continuación para instalar.
                  </p>
                </div>
              )}

              <div className="pwa-installer__step">
                <div className="pwa-installer__step-number">1</div>
                <div className="pwa-installer__step-text">
                  Toca el botón <strong>Compartir</strong> <span style={{ 
                    display: 'inline-block',
                    fontSize: '20px',
                    verticalAlign: 'middle',
                    marginLeft: '4px'
                  }}>⬆️</span> en la barra inferior de Safari
                </div>
              </div>
              
              <div className="pwa-installer__step">
                <div className="pwa-installer__step-number">2</div>
                <div className="pwa-installer__step-text">
                  Desplázate hacia abajo y selecciona <strong>"Agregar a Pantalla de Inicio"</strong> <span style={{ fontSize: '18px' }}>➕</span>
                </div>
              </div>
              
              <div className="pwa-installer__step">
                <div className="pwa-installer__step-number">3</div>
                <div className="pwa-installer__step-text">
                  Personaliza el nombre (opcional) y toca <strong>"Agregar"</strong> para confirmar ✅
                </div>
              </div>
              
              <div className="pwa-installer__ios-preview">
                <div className="pwa-installer__ios-preview-content">
                  <div className="pwa-installer__ios-preview-header">
                    <div className="pwa-installer__ios-preview-icon">
                      <img 
                        src="/images/logo.svg" 
                        alt="Cherry App" 
                        style={{ 
                          width: '24px', 
                          height: '24px'
                        }} 
                      />
                    </div>
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
