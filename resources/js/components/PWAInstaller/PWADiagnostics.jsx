import React, { useState, useEffect } from 'react';

const PWADiagnostics = () => {
  const [diagnostics, setDiagnostics] = useState({});
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  useEffect(() => {
    const runDiagnostics = () => {
      const results = {
        // Verificar Service Worker
        serviceWorker: {
          supported: 'serviceWorker' in navigator,
          registered: false,
          active: false
        },
        
        // Verificar manifest
        manifest: {
          exists: false,
          valid: false,
          content: null
        },
        
        // Verificar instalación
        installation: {
          isStandalone: window.matchMedia('(display-mode: standalone)').matches,
          isIOSStandalone: window.navigator.standalone === true,
          hasDeferredPrompt: !!window.deferredPrompt,
          manuallyInstalled: localStorage.getItem('pwa-manually-installed') === 'true'
        },
        
        // Verificar iconos
        icons: {
          manifestIcon: false,
          appleTouchIcon: false
        },
        
        // Información del navegador
        browser: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled
        }
      };

      // Verificar Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
          if (registration) {
            results.serviceWorker.registered = true;
            results.serviceWorker.active = !!registration.active;
          }
        });
      }

      // Verificar manifest
      fetch('/manifest.json')
        .then(response => {
          results.manifest.exists = response.ok;
          if (response.ok) {
            return response.json();
          }
        })
        .then(manifest => {
          if (manifest) {
            results.manifest.valid = true;
            results.manifest.content = manifest;
          }
        })
        .catch(error => {
          console.error('Error verificando manifest:', error);
        });

      // Verificar iconos
      const iconImg = new Image();
      iconImg.onload = () => {
        results.icons.manifestIcon = true;
      };
      iconImg.onerror = () => {
        results.icons.manifestIcon = false;
      };
      iconImg.src = '/icons/icon-144x144.png';

      setDiagnostics(results);
    };

    runDiagnostics();
  }, []);

  const handleForceInstall = () => {
    // Simular instalación para testing
    localStorage.setItem('pwa-manually-installed', 'true');
    alert('PWA marcada como instalada. Recarga la página para ver los cambios.');
    window.location.reload();
  };

  const handleForceUpdate = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          alert('✅ Service Worker actualizado. Recarga la página para ver los cambios.');
          window.location.reload();
        } else {
          alert('❌ No se encontró Service Worker registrado.');
        }
      } else {
        alert('❌ Service Worker no soportado en este navegador.');
      }
    } catch (error) {
      console.error('Error actualizando Service Worker:', error);
      alert('Error actualizando Service Worker: ' + error.message);
    }
  };

  const handleClearCache = async () => {
    try {
      // Limpiar localStorage
      localStorage.removeItem('pwa-install-toast-shown');
      localStorage.removeItem('pwa-modal-shown');
      localStorage.removeItem('pwa-manually-installed');
      
      // Limpiar cache del Service Worker
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('Caches eliminados:', cacheNames);
      }
      
      // Desregistrar Service Worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
        console.log('Service Workers desregistrados:', registrations.length);
      }
      
      alert('✅ Cache completamente limpiado:\n\n- localStorage limpiado\n- Service Worker cache eliminado\n- Service Workers desregistrados\n\nRecarga la página para aplicar cambios.');
      window.location.reload();
    } catch (error) {
      console.error('Error limpiando cache:', error);
      alert('Error limpiando cache: ' + error.message);
    }
  };

  // Componente de diagnóstico oculto - no mostrar botón flotante
  if (!showDiagnostics) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: 'white',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '20px',
      maxWidth: '400px',
      maxHeight: '500px',
      overflow: 'auto',
      zIndex: 9999,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: '#E91E63' }}>🔧 PWA Diagnostics</h3>
        <button
          onClick={() => setShowDiagnostics(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer'
          }}
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h4>Service Worker:</h4>
        <p>✅ Soportado: {diagnostics.serviceWorker?.supported ? 'Sí' : 'No'}</p>
        <p>✅ Registrado: {diagnostics.serviceWorker?.registered ? 'Sí' : 'No'}</p>
        <p>✅ Activo: {diagnostics.serviceWorker?.active ? 'Sí' : 'No'}</p>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h4>Manifest:</h4>
        <p>✅ Existe: {diagnostics.manifest?.exists ? 'Sí' : 'No'}</p>
        <p>✅ Válido: {diagnostics.manifest?.valid ? 'Sí' : 'No'}</p>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h4>Instalación:</h4>
        <p>✅ Standalone: {diagnostics.installation?.isStandalone ? 'Sí' : 'No'}</p>
        <p>✅ iOS Standalone: {diagnostics.installation?.isIOSStandalone ? 'Sí' : 'No'}</p>
        <p>✅ Deferred Prompt: {diagnostics.installation?.hasDeferredPrompt ? 'Sí' : 'No'}</p>
        <p>✅ Manual: {diagnostics.installation?.manuallyInstalled ? 'Sí' : 'No'}</p>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h4>Iconos:</h4>
        <p>✅ Manifest Icon: {diagnostics.icons?.manifestIcon ? 'Sí' : 'No'}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleForceInstall}
            style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              flex: 1
            }}
          >
            Forzar Instalación
          </button>
          <button
            onClick={handleForceUpdate}
            style={{
              background: '#2196F3',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              flex: 1
            }}
          >
            Actualizar SW
          </button>
        </div>
        <button
          onClick={handleClearCache}
          style={{
            background: '#f44336',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Limpiar Cache Completo
        </button>
      </div>
    </div>
  );
};

export default PWADiagnostics;
