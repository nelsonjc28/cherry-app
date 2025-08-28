import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import './PWAInstaller.css';

const PWAInstaller = () => {
  console.log('🔍 PWAInstaller: Iniciando componente');
  
  const { deferredPrompt, isInstallable, isIOS, isStandalone, installPWA } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});
  const [hasShownModal, setHasShownModal] = useState(false);

  console.log('🔍 PWAInstaller: Valores del hook:', { deferredPrompt, isInstallable, isIOS, isStandalone });

  useEffect(() => {
    console.log('🔍 PWAInstaller: Componente montado');
    console.log('🔍 PWAInstaller: isStandalone =', isStandalone);
    
    // Verificar si ya se mostró el modal anteriormente
    const modalShown = localStorage.getItem('pwa-modal-shown');
    if (modalShown === 'true') {
      console.log('🔍 PWAInstaller: Modal ya se mostró anteriormente, saliendo');
      setHasShownModal(true);
      return;
    }
    
    // Detectar si es móvil
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('🔍 PWAInstaller: isMobile =', isMobile);
    
    // En desarrollo, mostrar siempre (para testing)
    const isDevelopment = process.env.NODE_ENV === 'development';
    const forceShow = isDevelopment && !isMobile;
    console.log('🔍 PWAInstaller: isDevelopment =', isDevelopment);
    console.log('🔍 PWAInstaller: forceShow =', forceShow);
    
    // Solo mostrar en móviles o forzar en desarrollo
    if (!isMobile && !forceShow) {
      console.log('🔍 PWAInstaller: No es móvil ni desarrollo forzado, saliendo');
      return;
    }

    // Verificar si ya está instalado
    if (isStandalone) {
      console.log('🔍 PWAInstaller: Ya está instalado, saliendo');
      return;
    }

    // Mostrar modal después de 3 segundos (o inmediatamente en desarrollo)
    const delay = forceShow ? 1000 : 3000;
    console.log('🔍 PWAInstaller: Configurando timer para mostrar modal en', delay, 'ms');
    
    const timer = setTimeout(() => {
      console.log('🔍 PWAInstaller: Mostrando modal');
      setShowInstallModal(true);
    }, delay);

    return () => {
      console.log('🔍 PWAInstaller: Limpiando timer');
      clearTimeout(timer);
    };
  }, [isStandalone]); // Solo dependemos de isStandalone

  // Actualizar debug info cuando cambien las variables
  useEffect(() => {
    const newDebugInfo = {
      deferredPrompt: !!deferredPrompt,
      isInstallable,
      isIOS,
      isStandalone,
      userAgent: navigator.userAgent,
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isDevelopment: process.env.NODE_ENV === 'development'
    };
    
    console.log('🔍 PWAInstaller: Debug info actualizada:', newDebugInfo);
    setDebugInfo(newDebugInfo);
  }, [deferredPrompt, isInstallable, isIOS, isStandalone]);

  const handleInstallClick = async () => {
    console.log('🔍 Botón de instalar presionado');
    console.log('📱 Debug Info:', debugInfo);
    
    if (isInstallable && deferredPrompt) {
      console.log('✅ Android/Chrome: Instalando...');
      // Android/Chrome
      const result = await installPWA();
      console.log('📊 Resultado de instalación:', result);
      if (result.success) {
        setShowInstallModal(false);
      }
    } else if (isIOS) {
      console.log('🍎 iOS: Mostrando instrucciones...');
      // Mostrar instrucciones para iOS
      setShowIOSInstructions(true);
      setShowInstallModal(false);
    } else {
      console.log('❌ No se puede instalar:', { isInstallable, deferredPrompt, isIOS });
      // Mostrar mensaje de error
      alert('No se puede instalar en este momento. Verifica que estés usando Chrome en Android o Safari en iOS.');
    }
  };

  const closeInstallModal = () => {
    console.log('🔍 PWAInstaller: Cerrando modal');
    setShowInstallModal(false);
  };

  const closeIOSInstructions = () => {
    setShowIOSInstructions(false);
  };

  const handleDontShowAgain = () => {
    console.log('🔍 PWAInstaller: No mostrar de nuevo seleccionado');
    setShowInstallModal(false);
    setHasShownModal(true);
    localStorage.setItem('pwa-modal-shown', 'true');
  };

  // Botón de prueba para desarrollo
  const showTestModal = () => {
    console.log('🔍 PWAInstaller: Mostrando modal de prueba');
    setShowInstallModal(true);
  };

  // No mostrar nada si ya está instalado o si ya se mostró el modal
  if (isStandalone || hasShownModal) {
    console.log('🔍 PWAInstaller: Ya está instalado o modal ya mostrado, no renderizando nada');
    return null;
  }

  console.log('🔍 PWAInstaller: Renderizando componente, showInstallModal =', showInstallModal);

  return (
    <>
      {/* Botón de prueba para desarrollo (OCULTO) */}
      {/* {process.env.NODE_ENV === 'development' && !/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
        <div className="pwa-installer__test-button">
          <button 
            onClick={showTestModal}
            className="pwa-installer__test-button-inner"
          >
            🧪 Probar Modal PWA
          </button>
        </div>
      )} */}

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
              
              {/* Debug Info - OCULTO */}
              {/* {process.env.NODE_ENV === 'development' && (
                <div className="pwa-installer__debug-info">
                  <h4>🔍 Debug Info:</h4>
                  <div className="pwa-installer__debug-item">
                    <strong>Deferred Prompt:</strong> {debugInfo.deferredPrompt ? '✅ Sí' : '❌ No'}
                  </div>
                  <div className="pwa-installer__debug-item">
                    <strong>Instalable:</strong> {debugInfo.isInstallable ? '✅ Sí' : '❌ No'}
                  </div>
                  <div className="pwa-installer__debug-item">
                    <strong>iOS:</strong> {debugInfo.isIOS ? '🍎 Sí' : '🤖 No'}
                  </div>
                  <div className="pwa-installer__debug-item">
                    <strong>Standalone:</strong> {debugInfo.isStandalone ? '✅ Sí' : '❌ No'}
                  </div>
                  <div className="pwa-installer__debug-item">
                    <strong>Móvil:</strong> {debugInfo.isMobile ? '📱 Sí' : '💻 No'}
                  </div>
                  <div className="pwa-installer__debug-item">
                    <strong>Desarrollo:</strong> {debugInfo.isDevelopment ? '✅ Sí' : '❌ No'}
                  </div>
                </div>
              )} */}
              
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
