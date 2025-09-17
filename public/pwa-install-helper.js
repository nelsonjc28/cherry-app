// PWA Installation Helper - Diagnóstico y solución de problemas
class PWAInstallHelper {
    constructor() {
        this.isDebugMode = window.location.search.includes('pwa-debug=true');
        this.diagnostics = {
            manifest: false,
            serviceWorker: false,
            icons: false,
            https: false,
            beforeInstallPrompt: false,
            installable: false
        };
        
        this.init();
    }

    init() {
        if (this.isDebugMode) {
            console.log('🔧 PWA Debug Mode activado');
            this.createDebugPanel();
        }
        
        this.runDiagnostics();
        this.setupEventListeners();
    }

    async runDiagnostics() {
        console.log('🔍 Ejecutando diagnósticos PWA...');
        
        // 1. Verificar HTTPS
        this.diagnostics.https = location.protocol === 'https:' || location.hostname === 'localhost';
        
        // 2. Verificar Service Worker
        this.diagnostics.serviceWorker = 'serviceWorker' in navigator;
        
        // 3. Verificar Manifest
        try {
            const response = await fetch('/manifest.json');
            if (response.ok) {
                const manifest = await response.json();
                this.diagnostics.manifest = true;
                console.log('✅ Manifest cargado:', manifest);
                
                // Verificar iconos del manifest
                await this.checkManifestIcons(manifest);
            }
        } catch (error) {
            console.error('❌ Error cargando manifest:', error);
        }

        // 4. Verificar beforeinstallprompt
        this.checkInstallPrompt();
        
        // 5. Mostrar resultados
        this.showDiagnosticResults();
    }

    async checkManifestIcons(manifest) {
        if (!manifest.icons || manifest.icons.length === 0) {
            console.warn('⚠️ No se encontraron iconos en el manifest');
            return;
        }

        const iconChecks = manifest.icons.map(async (icon) => {
            try {
                const response = await fetch(icon.src);
                const exists = response.ok;
                console.log(`${exists ? '✅' : '❌'} Icono ${icon.sizes}: ${icon.src}`);
                return exists;
            } catch (error) {
                console.error(`❌ Error verificando icono ${icon.src}:`, error);
                return false;
            }
        });

        const results = await Promise.all(iconChecks);
        this.diagnostics.icons = results.some(result => result);
        
        if (!this.diagnostics.icons) {
            console.error('❌ Ningún icono del manifest está disponible');
            this.fixMissingIcons();
        }
    }

