<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Cherry - Tienda de Ropa y Calzado para Dama en México</title>
    <meta name="description" content="Empieza a vender por catálogo, gana dinero y conviértete en tu propio jefe. Tú eliges cómo y cuándo comenzar a vender. ¡Emprende hoy mismo con Cherry!!!" />
    
    <!-- PWA Meta Tags -->
    <link rel="manifest" href="/manifest.json">
    <!-- Favicon con logo Cherry -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/logo-cherry.png">
    
    <!-- Fallback con PNG -->
    <link rel="icon" type="image/png" href="/icons/logo-cherry.png">
    
    <!-- Modern PWA Meta Tags -->
    <meta name="theme-color" content="#ffffff">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="Cherry">
    
    <!-- Apple Touch Icons for splash screen with white background -->
    <link rel="apple-touch-startup-image" href="/icons/logo-blanco.png">
    <link rel="apple-touch-startup-image" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" href="/icons/logo-blanco.png">
    <link rel="apple-touch-startup-image" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" href="/icons/logo-blanco.png">
    <link rel="apple-touch-startup-image" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" href="/icons/logo-blanco.png">
    
    <!-- Additional PWA Meta Tags for better installation -->
    <meta name="application-name" content="Cherry">
    
    <!-- SEO Meta Tags -->
    <meta property="og:site_name" content="Cherry" />
    <meta property="og:image" content="{{ url('/icons/logo-cherry.png') }}" />
    <meta name="msapplication-TileColor" content="#E91E63">
    <meta name="msapplication-TileImage" content="/mstile-144x144.png">
    
    <!-- Splash screen background color -->
    <meta name="msapplication-navbutton-color" content="#ffffff">
    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: dark)">
    <style>
        /* Force white background for splash screen */
        html, body {
            background-color: #ffffff !important;
        }
        /* PWA splash screen simulation */
        @media (display-mode: standalone) {
            body::before {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #ffffff;
                z-index: -1;
            }
        }
    </style>
    
    <!-- Toast Styles -->
    <style>
        /* Estilos críticos para toasts - máxima prioridad */
        .toast-container .toast {
            background: white !important;
            color: black !important;
        }
        
        .toast-container .toast *,
        .toast-container .toast .toast-content,
        .toast-container .toast .toast-title,
        .toast-container .toast .toast-close {
            color: black !important;
        }
        
        .toast-container .toast .toast-btn {
            color: white !important;
        }
        
        .toast-container .toast .toast-btn.primary {
            color: #E91E63 !important;
        }
        
        /* Estilos adicionales con máxima especificidad */
        body .toast-container .toast {
            background: white !important;
            color: black !important;
        }
        
        body .toast-container .toast * {
            color: black !important;
        }
        
        /* Forzar colores usando selectores de atributos */
        [class*="toast"] {
            background: white !important;
            color: black !important;
        }
        
        [class*="toast"] * {
            color: black !important;
        }
        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            pointer-events: none;
        }
        
        .toast {
            background: white !important;
            color: black !important;
            padding: 16px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateX(400px);
            transition: transform 0.3s ease;
            pointer-events: auto;
            max-width: 300px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.4;
            border: 1px solid #e0e0e0;
        }
        
        .toast > div:not(.toast-header):not(.toast-actions) {
            color: black !important;
            font-weight: 500;
        }
        
        /* Forzar color negro en todo el contenido del toast */
        .toast * {
            color: black !important;
        }
        
        /* Forzar color negro en elementos específicos */
        .toast div,
        .toast span,
        .toast p,
        .toast h1,
        .toast h2,
        .toast h3,
        .toast h4,
        .toast h5,
        .toast h6 {
            color: black !important;
        }
        
        /* Excepciones específicas para botones */
        .toast .toast-btn {
            color: white !important;
        }
        
        .toast .toast-btn.primary {
            color: #E91E63 !important;
        }
        
        /* Estilos ultra-específicos para forzar colores */
        body .toast-container .toast .toast-content,
        body .toast-container .toast .toast-title,
        body .toast-container .toast .toast-close {
            color: black !important;
        }
        
        /* Usar atributos de estilo para máxima especificidad */
        .toast[style*="color"] {
            color: black !important;
        }
        
        .toast.show {
            transform: translateX(0);
        }
        
        .toast.success {
            background: #4CAF50;
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
        }
        
        .toast.error {
            background: #f44336;
            box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
        }
        
        .toast-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .toast-title {
            font-weight: 600;
            font-size: 16px;
            color: black !important;
        }
        
        /* Forzar color negro en el título */
        .toast .toast-title {
            color: black !important;
        }
        
        .toast-close {
            background: none;
            border: none;
            color: black !important;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0.7;
            transition: opacity 0.2s ease;
        }
        
        /* Forzar color negro en el botón de cerrar */
        .toast .toast-close {
            color: black !important;
        }
        
        .toast-close:hover {
            opacity: 1;
        }
        
        .toast-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }
        
        .toast-btn {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s ease;
            flex: 1;
        }
        
        .toast-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        
        .toast-btn.primary {
            background: rgba(255, 255, 255, 0.9);
            color: #E91E63;
            font-weight: 600;
        }
        
        .toast-btn.primary:hover {
            background: white;
        }
        
        /* Asegurar que el texto del contenido del toast sea visible */
        .toast .toast-content {
            color: black !important;
            font-weight: 500;
            margin: 8px 0;
        }
        
        /* Forzar color negro en el contenido */
        .toast .toast-content {
            color: black !important;
        }
        
        /* Forzar color negro en cualquier texto del toast */
        .toast div:not(.toast-actions) {
            color: black !important;
        }
    </style>
    
    <!-- Cache Management Script - Load first to handle loading issues -->
    <script src="/clear-cache.js"></script>
    
    <!-- PWA Diagnostics Script - For troubleshooting PWA installation -->
    
    <!-- PWA Install Helper - Enhanced installation support -->
    <script src="/pwa-install-helper.js"></script>
    
    <!-- PWA Registration Script - Universal installer -->
    <script src="/pwa-register.js"></script>
    
    <!-- PWA Debug Script - Para diagnosticar problemas -->
    <script src="/debug-pwa-installer.js"></script>
    
    <!-- Favicon Generator Script - For creating Cherry favicons -->
    
    
    <!-- Vite Assets -->
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/main.jsx'])
</head>
<body>
    <div id="root"></div>
    
    <!-- Toast Container -->
    <div class="toast-container" id="toastContainer"></div>
    
    

    
    <!-- Service Worker Registration -->
    <script>
        // Toast System
        class Toast {
            static show(message, type = 'info', duration = 5000, actions = null) {
                // Forzar estilos antes de crear el toast
                forceToastStyles();
                
                const container = document.getElementById('toastContainer');
                const toast = document.createElement('div');
                toast.className = `toast ${type}`;
                
                const header = document.createElement('div');
                header.className = 'toast-header';
                
                const title = document.createElement('div');
                title.className = 'toast-title';
                title.textContent = type === 'success' ? '✅ Éxito' : 
                                  type === 'error' ? '❌ Error' : 
                                  type === 'warning' ? '⚠️ Advertencia' : 'Cherry App';
                title.style.color = 'black';
                title.style.fontWeight = '600';
                
                const closeBtn = document.createElement('button');
                closeBtn.className = 'toast-close';
                closeBtn.innerHTML = '×';
                closeBtn.style.color = 'black';
                closeBtn.onclick = () => this.hide(toast);
                
                header.appendChild(title);
                header.appendChild(closeBtn);
                
                const content = document.createElement('div');
                content.className = 'toast-content';
                content.textContent = message;
                content.style.color = 'black';
                content.style.fontWeight = '500';
                
                toast.appendChild(header);
                toast.appendChild(content);
                
                if (actions) {
                    const actionsDiv = document.createElement('div');
                    actionsDiv.className = 'toast-actions';
                    
                    actions.forEach(action => {
                        const btn = document.createElement('button');
                        btn.className = `toast-btn ${action.primary ? 'primary' : ''}`;
                        btn.textContent = action.text;
                        btn.style.color = action.primary ? '#E91E63' : 'white';
                        btn.onclick = () => {
                            action.onClick();
                            this.hide(toast);
                        };
                        actionsDiv.appendChild(btn);
                    });
                    
                    toast.appendChild(actionsDiv);
                }
                
                container.appendChild(toast);
                
                // Animate in
                setTimeout(() => toast.classList.add('show'), 100);
                
                // Auto hide
                if (duration > 0) {
                    setTimeout(() => this.hide(toast), duration);
                }
                
                return toast;
            }
            
            static hide(toast) {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }
        }
        
        // Registrar Service Worker de forma silenciosa (sin mostrar errores al usuario)
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then((registration) => {
                        // Check for updates
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            if (newWorker) {
                                newWorker.addEventListener('statechange', () => {
                                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                        // New content is available, show update prompt
                                        Toast.show(
                                            'Hay una nueva versión disponible de Cherry App',
                                            'info',
                                            0, // No auto-hide
                                            [
                                                {
                                                    text: 'Actualizar',
                                                    primary: true,
                                                    onClick: () => {
                                                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                                                        Toast.show('Actualizando aplicación...', 'success', 2000);
                                                    }
                                                },
                                                {
                                                    text: 'Más tarde',
                                                    onClick: () => {
                                                        Toast.show('Puedes actualizar más tarde desde el menú', 'info', 3000);
                                                    }
                                                }
                                            ]
                                        );
                                    }
                                });
                            }
                        });
                    })
                    .catch((error) => {
                        // Solo loggear el error en desarrollo, no mostrar al usuario
                        // Esto evita que Google vea errores al indexar la página
                        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                            console.error('Error al registrar el service worker:', error);
                        }
                        // No mostrar toast de error en producción para evitar problemas con Google
                    });
            });
        }
        
        // Función para forzar estilos CSS
        function forceToastStyles() {
            const style = document.createElement('style');
            style.textContent = `
                .toast { background: white !important; color: black !important; }
                .toast, .toast * { color: black !important; }
                .toast .toast-content { color: black !important; }
                .toast .toast-title { color: black !important; }
                .toast .toast-close { color: black !important; }
                .toast div:not(.toast-actions) { color: black !important; }
                .toast .toast-btn { color: white !important; }
                .toast .toast-btn.primary { color: #E91E63 !important; }
            `;
            document.head.appendChild(style);
        }
        
        // Ejecutar inmediatamente y después de un delay
        forceToastStyles();
        setTimeout(forceToastStyles, 100);
        setTimeout(forceToastStyles, 500);
        setTimeout(forceToastStyles, 1000);
        
        // Observador de mutaciones para detectar toasts nuevos
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1 && node.classList && node.classList.contains('toast')) {
                            forceToastStyles();
                        }
                    });
                }
            });
        });
        
        // Observar cambios en el contenedor de toasts
        const toastContainer = document.getElementById('toastContainer');
        if (toastContainer) {
            observer.observe(toastContainer, { childList: true, subtree: true });
        }
        
        // Handle PWA installation - Simplified for React component
        let deferredPrompt;
        
        // Escuchar el evento beforeinstallprompt y pasarlo a React
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            console.log('beforeinstallprompt recibido');
            
            // Disparar evento personalizado para React
            window.dispatchEvent(new CustomEvent('pwa-install-available', { 
                detail: { deferredPrompt: e } 
            }));
        });
        
        window.addEventListener('appinstalled', () => {
            Toast.show('🎉 ¡Cherry App instalada exitosamente!', 'success', 4000);
            deferredPrompt = null;
            // Limpiar el flag para permitir mostrar el toast nuevamente si es necesario
            localStorage.removeItem('pwa-install-toast-shown');
        });
        
        // Escuchar eventos de instalación automática desde React
        window.addEventListener('pwa-installed', (event) => {
            console.log('PWA instalada automáticamente:', event.detail);
            localStorage.removeItem('pwa-install-toast-shown');
        });
        
        // Escuchar solicitudes de instalación para iOS
        window.addEventListener('ios-install-request', () => {
            console.log('Solicitud de instalación para iOS');
            // Aquí podrías mostrar un modal específico para iOS si es necesario
        });
        
        // Función global para limpiar el cache de instalación (para testing)
        window.clearPWAInstallCache = () => {
            localStorage.removeItem('pwa-install-toast-shown');
            localStorage.removeItem('pwa-modal-shown');
            localStorage.removeItem('pwa-manually-installed');
            console.log('🧹 Cache de instalación PWA completamente limpiado');
            console.log('🔄 Recarga la página para ver el botón de instalación');
            
            // Mostrar confirmación visual
            if (window.showToast) {
                window.showToast('Cache PWA limpiado. Recarga la página para ver el botón de instalación.', 'success', 5000);
            }
        };
        
        // Función para forzar mostrar el instalador PWA inmediatamente
        window.forceShowPWAInstaller = () => {
            // Limpiar cache primero
            window.clearPWAInstallCache();
            
            // Disparar evento para mostrar instalador
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('pwa-install-available', { 
                    detail: { deferredPrompt: deferredPrompt } 
                }));
                console.log('🚀 Instalador PWA forzado a aparecer');
            }, 500);
        };
        
        // Handle installation errors
        window.addEventListener('appinstalled', (evt) => {
    
        });
        
        window.addEventListener('beforeinstallprompt', (evt) => {
    
        });
        
        // Listen for messages from Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'TOAST') {
                    Toast.show(event.data.message, event.data.toastType, event.data.duration);
                }
            });
        }
    </script>
</body>
</html>

</body>
</html>
