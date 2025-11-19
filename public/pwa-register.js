// PWA Registration Script - Universal Installer
(function() {
  'use strict';

  // Configuration
  const SW_URL = '/sw.js';
  const CACHE_VERSION = 'v1.2.0';
  
  // Check if we're in a supported environment
  if (!('serviceWorker' in navigator)) {
    return;
  }

  // Register Service Worker
  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register(SW_URL, {
        scope: '/',
        updateViaCache: 'none'
      });


      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              dispatchUpdateAvailable();
            }
          });
        }
      });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

      return registration;
    } catch (error) {
      dispatchRegistrationError(error);
      return null;
    }
  }

  // Handle beforeinstallprompt event
  let deferredPrompt = null;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Dispatch custom event for React components
    window.dispatchEvent(new CustomEvent('pwa-install-available', {
      detail: { deferredPrompt: e }
    }));
  });

  // Handle appinstalled event
  window.addEventListener('appinstalled', (e) => {
    deferredPrompt = null;
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('pwa-installed', {
      detail: { platform: 'native' }
    }));
  });

  // Handle installation errors
  window.addEventListener('appinstalled', (e) => {
  });

  // Utility functions
  function dispatchUpdateAvailable() {
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  }

  function dispatchRegistrationError(error) {
    window.dispatchEvent(new CustomEvent('pwa-registration-error', {
      detail: { error: error.message }
    }));
  }

  // Check if PWA is already installed
  function isPWAInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true ||
           localStorage.getItem('pwa-installed') === 'true';
  }

  // Check if PWA can be installed
  function canInstallPWA() {
    return !isPWAInstalled() && (
      deferredPrompt !== null ||
      'serviceWorker' in navigator
    );
  }

  // Get device information
  function getDeviceInfo() {
    const userAgent = navigator.userAgent.toLowerCase();
    return {
      isIOS: /iphone|ipad|ipod/.test(userAgent),
      isAndroid: /android/.test(userAgent),
      isWindows: /windows/.test(userAgent),
      isMac: /macintosh|mac os x/.test(userAgent),
      isLinux: /linux/.test(userAgent),
      isMobile: /mobile|android|iphone|ipad/.test(userAgent),
      browser: getBrowserInfo(userAgent)
    };
  }

  function getBrowserInfo(userAgent) {
    if (userAgent.includes('chrome') && !userAgent.includes('edge')) return 'chrome';
    if (userAgent.includes('firefox')) return 'firefox';
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'safari';
    if (userAgent.includes('edge')) return 'edge';
    if (userAgent.includes('opera')) return 'opera';
    return 'unknown';
  }

  // Install PWA programmatically
  async function installPWA() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          localStorage.setItem('pwa-installed', 'true');
          return { success: true, method: 'native' };
        } else {
          return { success: false, reason: 'user-rejected' };
        }
      } catch (error) {
        return { success: false, reason: error.message };
      }
    } else {
      return { success: false, reason: 'no-deferred-prompt' };
    }
  }

  // Force update Service Worker
  async function forceUpdate() {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        return { success: true };
      } else {
        return { success: false, reason: 'no-registration' };
      }
    } catch (error) {
      return { success: false, reason: error.message };
    }
  }

  // Clear all caches
  async function clearAllCaches() {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Clear localStorage
      localStorage.removeItem('pwa-installed');
      localStorage.removeItem('pwa-install-dismissed');
      
      return { success: true };
    } catch (error) {
      return { success: false, reason: error.message };
    }
  }

  // Expose API to window
  window.PWAInstaller = {
    register: registerServiceWorker,
    install: installPWA,
    update: forceUpdate,
    clearCache: clearAllCaches,
    isInstalled: isPWAInstalled,
    canInstall: canInstallPWA,
    getDeviceInfo: getDeviceInfo,
    getDeferredPrompt: () => deferredPrompt
  };

  // Auto-register on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerServiceWorker);
  } else {
    registerServiceWorker();
  }

  // Debug mode
  if (window.location.search.includes('pwa-debug')) {
    window.PWADebug = {
      device: getDeviceInfo(),
      installed: isPWAInstalled(),
      canInstall: canInstallPWA(),
      deferredPrompt: !!deferredPrompt
    };
  }

})();
