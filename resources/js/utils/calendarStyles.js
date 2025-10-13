// Utilidad para personalizar los calendarios del navegador
export const customizeCalendarStyles = () => {
  // Función para aplicar estilos a los calendarios
  const applyCalendarStyles = () => {
    // Agregar estilos CSS dinámicamente
    const style = document.createElement('style');
    style.textContent = `
      /* Personalización avanzada del calendario */
      input[type="date"]::-webkit-calendar-picker-indicator {
        background-color: #EA2630 !important;
        color: white !important;
        border-radius: 3px !important;
        padding: 2px !important;
        filter: none !important;
      }
      
      /* Personalización del popup del calendario */
      ::-webkit-calendar-picker-indicator {
        background-image: none !important;
        background-color: #EA2630 !important;
        color: white !important;
      }
      
      /* Variables CSS para el calendario */
      input[type="date"] {
        --accent-color: #EA2630 !important;
        --primary-color: #EA2630 !important;
        --selection-color: #EA2630 !important;
      }
      
      /* Intentar personalizar elementos internos */
      input[type="date"]:focus {
        accent-color: #EA2630 !important;
      }
    `;
    
    // Agregar el estilo al head si no existe
    if (!document.querySelector('#calendar-custom-styles')) {
      style.id = 'calendar-custom-styles';
      document.head.appendChild(style);
    }
  };

  // Aplicar estilos inmediatamente
  applyCalendarStyles();

  // Observar cambios en el DOM para calendarios dinámicos
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          const dateInputs = node.querySelectorAll ? node.querySelectorAll('input[type="date"]') : [];
          if (dateInputs.length > 0) {
            applyCalendarStyles();
          }
        }
      });
    });
  });

  // Observar el documento
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Manejar eventos de focus en inputs de fecha
  document.addEventListener('focusin', (event) => {
    if (event.target.type === 'date') {
      // Aplicar accent-color dinámicamente
      event.target.style.accentColor = '#EA2630';
      
      // Intentar personalizar el calendario cuando se abra
      setTimeout(() => {
        applyCalendarStyles();
      }, 100);
    }
  });

  // Aplicar estilos cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyCalendarStyles);
  } else {
    applyCalendarStyles();
  }
};

// Auto-inicializar cuando se cargue el módulo
if (typeof window !== 'undefined') {
  customizeCalendarStyles();
}


















