import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

const InstallInstructions = () => {
    const [deviceType, setDeviceType] = useState('desktop');
    const [browserType, setBrowserType] = useState('chrome');
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Detectar dispositivo y navegador
        const userAgent = navigator.userAgent.toLowerCase();
        
        // Detectar dispositivo
        if (/iphone|ipad|ipod/i.test(userAgent)) {
            setDeviceType('ios');
        } else if (/android/i.test(userAgent)) {
            setDeviceType('android');
        } else {
            setDeviceType('desktop');
        }

        // Detectar navegador
        if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent)) {
            setBrowserType('chrome');
        } else if (/firefox/i.test(userAgent)) {
            setBrowserType('firefox');
        } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
            setBrowserType('safari');
        } else if (/edge/i.test(userAgent)) {
            setBrowserType('edge');
        }

        // Verificar si ya está instalada
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            setIsInstalled(true);
        }
    }, []);

    const instructions = {
        ios: {
            safari: {
                title: "Instalar en iPhone/iPad (Safari)",
                steps: [
                    {
                        step: 1,
                        text: "Abre Cherry App en Safari",
                        detail: "Asegúrate de estar usando Safari, no Chrome u otro navegador"
                    },
                    {
                        step: 2,
                        text: "Toca el botón 'Compartir'",
                        detail: "Es el ícono de cuadrado con flecha hacia arriba en la parte inferior de la pantalla",
                        icon: "📤"
                    },
                    {
                        step: 3,
                        text: "Selecciona 'Añadir a pantalla de inicio'",
                        detail: "Desplázate hacia abajo en el menú para encontrar esta opción",
                        icon: "📱"
                    },
                    {
                        step: 4,
                        text: "Personaliza el nombre (opcional)",
                        detail: "Puedes cambiar el nombre que aparecerá en tu pantalla de inicio"
                    },
                    {
                        step: 5,
                        text: "Toca 'Añadir'",
                        detail: "¡Listo! Cherry App aparecerá en tu pantalla de inicio"
                    }
                ]
            }
        },
        android: {
            chrome: {
                title: "Instalar en Android (Chrome)",
                steps: [
                    {
                        step: 1,
                        text: "Abre Cherry App en Chrome",
                        detail: "Navega a la aplicación usando Google Chrome"
                    },
                    {
                        step: 2,
                        text: "Busca el banner de instalación",
                        detail: "Debería aparecer automáticamente un banner en la parte inferior",
                        icon: "📢"
                    },
                    {
                        step: 3,
                        text: "Toca 'Instalar' o el ícono ⊕",
                        detail: "También puedes usar el menú (⋮) → 'Instalar app'",
                        icon: "⬇️"
                    },
                    {
                        step: 4,
                        text: "Confirma la instalación",
                        detail: "Toca 'Instalar' en el diálogo de confirmación"
                    }
                ]
            },
            firefox: {
                title: "Instalar en Android (Firefox)",
                steps: [
                    {
                        step: 1,
                        text: "Abre Cherry App en Firefox",
                        detail: "Navega a la aplicación usando Firefox"
                    },
                    {
                        step: 2,
                        text: "Toca el menú (⋮)",
                        detail: "Los tres puntos en la esquina superior derecha"
                    },
                    {
                        step: 3,
                        text: "Selecciona 'Instalar'",
                        detail: "Busca la opción 'Instalar' en el menú",
                        icon: "📥"
                    }
                ]
            }
        },
        desktop: {
            chrome: {
                title: "Instalar en Escritorio (Chrome)",
                steps: [
                    {
                        step: 1,
                        text: "Busca el ícono de instalación",
                        detail: "En la barra de direcciones, lado derecho, aparece un ícono ⊕ o 💻"
                    },
                    {
                        step: 2,
                        text: "Haz clic en el ícono de instalación",
                        detail: "O usa el menú (⋮) → 'Instalar Cherry App'",
                        icon: "🖱️"
                    },
                    {
                        step: 3,
                        text: "Confirma la instalación",
                        detail: "Haz clic en 'Instalar' en el diálogo"
                    },
                    {
                        step: 4,
                        text: "¡Listo!",
                        detail: "Cherry App se abrirá como una aplicación independiente y aparecerá en tu menú de aplicaciones"
                    }
                ]
            },
            edge: {
                title: "Instalar en Escritorio (Microsoft Edge)",
                steps: [
                    {
                        step: 1,
                        text: "Busca el ícono de instalación",
                        detail: "En la barra de direcciones aparece un ícono ⊕"
                    },
                    {
                        step: 2,
                        text: "Haz clic en 'Instalar esta aplicación'",
                        detail: "O usa el menú (⋯) → 'Aplicaciones' → 'Instalar este sitio como aplicación'"
                    },
                    {
                        step: 3,
                        text: "Personaliza la instalación",
                        detail: "Puedes cambiar el nombre y elegir si crear un acceso directo en el escritorio"
                    }
                ]
            }
        }
    };

    const currentInstructions = instructions[deviceType]?.[browserType] || instructions[deviceType]?.chrome || instructions.desktop.chrome;

    const benefits = [
        {
            icon: "🚀",
            title: "Acceso Rápido",
            description: "Abre Cherry App directamente desde tu pantalla de inicio, como cualquier otra aplicación"
        },
        {
            icon: "📱",
            title: "Experiencia Nativa",
            description: "Interfaz optimizada que se ve y se siente como una app nativa"
        },
        {
            icon: "🔄",
            title: "Funciona Offline",
            description: "Navega productos y ve tu carrito incluso sin conexión a internet"
        },
        {
            icon: "📢",
            title: "Notificaciones",
            description: "Recibe notificaciones sobre ofertas especiales y actualizaciones de pedidos"
        },
        {
            icon: "💾",
            title: "Menos Espacio",
            description: "Ocupa menos espacio que una app tradicional descargada de la tienda"
        },
        {
            icon: "🔄",
            title: "Siempre Actualizada",
            description: "Se actualiza automáticamente sin necesidad de descargar actualizaciones"
        }
    ];

    if (isInstalled) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-12 px-4">
                <Helmet>
                    <title>Cherry App ya está instalada - Cherry App</title>
                    <meta name="description" content="Cherry App ya está instalada en tu dispositivo" />
                </Helmet>
                
                <div className="max-w-2xl mx-auto text-center">
                    <div className="bg-white rounded-3xl shadow-xl p-8">
                        <div className="text-6xl mb-4">🎉</div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-4">
                            ¡Cherry App ya está instalada!
                        </h1>
                        <p className="text-gray-600 text-lg mb-6">
                            Ya puedes disfrutar de la mejor experiencia de compra desde tu pantalla de inicio.
                        </p>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                        >
                            Ir a Cherry App
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-12 px-4">
            <Helmet>
                <title>Cómo Instalar Cherry App - Instrucciones de Instalación</title>
                <meta name="description" content="Aprende cómo instalar Cherry App en tu dispositivo móvil o computadora. Instrucciones paso a paso para todos los dispositivos." />
            </Helmet>
            
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                        Instalar Cherry App
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Sigue estos sencillos pasos para instalar Cherry App en tu dispositivo y tener acceso rápido a toda nuestra moda y accesorios
                    </p>
                </div>

                {/* Device Detection Info */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <div className="text-4xl mr-3">
                            {deviceType === 'ios' ? '📱' : deviceType === 'android' ? '🤖' : '💻'}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                                Detectamos que usas: {deviceType === 'ios' ? 'iPhone/iPad' : deviceType === 'android' ? 'Android' : 'Computadora'}
                            </h3>
                            <p className="text-gray-600">Navegador: {browserType.charAt(0).toUpperCase() + browserType.slice(1)}</p>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Instructions */}
                    <div className="bg-white rounded-2xl shadow-lg p-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">
                            {currentInstructions.title}
                        </h2>
                        
                        <div className="space-y-6">
                            {currentInstructions.steps.map((step) => (
                                <div key={step.step} className="flex items-start space-x-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                                            {step.step}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center mb-1">
                                            {step.icon && <span className="text-xl mr-2">{step.icon}</span>}
                                            <h3 className="font-semibold text-gray-800">{step.text}</h3>
                                        </div>
                                        <p className="text-gray-600 text-sm">{step.detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Alternative methods */}
                        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-semibold text-blue-800 mb-2">💡 ¿No ves la opción de instalar?</h4>
                            <ul className="text-sm text-blue-700 space-y-1">
                                <li>• Asegúrate de usar un navegador compatible (Chrome, Safari, Edge, Firefox)</li>
                                <li>• Verifica que tengas la última versión de tu navegador</li>
                                <li>• En algunos casos, necesitas interactuar con la página antes de que aparezca la opción</li>
                            </ul>
                        </div>
                    </div>

                    {/* Benefits */}
                    <div className="bg-white rounded-2xl shadow-lg p-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">
                            ¿Por qué instalar Cherry App?
                        </h2>
                        
                        <div className="space-y-4">
                            {benefits.map((benefit, index) => (
                                <div key={index} className="flex items-start space-x-3">
                                    <div className="text-2xl">{benefit.icon}</div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800">{benefit.title}</h3>
                                        <p className="text-gray-600 text-sm">{benefit.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg">
                            <h4 className="font-semibold text-gray-800 mb-2">🔒 Completamente Seguro</h4>
                            <p className="text-sm text-gray-600">
                                Cherry App es una Progressive Web App (PWA) que cumple con todos los estándares de seguridad web. 
                                No requiere permisos especiales y se actualiza automáticamente.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Troubleshooting */}
                <div className="mt-8 bg-white rounded-2xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">
                        ¿Necesitas ayuda?
                    </h2>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold text-gray-800 mb-3">Problemas Comunes</h3>
                            <ul className="space-y-2 text-gray-600">
                                <li className="flex items-start">
                                    <span className="text-pink-500 mr-2">•</span>
                                    <span>Si no aparece la opción de instalar, intenta recargar la página</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-pink-500 mr-2">•</span>
                                    <span>En iOS, solo funciona con Safari (no con Chrome u otros navegadores)</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-pink-500 mr-2">•</span>
                                    <span>Asegúrate de tener suficiente espacio en tu dispositivo</span>
                                </li>
                            </ul>
                        </div>
                        
                        <div>
                            <h3 className="font-semibold text-gray-800 mb-3">¿Aún tienes problemas?</h3>
                            <p className="text-gray-600 mb-4">
                                Nuestro equipo de soporte está aquí para ayudarte con cualquier duda sobre la instalación.
                            </p>
                            <button
                                onClick={() => window.location.href = '/contacto'}
                                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-full font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
                            >
                                Contactar Soporte
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstallInstructions;
















