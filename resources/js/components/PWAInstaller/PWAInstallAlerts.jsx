import React, { useState, useEffect } from 'react';
import './PWAInstallAlerts.css';

const PWAInstallAlerts = () => {
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    // Escuchar eventos de instalación exitosa
    const handlePWAInstalled = (event) => {

      setToastMessage('🎉 ¡Cherry App instalada exitosamente!');
      setShowSuccessToast(true);
      
      // Ocultar después de 4 segundos
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 4000);
    };

    // Escuchar eventos de error de instalación
    const handlePWAError = (event) => {

      setToastMessage(event.detail.message || 'Error al instalar la aplicación');
      setShowErrorToast(true);
      
      // Ocultar después de 5 segundos
      setTimeout(() => {
        setShowErrorToast(false);
      }, 5000);
    };

    // Escuchar solicitudes de instalación para iOS
    const handleIOSInstallRequest = () => {

      setToastMessage('📱 Para instalar en iOS: Toca el botón Compartir y selecciona "Agregar a pantalla de inicio"');
      setShowSuccessToast(true);
      
      // Ocultar después de 6 segundos
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 6000);
    };

    // Agregar listeners
    window.addEventListener('pwa-installed', handlePWAInstalled);
    window.addEventListener('pwa-error', handlePWAError);
    window.addEventListener('ios-install-request', handleIOSInstallRequest);

    // Cleanup
    return () => {
      window.removeEventListener('pwa-installed', handlePWAInstalled);
      window.removeEventListener('pwa-error', handlePWAError);
      window.removeEventListener('ios-install-request', handleIOSInstallRequest);
    };
  }, []);

  const handleCloseSuccess = () => {
    setShowSuccessToast(false);
  };

  const handleCloseError = () => {
    setShowErrorToast(false);
  };

  return (
    <>
      {/* Toast de Éxito */}
      {showSuccessToast && (
        <div className="pwa-alert pwa-alert--success">
          <div className="pwa-alert__content">
            <div className="pwa-alert__icon">✅</div>
            <div className="pwa-alert__message">{toastMessage}</div>
            <button 
              className="pwa-alert__close"
              onClick={handleCloseSuccess}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Toast de Error */}
      {showErrorToast && (
        <div className="pwa-alert pwa-alert--error">
          <div className="pwa-alert__content">
            <div className="pwa-alert__icon">❌</div>
            <div className="pwa-alert__message">{toastMessage}</div>
            <button 
              className="pwa-alert__close"
              onClick={handleCloseError}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallAlerts;



























