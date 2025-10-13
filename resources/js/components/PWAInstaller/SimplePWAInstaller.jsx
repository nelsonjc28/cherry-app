import React, { useState, useEffect } from 'react';
import './PWAInstallToast.css';

const SimplePWAInstaller = () => {
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    console.log('SimplePWAInstaller: Inicializando...');
    console.log('SimplePWAInstaller: URL actual:', window.location.href);
    console.log('SimplePWAInstaller: localStorage:', {
      toastShown: localStorage.getItem('pwa-install-toast-shown'),
      pwaInstalled: localStorage.getItem('pwa-installed'),
      manuallyInstalled: localStorage.getItem('pwa-manually-installed')
    });

    // Verificar si ya está instalado
    const isAlreadyInstalled =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      localStorage.getItem('pwa-installed') === 'true';;

    if (isAlreadyInstalled) {
      return;
    }

    // Verificar si ya se mostró el toast
    const toastShown = localStorage.getItem('pwa-install-toast-shown') === 'true';;

    // Modo debug: ignorar localStorage si está en la URL
    const isDebugMode = window.location.search.includes('debug-pwa') || window.location.search.includes('show-installer');

    if (toastShown && !isDebugMode) {
      return;
    }

    if (isDebugMode) {
    }

    // Escuchar el evento beforeinstallprompt para instalación nativa
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      window.deferredPrompt = e;

      // Mostrar el toast inmediatamente cuando hay prompt disponible
      setShowToast(true);
    };

    // Escuchar el evento appinstalled
    const handleAppInstalled = () => {
      setShowToast(false);
      localStorage.setItem('pwa-installed', 'true');
      localStorage.setItem('pwa-install-toast-shown', 'true');
    };

    // Agregar listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Mostrar toast después de 2 segundos solo si no hay prompt nativo
    const timer = setTimeout(() => {
      // Solo mostrar si no hay prompt nativo disponible
      if (!window.deferredPrompt) {
        setShowToast(true);
      } else {
      }
    }, 2000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Función para mostrar mensaje de éxito con logo
  const showSuccessMessage = (message) => {
    const baseUrl = window.location.origin;
    const logoUrl = `${baseUrl}/images/logo.svg`;
    const fullMessage = `🎉 ${message}\n\n${logoUrl}`;
    alert(fullMessage);
  };

  const handleInstall = async () => {
    try {
      // Verificar si hay un prompt de instalación pendiente
      if (window.deferredPrompt) {
        try {
          // Mostrar el prompt nativo del navegador
          await window.deferredPrompt.prompt();
          const { outcome } = await window.deferredPrompt.userChoice;;

          if (outcome === 'accepted') {
            setShowToast(false);
            localStorage.setItem('pwa-installed', 'true');
            localStorage.setItem('pwa-install-toast-shown', 'true');

            // Mostrar mensaje de éxito con logo solo cuando realmente se instale
            setTimeout(() => {
              showSuccessMessage('¡Cherry App instalada exitosamente!\n\nLa aplicación se ha agregado a tu dispositivo.');
            }, 1000);
          } else {
            setShowToast(false);
            localStorage.setItem('pwa-install-toast-shown', 'true');
          }
        } catch (error) {
          console.error('SimplePWAInstaller: Error mostrando prompt nativo:', error);
          // Si falla el prompt, intentar instalación automática
        }

        window.deferredPrompt = null;
        return;
      }

      // Si no hay prompt nativo, intentar instalación automática silenciosa
      // Verificar si ya está en modo standalone
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setShowToast(false);
        localStorage.setItem('pwa-installed', 'true');
        localStorage.setItem('pwa-install-toast-shown', 'true');
        return;
      }

      // Intentar activar instalación automática
      if ('serviceWorker' in navigator) {
        try {
          // Registrar service worker
          const registration = await navigator.serviceWorker.register('/sw.js');;

          // Intentar activar la instalación automática
          if (registration.active) {
            // Marcar como instalado automáticamente
            setShowToast(false);
            localStorage.setItem('pwa-installed', 'true');
            localStorage.setItem('pwa-install-toast-shown', 'true');

            // NO mostrar mensaje de éxito para instalación automática silenciosa
          } else {
            throw new Error('Service Worker no activo');
          }
        } catch (error) {
          console.error('SimplePWAInstaller: Error en instalación automática:', error);
          // Si falla, ocultar el toast sin mostrar instrucciones
          setShowToast(false);
          localStorage.setItem('pwa-install-toast-shown', 'true');
        }
      } else {
        setShowToast(false);
        localStorage.setItem('pwa-install-toast-shown', 'true');
      }
    } catch (error) {
      console.error('SimplePWAInstaller: Error durante la instalación:', error);
      // Si falla, ocultar el toast sin mostrar instrucciones
      setShowToast(false);
      localStorage.setItem('pwa-install-toast-shown', 'true');
    }
  };

  const showManualInstructions = () => {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroid = /Android/.test(userAgent);
    const isMac = /Mac|macOS/.test(userAgent);
    const isWindows = /Windows/.test(userAgent);

    // Verificar soporte PWA
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasManifest = !!document.querySelector('link[rel="manifest"]');
    const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost';

    console.log('SimplePWAInstaller: Verificando soporte PWA:', {
      hasServiceWorker,
      hasManifest,
      isHTTPS,
      isIOS,
      isAndroid,
      isWindows,
      isMacOS
    });

    let message = '';

    if (isIOS) {
      message = `
📱 Instalar Cherry App en iOS:

1. Toca el botón "Compartir" (📤) en la parte inferior
2. Desplázate hacia abajo y selecciona "Agregar a pantalla de inicio"
3. Personaliza el nombre si deseas
4. Toca "Agregar" en la esquina superior derecha

¡Listo! Cherry App aparecerá en tu pantalla de inicio.
      `;
    } else if (isAndroid) {
      message = `
📱 Instalar Cherry App en Android:

1. Busca el ícono ⊕ en la barra de direcciones
2. Toca "Instalar Cherry App" o "Agregar a pantalla de inicio"
3. Confirma la instalación

O alternativamente:
• Toca el menú ⋮ (tres puntos)
• Selecciona "Agregar a pantalla de inicio"
      `;
    } else if (isMac || isWindows) {
      // Información de diagnóstico
      let diagnosticInfo = '';
      if (!hasServiceWorker) {
        diagnosticInfo += '\n⚠️ Tu navegador no soporta Service Workers (requerido para PWA)';
      }
      if (!hasManifest) {
        diagnosticInfo += '\n⚠️ No se encontró el manifest.json';
      }
      if (!isHTTPS) {
        diagnosticInfo += '\n⚠️ Se requiere HTTPS para instalación PWA (localhost está permitido)';
      }

      message = `
💻 Instalar Cherry App en tu PC:

OPCIÓN 1 - Instalación desde el navegador:
1. Busca el ícono ⊕ (más) en la barra de direcciones (lado derecho)
2. Haz clic en "Instalar Cherry App" o "Agregar a pantalla de inicio"
3. Confirma la instalación

OPCIÓN 2 - Desde el menú del navegador:
1. Haz clic en el menú ⋮ (tres puntos) en la esquina superior derecha
2. Busca "Instalar Cherry App" o "Agregar a pantalla de inicio"
3. Haz clic y confirma

OPCIÓN 3 - Chrome DevTools (si no aparece el ícono):
1. Presiona F12 para abrir DevTools
2. Ve a la pestaña "Application" o "Aplicación"
3. En el menú izquierdo, busca "Manifest"
4. Haz clic en "Add to homescreen" o "Agregar a pantalla de inicio"

OPCIÓN 4 - Acceso directo manual:
1. Haz clic derecho en el escritorio
2. Selecciona "Nuevo" → "Acceso directo"
3. URL: ${window.location.href}
4. Nombre: Cherry App

¡Una vez instalada, Cherry App aparecerá como una aplicación independiente en tu escritorio!${diagnosticInfo}
      `;
    } else {
      message = `
📱 Instalar Cherry App:

• Android: Busca el ícono ⊕ en la barra de direcciones
• iOS: Usa el botón "Compartir" → "Agregar a pantalla de inicio"
• Desktop: Busca el ícono ⊕ en la barra de direcciones

¡Instala Cherry App para acceso rápido!
      `;
    }

    alert(message);
    setShowToast(false);
    localStorage.setItem('pwa-install-toast-shown', 'true');
  };

  const handleDismiss = () => {
    setShowToast(false);
    localStorage.setItem('pwa-install-toast-shown', 'true');
  };

  // Funciones globales para debugging
  useEffect(() => {
    window.forceShowPWAInstaller = () => {
      localStorage.removeItem('pwa-install-toast-shown');
      setShowToast(true);
    };

    window.clearPWAInstallerCache = () => {
      localStorage.removeItem('pwa-install-toast-shown');
      localStorage.removeItem('pwa-installed');
      localStorage.removeItem('pwa-manually-installed');
      setShowToast(false);
    };

    window.showPWAInstallerNow = () => {
      setShowToast(true);
    };

    // Función para resetear completamente
    window.resetPWAInstaller = () => {
      localStorage.removeItem('pwa-install-toast-shown');
      localStorage.removeItem('pwa-installed');
      localStorage.removeItem('pwa-manually-installed');
      setShowToast(true);
    };

    // Función para forzar instalación automática
    window.forcePWAInstall = async () => {
      try {
        // Registrar service worker
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.register('/sw.js');;

          // Marcar como instalado
          localStorage.setItem('pwa-installed', 'true');
          localStorage.setItem('pwa-install-toast-shown', 'true');

          // NO mostrar mensaje automático para instalación forzada
        } else {
          alert('❌ Tu navegador no soporta instalación automática de PWA.');
        }
      } catch (error) {
        console.error('SimplePWAInstaller: Error en instalación forzada:', error);
        alert('❌ Error durante la instalación automática.');
      }
    };

    // Modo debug: mostrar inmediatamente si está en la URL
    const isDebugMode = window.location.search.includes('debug-pwa') || window.location.search.includes('show-installer');
    if (isDebugMode) {
      setShowToast(true);
    }
  }, []);

  if (!showToast) {
    return null;
  }

  return (
    <div className="pwa-install-toast">
      <button
        className="pwa-install-toast__close"
        onClick={handleDismiss}
        aria-label="Cerrar"
      >
        ×
      </button>
      <div className="pwa-install-toast__content">
        <div className="pwa-install-toast__texts-content ">
          <div className="pwa-install-toast__icon">
            <img src="/images/logo.svg" alt="Cherry App" />
          </div>
          <div className="pwa-install-toast__text">
            <h4>¡Instala Cherry App!</h4>
            <p>Accede más rápido desde tu pantalla de inicio</p>
          </div>
        </div>
        <div className="pwa-install-toast__actions">
          <button
            className="pwa-install-toast__button pwa-install-toast__button--primary"
            onClick={handleInstall}
          >
            Instalar
          </button>
          <button
            className="pwa-install-toast__button pwa-install-toast__button--secondary"
            onClick={handleDismiss}
          >
            Más tarde
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimplePWAInstaller;
