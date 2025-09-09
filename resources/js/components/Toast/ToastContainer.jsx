import React, { useState, useCallback, useEffect } from 'react';
import Toast from './Toast';
import './ToastContainer.css';

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };
    
    setToasts(prev => [...prev, newToast]);
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Expose addToast globally and override the native Toast system
  useEffect(() => {
    // Override the native Toast.show method
    if (window.Toast) {
      const originalShow = window.Toast.show;
      window.Toast.show = (message, type = 'info', duration = 5000, actions = null) => {
        // Convert native toast calls to React toast calls
        addToast(message, type, duration);
      };
    }
    
    // Set our React toast system as the primary one
    window.showToast = addToast;
    
    return () => {
      // Restore original Toast.show if it existed
      if (window.Toast && window.Toast._originalShow) {
        window.Toast.show = window.Toast._originalShow;
      }
      delete window.showToast;
    };
  }, [addToast]);

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

export default ToastContainer; 
