import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const DesktopShortcuts = () => {
    const [manager, setManager] = useState(null);
    const [installStatus, setInstallStatus] = useState(null);
    const [instructions, setInstructions] = useState(null);
    const [isCreatingShortcuts, setIsCreatingShortcuts] = useState(false);

    useEffect(() => {
        // Cargar el script del manager si no está disponible
        if (!window.DesktopShortcutManager) {
            const script = document.createElement('script');
            script.src = '/create-desktop-shortcut.js';
            script.onload = initializeManager;
            document.head.appendChild(script);
        } else {
            initializeManager();
        }

        function initializeManager() {
            const shortcutManager = new window.DesktopShortcutManager();
            setManager(shortcutManager);
            setInstallStatus(shortcutManager.getInstallationStatus());
            setInstructions(shortcutManager.getInstallationInstructions());
        }
    }, []);

    const createAllShortcuts = async () => {
        if (!manager) return;

        setIsCreatingShortcuts(true);
        
        try {
            const results = manager.createAllShortcuts();
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);

            if (successful.length > 0) {
                toast.success(
                    `¡${successful.length} accesos directos creados exitosamente! Revisa tu carpeta de Descargas.`,
                    {
                        position: "top-center",
                        autoClose: 5000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                        draggable: true,
                    }
                );
            }

            if (failed.length > 0) {
                toast.error(
                    `Error al crear ${failed.length} accesos directos. Intenta de nuevo.`,
                    {
                        position: "top-center",
                        autoClose: 4000,
                    }
                );
            }
        } catch (error) {
            toast.error('Error al crear accesos directos: ' + error.message);
        } finally {
            setIsCreatingShortcuts(false);
        }
    };

    const createSingleShortcut = async (index) => {
        if (!manager) return;

        try {
            const result = manager.createShortcut(index);
            
            if (result.success) {
                toast.success(result.message, {
                    position: "top-center",
                    autoClose: 4000,
                });
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Error al crear acceso directo: ' + error.message);
        }
    };

    // No mostrar en móviles o si ya está instalada como PWA
    if (!installStatus?.isDesktop || installStatus?.isInstalled) {
        return null;
    }

    const shortcuts = [
        {
            name: 'Inicio',
            description: 'Página principal',
            icon: '🏠',
            url: '/'
        },
        {
            name: 'Categorías',
            description: 'Explorar productos',
            icon: '📂',
            url: '/categorias'
        },
        {
            name: 'Carrito',
            description: 'Ver compras',
            icon: '🛒',
            url: '/carrito-detalle'
        },
        {
            name: 'Mi Perfil',
            description: 'Gestionar cuenta',
            icon: '👤',
            url: '/perfil'
        }
    ];

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex items-center mb-4">
                <div className="text-3xl mr-3">💻</div>
                <div>
                    <h3 className="text-xl font-bold text-gray-800">
                        Accesos Directos de Escritorio
                    </h3>
                    <p className="text-gray-600">
                        Crea accesos directos para usar Cherry App como una aplicación nativa
                    </p>
                </div>
            </div>

            {/* Información del sistema */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex items-center mb-2">
                    <span className="text-lg mr-2">
                        {installStatus?.os === 'windows' ? '🪟' : 
                         installStatus?.os === 'macos' ? '🍎' : 
                         installStatus?.os === 'linux' ? '🐧' : '💻'}
                    </span>
                    <span className="font-semibold text-blue-800">
                        Sistema detectado: {installStatus?.os?.charAt(0).toUpperCase() + installStatus?.os?.slice(1) || 'Desconocido'}
                    </span>
                </div>
                <p className="text-blue-700 text-sm">
                    Los accesos directos se crearán en el formato adecuado para tu sistema operativo
                </p>
            </div>

            {/* Accesos directos disponibles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {shortcuts.map((shortcut, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <span className="text-2xl mr-3">{shortcut.icon}</span>
                                <div>
                                    <h4 className="font-semibold text-gray-800">{shortcut.name}</h4>
                                    <p className="text-gray-600 text-sm">{shortcut.description}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => createSingleShortcut(index)}
                                className="bg-pink-100 text-pink-600 px-3 py-1 rounded-full text-sm hover:bg-pink-200 transition-colors"
                            >
                                Crear
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Botón para crear todos */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <button
                    onClick={createAllShortcuts}
                    disabled={isCreatingShortcuts}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                    {isCreatingShortcuts ? (
                        <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creando...
                        </span>
                    ) : (
                        '🚀 Crear Todos los Accesos Directos'
                    )}
                </button>
                
                <div className="text-sm text-gray-500">
                    Los archivos se descargarán a tu carpeta de Descargas
                </div>
            </div>

            {/* Instrucciones */}
            {instructions && (
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-3">{instructions.title}</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                        {instructions.steps.map((step, index) => (
                            <li key={index}>{step}</li>
                        ))}
                    </ol>
                    {instructions.note && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-yellow-800 text-sm">
                                <span className="font-semibold">💡 Consejo:</span> {instructions.note}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Información adicional */}
            <div className="mt-6 border-t border-gray-200 pt-4">
                <h4 className="font-semibold text-gray-800 mb-2">¿Por qué usar accesos directos?</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span>Acceso rápido desde el escritorio</span>
                    </div>
                    <div className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span>No requiere abrir el navegador</span>
                    </div>
                    <div className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span>Funciona como una aplicación nativa</span>
                    </div>
                    <div className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span>Compatible con todos los sistemas</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DesktopShortcuts;




