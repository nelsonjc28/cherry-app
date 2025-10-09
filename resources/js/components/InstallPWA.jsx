import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const InstallPWA = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [deviceType, setDeviceType] = useState('unknown');

    useEffect(() => {
        // Detectar tipo de dispositivo
        const detectDevice = () => {
            const userAgent = navigator.userAgent.toLowerCase();
            const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
            const isIOS = /iphone|ipad|ipod/i.test(userAgent);
            const isAndroid = /android/i.test(userAgent);
            const isSafari = /safari/i.test(userAgent) && !/chrome/i.test(userAgent);
            
            if (isIOS) return 'ios';
            if (isAndroid) return 'android';
            if (isMobile) return 'mobile';
            return 'desktop';
        };

        setDeviceType(detectDevice());

        // Verificar si ya está instalada
        const checkIfInstalled = () => {
            // PWA instalada si está en modo standalone
            if (window.matchMedia('(display-mode: standalone)').matches) {
                setIsInstalled(true);
                return true;
            }
            
            // Verificar en iOS Safari
            if (window.navigator.standalone === true) {
                setIsInstalled(true);
                return true;
            }
            
            return false;
        };

        if (checkIfInstalled()) {
            return;
        }

        // Escuchar evento beforeinstallprompt
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            
            // Mostrar banner después de un breve delay
            setTimeout(() => {
                setShowInstallBanner(true);
            }, 3000);
        };

        // Escuchar cuando la app se instala
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setShowInstallBanner(false);
            setDeferredPrompt(null);
            
            toast.success('¡Cherry App instalada correctamente! 🎉', {
                position: "top-center",
                autoClose: 4000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            // Si no hay prompt nativo, mostrar instrucciones manuales
            showManualInstallInstructions();
            return;
        }

        try {
            // Mostrar el prompt de instalación
            const result = await deferredPrompt.prompt();;

            if (result.outcome === 'accepted') {
                toast.info('Instalando Cherry App...', {
                    position: "top-center",
                    autoClose: 2000,
                });
            } else {
                }

            setDeferredPrompt(null);
            setShowInstallBanner(false);
        } catch (error) {
            console.error('Error al mostrar prompt de instalación:', error);
            showManualInstallInstructions();
        }
    };

    const showManualInstallInstructions = () => {
        let instructions = '';
        
        switch (deviceType) {
            case 'ios':
                instructions = 'Para instalar en iOS: Toca el botón "Compartir" y selecciona "Añadir a pantalla de inicio"';
                break;
            case 'android':
                instructions = 'Para instalar en Android: Toca el menú del navegador y selecciona "Instalar app" o "Añadir a pantalla de inicio"';
                break;
            case 'desktop':
                instructions = 'Para instalar en escritorio: Busca el ícono de instalación en la barra de direcciones del navegador';
                break;
            default:
                instructions = 'Busca la opción "Instalar app" o "Añadir a pantalla de inicio" en el menú de tu navegador';
        }

        toast.info(instructions, {
            position: "top-center",
            autoClose: 6000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
        });
    };

    const dismissBanner = () => {
        setShowInstallBanner(false);
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    };

    // No mostrar si ya está instalada
    if (isInstalled) {
        return null;
    }

    // No mostrar si fue rechazada recientemente
    const dismissedTime = localStorage.getItem('pwa-install-dismissed');
    if (dismissedTime && (Date.now() - parseInt(dismissedTime)) < 7 * 24 * 60 * 60 * 1000) { // 7 días
        return null;
    }

    if (!showInstallBanner) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4 shadow-lg z-50 transform transition-transform duration-300 ease-in-out">
            <div className="flex items-center justify-between max-w-md mx-auto">
                <div className="flex items-center space-x-3">
                    <div className="bg-white bg-opacity-20 rounded-full p-2">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-semibold text-sm">¡Instala Cherry App!</p>
                        <p className="text-xs opacity-90">Acceso rápido desde tu pantalla de inicio</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handleInstallClick}
                        className="bg-white text-pink-600 px-4 py-2 rounded-full text-sm font-semibold hover:bg-gray-100 transition-colors duration-200"
                    >
                        Instalar
                    </button>
                    <button
                        onClick={dismissBanner}
                        className="text-white hover:text-gray-200 transition-colors duration-200"
                        aria-label="Cerrar"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
            
            {/* Indicador de deslizar hacia arriba en móviles */}
            {deviceType !== 'desktop' && (
                <div className="flex justify-center mt-2">
                    <div className="w-12 h-1 bg-white bg-opacity-30 rounded-full"></div>
                </div>
            )}
        </div>
    );
};

export default InstallPWA;
