import React, { useState, useEffect } from 'react';
import './SessionExpiryAlert.css';

const SessionExpiryAlert = ({ onExtendSession, onExpire }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    // Verificar el token cada minuto
    const checkTokenInterval = setInterval(() => {
      checkTokenExpiry();
    }, 60000); // 1 minuto

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

      // Si faltan menos de 5 minutos para expirar, mostrar la alerta
      if (timeUntilExpiry <= 300000 && timeUntilExpiry > 0) { // 5 minutos = 300,000 ms
        setTimeLeft(Math.ceil(timeUntilExpiry / 60000)); // Convertir a minutos
        setIsVisible(true);
      } else if (timeUntilExpiry <= 0) {
        // La sesión ya expiró
        handleSessionExpired();
      }
    } catch (error) {
      // Error silencioso para evitar spam en consola
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
            Tu sesión expirará en <strong>{timeLeft} minuto{timeLeft !== 1 ? 's' : ''}</strong>.
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
