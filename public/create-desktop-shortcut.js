// Script para crear accesos directos específicos de escritorio
class DesktopShortcutManager {
    constructor() {
        this.isDesktop = this.detectDesktop();
        this.shortcuts = [
            {
                name: 'Cherry App - Inicio',
                url: '/',
                description: 'Página principal de Cherry App',
                icon: '/images/logo.svg'
            },
            {
                name: 'Cherry App - Categorías',
                url: '/categorias',
                description: 'Explorar todas las categorías',
                icon: '/images/logo.svg'
            },
            {
                name: 'Cherry App - Carrito',
                url: '/carrito-detalle',
                description: 'Ver carrito de compras',
                icon: '/images/logo.svg'
            },
            {
                name: 'Cherry App - Mi Perfil',
                url: '/perfil',
                description: 'Gestionar cuenta y pedidos',
                icon: '/images/logo.svg'
            }
        ];
    }

    detectDesktop() {
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        return !isMobile;
    }

    // Crear archivo .desktop para Linux
    createLinuxDesktopFile(shortcut) {
        const desktopContent = `[Desktop Entry]
Name=${shortcut.name}
Comment=${shortcut.description}
Exec=xdg-open "${window.location.origin}${shortcut.url}"
Icon=${window.location.origin}${shortcut.icon}
Terminal=false
Type=Application
Categories=Network;WebBrowser;
StartupNotify=true
MimeType=text/html;text/xml;application/xhtml+xml;
`;

        const blob = new Blob([desktopContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${shortcut.name.replace(/\s+/g, '-').toLowerCase()}.desktop`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        return {
            success: true,
            message: `Archivo .desktop creado. Cópialo a ~/Desktop o ~/.local/share/applications/`,
            filename: link.download
        };
    }

    // Crear archivo .url para Windows
    createWindowsUrlFile(shortcut) {
        const urlContent = `[InternetShortcut]
URL=${window.location.origin}${shortcut.url}
IconFile=${window.location.origin}${shortcut.icon}
IconIndex=0
`;

        const blob = new Blob([urlContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${shortcut.name.replace(/\s+/g, '-').toLowerCase()}.url`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        return {
            success: true,
            message: `Archivo de acceso directo creado. Cópialo a tu Escritorio`,
            filename: link.download
        };
    }

    // Crear archivo .webloc para macOS
    createMacWeblocFile(shortcut) {
        const weblocContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>URL</key>
    <string>${window.location.origin}${shortcut.url}</string>
</dict>
</plist>`;

        const blob = new Blob([weblocContent], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${shortcut.name.replace(/\s+/g, '-').toLowerCase()}.webloc`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        return {
            success: true,
            message: `Archivo .webloc creado. Cópialo a tu Escritorio`,
            filename: link.download
        };
    }

    // Detectar sistema operativo
    detectOS() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (userAgent.includes('win')) {
            return 'windows';
        } else if (userAgent.includes('mac')) {
            return 'macos';
        } else if (userAgent.includes('linux')) {
            return 'linux';
        } else {
            return 'unknown';
        }
    }

    // Crear acceso directo según el sistema operativo
    createShortcut(shortcutIndex = 0) {
        if (!this.isDesktop) {
            return {
                success: false,
                message: 'Esta función está diseñada para computadoras de escritorio'
            };
        }

        const shortcut = this.shortcuts[shortcutIndex];
        if (!shortcut) {
            return {
                success: false,
                message: 'Acceso directo no encontrado'
            };
        }

        const os = this.detectOS();
        
        try {
            switch (os) {
                case 'windows':
                    return this.createWindowsUrlFile(shortcut);
                case 'macos':
                    return this.createMacWeblocFile(shortcut);
                case 'linux':
                    return this.createLinuxDesktopFile(shortcut);
                default:
                    return this.createWindowsUrlFile(shortcut); // Fallback
            }
        } catch (error) {
            return {
                success: false,
                message: `Error al crear acceso directo: ${error.message}`
            };
        }
    }

    // Crear todos los accesos directos
    createAllShortcuts() {
        const results = [];
        
        for (let i = 0; i < this.shortcuts.length; i++) {
            const result = this.createShortcut(i);
            results.push({
                shortcut: this.shortcuts[i].name,
                ...result
            });
        }
        
        return results;
    }

    // Obtener instrucciones específicas del sistema
    getInstallationInstructions() {
        const os = this.detectOS();
        
        const instructions = {
            windows: {
                title: 'Instrucciones para Windows',
                steps: [
                    'Descarga los archivos .url haciendo clic en "Crear Acceso Directo"',
                    'Los archivos se descargarán a tu carpeta de Descargas',
                    'Arrastra los archivos .url a tu Escritorio',
                    'Haz doble clic en cualquier acceso directo para abrir Cherry App'
                ],
                note: 'También puedes copiar los archivos a la carpeta de Inicio para acceder desde el menú Inicio'
            },
            macos: {
                title: 'Instrucciones para macOS',
                steps: [
                    'Descarga los archivos .webloc haciendo clic en "Crear Acceso Directo"',
                    'Los archivos se descargarán a tu carpeta de Descargas',
                    'Arrastra los archivos .webloc a tu Escritorio o Dock',
                    'Haz doble clic en cualquier acceso directo para abrir Cherry App'
                ],
                note: 'También puedes agregar los accesos directos a la carpeta Aplicaciones'
            },
            linux: {
                title: 'Instrucciones para Linux',
                steps: [
                    'Descarga los archivos .desktop haciendo clic en "Crear Acceso Directo"',
                    'Copia los archivos a ~/Desktop para accesos directos en el escritorio',
                    'O copia a ~/.local/share/applications/ para accesos desde el menú de aplicaciones',
                    'Haz los archivos ejecutables: chmod +x archivo.desktop',
                    'Haz doble clic en cualquier acceso directo para abrir Cherry App'
                ],
                note: 'Algunos entornos de escritorio pueden requerir marcar el archivo como "ejecutable" desde las propiedades'
            }
        };

        return instructions[os] || instructions.windows;
    }

    // Verificar si el navegador soporta PWA nativa
    checkPWASupport() {
        return {
            beforeInstallPrompt: 'onbeforeinstallprompt' in window,
            serviceWorker: 'serviceWorker' in navigator,
            webAppManifest: !!document.querySelector('link[rel="manifest"]'),
            standalone: window.matchMedia('(display-mode: standalone)').matches
        };
    }

    // Obtener estado de instalación
    getInstallationStatus() {
        const pwaSupport = this.checkPWASupport();
        
        return {
            isDesktop: this.isDesktop,
            os: this.detectOS(),
            isInstalled: pwaSupport.standalone,
            canInstallNatively: pwaSupport.beforeInstallPrompt && pwaSupport.serviceWorker,
            needsManualShortcuts: !pwaSupport.beforeInstallPrompt || !pwaSupport.serviceWorker
        };
    }
}

// Hacer disponible globalmente
window.DesktopShortcutManager = DesktopShortcutManager;

// Auto-inicializar si está en el DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.cherryDesktopManager = new DesktopShortcutManager();
    });
} else {
    window.cherryDesktopManager = new DesktopShortcutManager();
}








