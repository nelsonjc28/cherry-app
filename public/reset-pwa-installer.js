/**
 * Script para resetear el instalador de PWA
 * Ejecuta este código en la consola del navegador para que aparezca el instalador nuevamente
 */

(function() {
  // Lista de todas las claves relacionadas con PWA
  const pwaKeys = [
    'pwa-modal-shown',
    'pwa-install-toast-shown',
    'pwa-installed',
    'pwa-manually-installed',
    'pwa-install-dismissed',
    'app_install_notified'
  ];

  // Eliminar cada clave
  pwaKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`✅ Eliminado: ${key}`);
  });

  console.log('\n🎉 ¡localStorage limpiado exitosamente!');
  console.log('📱 Recarga la página (F5) para que aparezca el instalador de PWA.\n');
  
  // Opcional: recargar automáticamente después de 2 segundos
  setTimeout(() => {
    if (confirm('¿Deseas recargar la página ahora?')) {
      location.reload();
    }
  }, 2000);
})();

