import React, { useEffect, useState } from 'react';
import './Toast.css';

const Toast = ({ message, type = 'info', onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto hide
    if (duration > 0) {
      const hideTimer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }

    return () => clearTimeout(showTimer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for exit animation
  };

  return (
    <div className={`toast toast--${type} ${isVisible ? 'toast--visible' : ''} ${isExiting ? 'toast--exiting' : ''}`}>
      <div className="toast__content">
        <div className="toast__icon">
          {type === 'success' && '✓'}
          {type === 'error' && '✕'}
          {type === 'warning' && '⚠'}
          {type === 'info' && 'ℹ'}
        </div>
        <div className="toast__message">{message}</div>
        <button className="toast__close" onClick={handleClose} aria-label="Cerrar notificación">
          ✕
        </button>
      </div>
    </div>
  );
};

export default Toast; 