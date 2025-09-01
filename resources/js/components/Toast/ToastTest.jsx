import React from 'react';
import { showSuccess, showError, showWarning, showInfo, showMultipleToasts } from '../../config/toast';

const ToastTest = () => {
  const testToasts = () => {
    if (window.showToast) {
      showSuccess('¡Toast de éxito funcionando!');
      
      setTimeout(() => {
        showError('Toast de error de prueba');
      }, 1000);
      
      setTimeout(() => {
        showWarning('Toast de advertencia de prueba');
      }, 2000);
      
      setTimeout(() => {
        showInfo('Toast de información de prueba');
      }, 3000);
    } else {
      console.error('window.showToast no está disponible');
    }
  };

  const testMultipleToasts = () => {
    showMultipleToasts([
      { message: 'Primer toast', type: 'success' },
      { message: 'Segundo toast', type: 'info' },
      { message: 'Tercer toast', type: 'warning' },
      { message: 'Cuarto toast', type: 'error' }
    ]);
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h3>Prueba de Toasts</h3>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button 
          onClick={testToasts}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Probar Toasts Individuales
        </button>
        
        <button 
          onClick={testMultipleToasts}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Probar Múltiples Toasts
        </button>
      </div>
      
      <p style={{ marginTop: '20px', color: '#666' }}>
        Haz clic en los botones para probar diferentes tipos de notificaciones toast
      </p>
    </div>
  );
};

export default ToastTest;