    checkInstallPrompt() {
        // Escuchar beforeinstallprompt
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('✅ beforeinstallprompt detectado');
            this.diagnostics.beforeInstallPrompt = true;
            this.diagnostics.installable = true;
            
            if (this.isDebugMode) {
                this.updateDebugPanel();
            }
        });

        // Verificar si ya está instalada
        if (window.matchMedia('(display-mode: standalone)').matches || 
            window.navigator.standalone === true) {
            console.log('✅ PWA ya está instalada');
            this.diagnostics.installable = false; // Ya instalada
        }
    }

    setupEventListeners() {
        // Escuchar instalación exitosa
        window.addEventListener('appinstalled', () => {
            console.log('🎉 PWA instalada exitosamente');
            this.showInstallationSuccess();
        });

        // Escuchar errores del Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('error', (error) => {
                console.error('❌ Error en Service Worker:', error);
                this.showServiceWorkerError();
            });
        }
    }

    fixMissingIcons() {
        console.log('🔧 Intentando corregir iconos faltantes...');
        
        // Crear iconos de respaldo usando canvas
        this.createFallbackIcons();
    }

    createFallbackIcons() {
        const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        sizes.forEach(size => {
            canvas.width = size;
            canvas.height = size;
            
            // Crear un icono simple con el logo de Cherry
            ctx.fillStyle = '#E91E63';
            ctx.fillRect(0, 0, size, size);
            
            ctx.fillStyle = 'white';
            ctx.font = `bold ${size * 0.3}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🍒', size / 2, size / 2);
            
            // Convertir a blob y crear URL
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                console.log(`✅ Icono de respaldo creado: ${size}x${size}`);
                
                // Opcional: descargar el icono para uso permanente
                if (this.isDebugMode) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `cherry-icon-${size}x${size}.png`;
                    // link.click(); // Descomenta para descargar automáticamente
                }
            }, 'image/png');
        });
    }

    showDiagnosticResults() {
        const results = Object.entries(this.diagnostics).map(([key, value]) => 
            `${value ? '✅' : '❌'} ${key}: ${value}`
        ).join('\n');
        
        console.log('📊 Resultados del diagnóstico PWA:\n' + results);
        
        // Mostrar recomendaciones
        this.showRecommendations();
    }

    showRecommendations() {
        const recommendations = [];
        
        if (!this.diagnostics.https) {
            recommendations.push('🔒 Usar HTTPS para instalación PWA');
        }
        
        if (!this.diagnostics.manifest) {
            recommendations.push('📄 Verificar que /manifest.json sea accesible');
        }
        
        if (!this.diagnostics.serviceWorker) {
            recommendations.push('⚙️ Service Worker no soportado en este navegador');
        }
        
        if (!this.diagnostics.icons) {
            recommendations.push('🖼️ Crear iconos faltantes para la PWA');
        }
        
        if (!this.diagnostics.beforeInstallPrompt) {
            recommendations.push('📱 beforeinstallprompt no disponible (normal en algunos navegadores)');
        }

        if (recommendations.length > 0) {
            console.log('💡 Recomendaciones:\n' + recommendations.join('\n'));
        } else {
            console.log('🎉 ¡Todos los diagnósticos pasaron! La PWA debería ser instalable.');
        }
    }

    createDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'pwa-debug-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        
        panel.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px;">🔧 PWA Debug Panel</div>
            <div id="debug-content">Cargando diagnósticos...</div>
            <div style="margin-top: 10px;">
                <button onclick="window.pwaHelper.forceInstallPrompt()" style="background: #E91E63; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">Forzar Instalación</button>
                <button onclick="window.pwaHelper.clearCache()" style="background: #666; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Limpiar Cache</button>
            </div>
        `;
        
        document.body.appendChild(panel);
    }

    updateDebugPanel() {
        const content = document.getElementById('debug-content');
        if (content) {
            const results = Object.entries(this.diagnostics).map(([key, value]) => 
                `${value ? '✅' : '❌'} ${key}`
            ).join('<br>');
            content.innerHTML = results;
        }
    }

    forceInstallPrompt() {
        console.log('🚀 Forzando prompt de instalación...');
        
        // Simular evento beforeinstallprompt
        const event = new CustomEvent('beforeinstallprompt', {
            detail: { platforms: ['web'] }
        });
        
        window.dispatchEvent(event);
        
        // También disparar evento personalizado para React
        window.dispatchEvent(new CustomEvent('pwa-install-available', {
            detail: { deferredPrompt: event }
        }));
    }

    async clearCache() {
        console.log('🧹 Limpiando cache...');
        
        try {
            // Limpiar cache del navegador
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
                console.log('✅ Cache del navegador limpiado');
            }
            
            // Limpiar localStorage relacionado con PWA
            const pwaKeys = Object.keys(localStorage).filter(key => 
                key.includes('pwa') || key.includes('install')
            );
            pwaKeys.forEach(key => localStorage.removeItem(key));
            
            // Recargar Service Worker
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    await registration.unregister();
                    console.log('✅ Service Worker desregistrado');
                }
            }
            
            alert('✅ Cache limpiado. Recarga la página para ver los cambios.');
            
        } catch (error) {
            console.error('❌ Error limpiando cache:', error);
            alert('❌ Error limpiando cache: ' + error.message);
        }
    }

    showInstallationSuccess() {
        if (window.Toast) {
            window.Toast.show('🎉 ¡Cherry App instalada correctamente!', 'success', 5000);
        } else {
            alert('🎉 ¡Cherry App instalada correctamente!');
        }
    }

    showServiceWorkerError() {
        if (window.Toast) {
            window.Toast.show('❌ Error en Service Worker. Recarga la página.', 'error', 5000);
        }
    }

    // Método para obtener información del dispositivo
    getDeviceInfo() {
        const userAgent = navigator.userAgent.toLowerCase();
        const info = {
            isMobile: /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent),
            isIOS: /iphone|ipad|ipod/i.test(userAgent),
            isAndroid: /android/i.test(userAgent),
            browser: this.getBrowserInfo(),
            supportsInstall: this.diagnostics.beforeInstallPrompt || this.diagnostics.serviceWorker
        };
        
        console.log('📱 Información del dispositivo:', info);
        return info;
    }

    getBrowserInfo() {
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('chrome') && !userAgent.includes('edge')) return 'chrome';
        if (userAgent.includes('firefox')) return 'firefox';
        if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'safari';
        if (userAgent.includes('edge')) return 'edge';
        return 'unknown';
    }

    // Método para mostrar instrucciones específicas del dispositivo
    showInstallInstructions() {
        const device = this.getDeviceInfo();
        let instructions = '';
        
        if (device.isIOS) {
            instructions = 'Para instalar en iOS:\n1. Toca el botón "Compartir" (📤)\n2. Selecciona "Añadir a pantalla de inicio"\n3. Personaliza el nombre y toca "Añadir"';
        } else if (device.isAndroid) {
            instructions = 'Para instalar en Android:\n1. Busca el banner de instalación\n2. Toca "Instalar" o usa el menú ⋮\n3. Confirma la instalación';
        } else {
            instructions = 'Para instalar en escritorio:\n1. Busca el ícono ⊕ en la barra de direcciones\n2. Haz clic en "Instalar Cherry App"\n3. Confirma la instalación';
        }
        
        if (window.Toast) {
            window.Toast.show(instructions, 'info', 8000);
        } else {
            alert(instructions);
        }
    }
}

// Inicializar automáticamente
window.addEventListener('DOMContentLoaded', () => {
    window.pwaHelper = new PWAInstallHelper();
});

// También inicializar si el DOM ya está cargado
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
        window.pwaHelper = new PWAInstallHelper();
    });
} else {
    window.pwaHelper = new PWAInstallHelper();
}

// Funciones globales para debugging
window.checkPWA = () => window.pwaHelper?.runDiagnostics();
window.showPWAInstructions = () => window.pwaHelper?.showInstallInstructions();
window.forcePWAInstall = () => window.pwaHelper?.forceInstallPrompt();
