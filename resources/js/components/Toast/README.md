# Sistema de Toasts - Cherry App

## 🎯 **Descripción**

Sistema de notificaciones toast personalizado para Cherry App, que reemplaza el sistema nativo y proporciona una experiencia de usuario consistente.

## 🚀 **Uso Básico**

### **1. Función Global (Recomendada)**
```javascript
// Mostrar toast de éxito
window.showToast('Operación exitosa!', 'success');

// Mostrar toast de error
window.showToast('Algo salió mal', 'error');

// Mostrar toast de advertencia
window.showToast('Ten cuidado', 'warning');

// Mostrar toast de información
window.showToast('Información importante', 'info');
```

### **2. Funciones Helper (Más Limpias)**
```javascript
import { showSuccess, showError, showWarning, showInfo } from '../../config/toast';

// Uso directo
showSuccess('Operación exitosa!');
showError('Algo salió mal');
showWarning('Ten cuidado');
showInfo('Información importante');
```

## 🎨 **Tipos de Toast Disponibles**

| Tipo | Color | Icono | Duración por Defecto |
|------|-------|-------|---------------------|
| `success` | Verde | ✓ | 4 segundos |
| `error` | Rojo | ✕ | 6 segundos |
| `warning` | Amarillo | ⚠ | 5 segundos |
| `info` | Azul | ℹ | 4 segundos |

## ⚙️ **Configuración**

### **1. Duración Personalizada**
```javascript
// Toast que dura 10 segundos
window.showToast('Mensaje largo', 'info', 10000);

// Toast que no se cierra automáticamente
window.showToast('Mensaje persistente', 'warning', 0);
```

### **2. Múltiples Toasts**
```javascript
import { showMultipleToasts } from '../../config/toast';

showMultipleToasts([
  { message: 'Primer mensaje', type: 'success' },
  { message: 'Segundo mensaje', type: 'info' },
  { message: 'Tercer mensaje', type: 'warning' }
]);
```

## 🔧 **Implementación en Componentes**

### **1. Componente Simple**
```javascript
import React from 'react';

const MiComponente = () => {
  const handleSuccess = () => {
    window.showToast('Operación completada!', 'success');
  };

  const handleError = () => {
    window.showToast('Error en la operación', 'error');
  };

  return (
    <div>
      <button onClick={handleSuccess}>Éxito</button>
      <button onClick={handleError}>Error</button>
    </div>
  );
};
```

### **2. Componente con Funciones Helper**
```javascript
import React from 'react';
import { showSuccess, showError } from '../../config/toast';

const MiComponente = () => {
  const handleSuccess = () => {
    showSuccess('Operación completada!');
  };

  const handleError = () => {
    showError('Error en la operación');
  };

  return (
    <div>
      <button onClick={handleSuccess}>Éxito</button>
      <button onClick={handleError}>Error</button>
    </div>
  );
};
```

## 🎯 **Casos de Uso Comunes**

### **1. Operaciones CRUD**
```javascript
try {
  await api.post('/items', data);
  showSuccess('Elemento creado exitosamente');
} catch (error) {
  showError('Error al crear el elemento');
}
```

### **2. Validaciones**
```javascript
if (!formData.name) {
  showWarning('Por favor ingresa un nombre');
  return;
}
```

### **3. Confirmaciones**
```javascript
const handleDelete = () => {
  if (confirm('¿Estás seguro?')) {
    showInfo('Eliminando elemento...');
    // Lógica de eliminación
  }
};
```

## 🚨 **Solución de Problemas**

### **1. Toast No Aparece**
- Verifica que `CustomToastContainer` esté incluido en `App.jsx`
- Asegúrate de que `window.showToast` esté disponible
- Revisa la consola del navegador para errores

### **2. Estilos No Aplicados**
- Verifica que los archivos CSS estén importados
- Asegúrate de que no haya conflictos con otros estilos
- Revisa la especificidad de los selectores CSS

### **3. Múltiples Toasts**
- Los toasts se apilan automáticamente
- Cada toast tiene su propio temporizador
- Se pueden cerrar individualmente

## 📱 **Responsive**

El sistema de toasts se adapta automáticamente a diferentes tamaños de pantalla:

- **Desktop**: Posición fija en la esquina superior derecha
- **Mobile**: Se expande para usar todo el ancho disponible
- **Tablet**: Tamaño intermedio optimizado

## 🔄 **Migración desde Sistema Anterior**

### **1. Reemplazar `alert()`**
```javascript
// Antes
alert('Mensaje de éxito');

// Después
window.showToast('Mensaje de éxito', 'success');
```

### **2. Reemplazar `console.log()`**
```javascript
// Antes
console.log('Información importante');

// Después
window.showToast('Información importante', 'info');
```

## 📚 **Archivos del Sistema**

- `ToastContainer.jsx` - Contenedor principal de toasts
- `Toast.jsx` - Componente individual de toast
- `ToastContainer.css` - Estilos del contenedor
- `Toast.css` - Estilos de los toasts individuales
- `toast.js` - Configuración y funciones helper
- `ToastTest.jsx` - Componente de prueba (temporal)

## 🎉 **¡Listo para Usar!**

El sistema de toasts está completamente configurado y listo para usar en toda la aplicación. Simplemente usa `window.showToast()` o las funciones helper importadas.



























