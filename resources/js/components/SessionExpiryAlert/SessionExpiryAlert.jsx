import React, { useState, useEffect } from 'react';
import './SessionExpiryAlert.css';

const SessionExpiryAlert = ({ onExtendSession, onExpire }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    // Verificar el token cada hora
    const checkTokenInterval = setInterval(() => {
      checkTokenExpiry();
    }, 3600000); // 1 hora

    // Verificar inmediatamente al montar
    checkTokenExpiry();

    return () => {
      clearInterval(checkTokenInterval);
    };
  }, []);

  const checkTokenExpiry = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }

      // Decodificar el token JWT para obtener la fecha de expiración
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000; // Convertir a milisegundos
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;
      
      // Si faltan menos de 24 horas para expirar, mostrar la alerta
      if (timeUntilExpiry <= 86400000 && timeUntilExpiry > 0) { // 24 horas = 86,400,000 ms
        setTimeLeft(Math.ceil(timeUntilExpiry / 3600000)); // Convertir a horas
        setIsVisible(true);
      } else if (timeUntilExpiry <= 0) {
        // La sesión ya expiró

        handleSessionExpired();
      }
    } catch (error) {

    }
  };

  const handleExtendSession = async () => {
    setIsExtending(true);
    try {
      // Llamar a la función para extender la sesión
      await onExtendSession();
      setIsVisible(false);
      window.showToast('Sesión extendida exitosamente', 'success');
    } catch (error) {
      window.showToast('Error al extender la sesión', 'error');
    } finally {
      setIsExtending(false);
    }
  };

  const handleSessionExpired = () => {
    setIsVisible(false);
    if (onExpire) {
      onExpire();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="session-expiry-alert">
      <div className="session-expiry-alert__content">
        <div className="session-expiry-alert__header">
          <h4>⚠️ Sesión por Expirar</h4>
          <button 
            className="session-expiry-alert__close-btn"
            onClick={handleClose}
          >
            ×
          </button>
        </div>
        
        <div className="session-expiry-alert__body">
          <p>
            Tu sesión expirará en <strong>{timeLeft} hora{timeLeft !== 1 ? 's' : ''}</strong>.
          </p>
          <p>¿Deseas extender tu sesión para continuar trabajando?</p>
        </div>
        
        <div className="session-expiry-alert__actions">
          <button
            className="session-expiry-alert__extend-btn"
            onClick={handleExtendSession}
            disabled={isExtending}
          >
            {isExtending ? 'Extendiendo...' : 'Extender Sesión'}
          </button>
          <button
            className="session-expiry-alert__close-session-btn"
            onClick={handleClose}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionExpiryAlert;
