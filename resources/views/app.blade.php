<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ config('app.name', 'Cherry App') }}</title>
    
    <!-- PWA Meta Tags -->
    <link rel="manifest" href="/manifest.json">
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-144x144.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-144x144.png">
    
    <!-- Modern PWA Meta Tags -->
    <meta name="theme-color" content="#E91E63">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="Cherry App">
    
    <!-- Additional PWA Meta Tags for better installation -->
    <meta name="application-name" content="Cherry App">
    <meta name="msapplication-TileColor" content="#E91E63">
    <meta name="msapplication-TileImage" content="/icons/icon-144x144.png">
    
    <!-- Toast Styles -->
    <style>
        .toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            pointer-events: none;
        }
        
        .toast {
            background: #E91E63;
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
            transform: translateX(400px);
            transition: transform 0.3s ease;
            pointer-events: auto;
            max-width: 300px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.4;
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
        }
        
        .toast-close {
            background: none;
            border: none;
            color: white;
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
    </style>
    
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
                const container = document.getElementById('toastContainer');
                const toast = document.createElement('div');
                toast.className = `toast ${type}`;
                
                const header = document.createElement('div');
                header.className = 'toast-header';
                
                const title = document.createElement('div');
                title.className = 'toast-title';
                title.textContent = type === 'success' ? '✅ Éxito' : 
                                  type === 'error' ? '❌ Error' : 
                                  type === 'warning' ? '⚠️ Advertencia' : '🍒 Cherry App';
                
                const closeBtn = document.createElement('button');
                closeBtn.className = 'toast-close';
                closeBtn.innerHTML = '×';
                closeBtn.onclick = () => this.hide(toast);
                
                header.appendChild(title);
                header.appendChild(closeBtn);
                
                const content = document.createElement('div');
                content.textContent = message;
                
                toast.appendChild(header);
                toast.appendChild(content);
                
                if (actions) {
                    const actionsDiv = document.createElement('div');
                    actionsDiv.className = 'toast-actions';
                    
                    actions.forEach(action => {
                        const btn = document.createElement('button');
                        btn.className = `toast-btn ${action.primary ? 'primary' : ''}`;
                        btn.textContent = action.text;
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
        
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then((registration) => {
                
                        
                        // Check for updates
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
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
                        });
                    })
                    .catch((error) => {
                
                        Toast.show('Error al registrar el service worker', 'error', 5000);
                    });
            });
        }
        
        // Handle PWA installation
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
    
            
            // Show installation toast
            Toast.show(
                '¡Instala Cherry App en tu dispositivo!',
                'info',
                0, // No auto-hide
                [
                    {
                        text: 'Instalar',
                        primary: true,
                        onClick: () => {
                            deferredPrompt.prompt();
                            deferredPrompt.userChoice.then((choiceResult) => {
                                if (choiceResult.outcome === 'accepted') {
                                    Toast.show('¡Cherry App instalada exitosamente!', 'success', 3000);
                                } else {
                                    Toast.show('Instalación cancelada', 'warning', 3000);
                                }
                                deferredPrompt = null;
                            });
                        }
                    },
                    {
                        text: 'Más tarde',
                        onClick: () => {
                            Toast.show('Puedes instalar la app más tarde desde el menú del navegador', 'info', 3000);
                        }
                    }
                ]
            );
        });
        
        window.addEventListener('appinstalled', () => {
    
            Toast.show('¡Cherry App instalada exitosamente! 🎉', 'success', 4000);
            deferredPrompt = null;
        });
        
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
