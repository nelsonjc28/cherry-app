// Configuración centralizada para el sistema de toasts
export const TOAST_CONFIG = {
  // Posiciones disponibles
  positions: {
    topRight: 'top-right',
    topLeft: 'top-left',
    bottomRight: 'bottom-right',
    bottomLeft: 'bottom-left',
    topCenter: 'top-center',
    bottomCenter: 'bottom-center'
  },
  
  // Tipos de toast disponibles
  types: {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info'
  },
  
  // Duración por defecto para cada tipo
  durations: {
    success: 4000,
    error: 6000,
    warning: 5000,
    info: 4000
  },
  
  // Configuración por defecto
  default: {
    position: 'top-right',
    duration: 5000,
    type: 'info'
  }
};

// Función helper para crear toasts
export const createToast = (message, type = 'info', duration = null) => {
  if (window.showToast) {
    const finalDuration = duration || TOAST_CONFIG.durations[type] || TOAST_CONFIG.default.duration;
    window.showToast(message, type, finalDuration);
  } else {
    console.warn('Sistema de toast no disponible');

  }
};

// Funciones específicas para cada tipo
export const showSuccess = (message, duration) => createToast(message, 'success', duration);
export const showError = (message, duration) => createToast(message, 'error', duration);
export const showWarning = (message, duration) => createToast(message, 'warning', duration);
export const showInfo = (message, duration) => createToast(message, 'info', duration);

// Función para mostrar múltiples toasts
export const showMultipleToasts = (toasts) => {
  toasts.forEach((toast, index) => {
    setTimeout(() => {
      createToast(toast.message, toast.type, toast.duration);
    }, index * 500); // Delay entre cada toast
  });
};




