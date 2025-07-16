import React from 'react';
import { Helmet } from 'react-helmet-async';
import CherryButton from '../components/CherryButton/CherryButton';
import './CookiesPage.css';

const CookiesPage = () => {
  const handleAcceptAll = () => {
    // Aquí iría la lógica para aceptar todas las cookies
  };

  const handleRejectAll = () => {
    // Aquí iría la lógica para rechazar todas las cookies
  };

  return (
    <>
      <Helmet>
        <title>Política de Cookies - Cherry Central</title>
        <meta name="description" content="Política de cookies de Cherry Central. Conoce cómo utilizamos las cookies para mejorar tu experiencia." />
      </Helmet>

      <main className="cookies-page">
        <div className="container">
          <div className="cookies-content">
            <h1>Política de Cookies</h1>
            <p className="cookies-date">Última actualización: Enero 2025</p>

            <section className="cookies-section">
              <h2>¿Qué son las Cookies?</h2>
              <p>
                Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo 
                cuando visitas nuestro sitio web. Nos ayudan a recordar tus preferencias, 
                analizar el tráfico del sitio y personalizar tu experiencia.
              </p>
            </section>

            <section className="cookies-section">
              <h2>Tipos de Cookies que Utilizamos</h2>
              
              <div className="cookie-types">
                <div className="cookie-type">
                  <h3>Cookies Esenciales</h3>
                  <p>
                    Son necesarias para el funcionamiento básico del sitio. Incluyen cookies 
                    de sesión, autenticación y seguridad.
                  </p>
                  <ul>
                    <li>Mantener tu sesión activa</li>
                    <li>Recordar tus preferencias de idioma</li>
                    <li>Gestionar el carrito de compras</li>
                  </ul>
                </div>

                <div className="cookie-type">
                  <h3>Cookies de Rendimiento</h3>
                  <p>
                    Nos ayudan a entender cómo interactúas con nuestro sitio para mejorar 
                    su funcionamiento.
                  </p>
                  <ul>
                    <li>Analizar páginas más visitadas</li>
                    <li>Identificar errores del sitio</li>
                    <li>Medir tiempos de carga</li>
                  </ul>
                </div>

                <div className="cookie-type">
                  <h3>Cookies de Funcionalidad</h3>
                  <p>
                    Permiten que el sitio recuerde las elecciones que haces para 
                    proporcionar una experiencia más personalizada.
                  </p>
                  <ul>
                    <li>Recordar productos favoritos</li>
                    <li>Guardar preferencias de filtros</li>
                    <li>Personalizar contenido</li>
                  </ul>
                </div>

                <div className="cookie-type">
                  <h3>Cookies de Marketing</h3>
                  <p>
                    Se utilizan para mostrar publicidad relevante y medir la 
                    efectividad de nuestras campañas.
                  </p>
                  <ul>
                    <li>Mostrar productos relacionados</li>
                    <li>Medir efectividad de anuncios</li>
                    <li>Personalizar ofertas</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="cookies-section">
              <h2>Cookies de Terceros</h2>
              <p>
                También utilizamos servicios de terceros que pueden establecer cookies:
              </p>
              <ul>
                <li><strong>Google Analytics:</strong> Para analizar el tráfico del sitio</li>
                <li><strong>Facebook Pixel:</strong> Para publicidad dirigida</li>
                <li><strong>Stripe:</strong> Para procesamiento de pagos</li>
                <li><strong>Cloudflare:</strong> Para seguridad y rendimiento</li>
              </ul>
            </section>

            <section className="cookies-section">
              <h2>Gestión de Cookies</h2>
              <p>
                Puedes controlar y gestionar las cookies de varias maneras:
              </p>
              
              <div className="cookie-controls">
                <div className="control-option">
                  <h3>Configuración del Navegador</h3>
                  <p>
                    La mayoría de navegadores te permiten bloquear o eliminar cookies. 
                    Consulta la configuración de tu navegador para más información.
                  </p>
                </div>

                <div className="control-option">
                  <h3>Panel de Preferencias</h3>
                  <p>
                    Utiliza nuestro panel de preferencias para gestionar qué tipos 
                    de cookies aceptas.
                  </p>
                </div>

                <div className="control-option">
                  <h3>Herramientas de Terceros</h3>
                  <p>
                    Puedes utilizar herramientas como AdBlock o Privacy Badger para 
                    bloquear cookies de seguimiento.
                  </p>
                </div>
              </div>
            </section>

            <section className="cookies-section">
              <h2>Consecuencias de Deshabilitar Cookies</h2>
              <p>
                Si deshabilitas las cookies, algunas funciones del sitio pueden no 
                funcionar correctamente:
              </p>
              <ul>
                <li>No podrás mantener tu sesión iniciada</li>
                <li>El carrito de compras no funcionará</li>
                <li>No se recordarán tus preferencias</li>
                <li>Algunas páginas pueden no cargar correctamente</li>
              </ul>
            </section>

            <section className="cookies-section">
              <h2>Actualizaciones de esta Política</h2>
              <p>
                Podemos actualizar esta política de cookies ocasionalmente. 
                Te notificaremos sobre cambios significativos a través de nuestro sitio web.
              </p>
            </section>

            <section className="cookies-section">
              <h2>Contacto</h2>
              <p>
                Si tienes preguntas sobre nuestra política de cookies, contáctanos:
              </p>
              <ul>
                <li>Email: cookies@cherrycentral.com</li>
                <li>Teléfono: +52 (55) 1234-5678</li>
              </ul>
            </section>

            {/* Panel de control de cookies */}
            <div className="cookies-panel">
              <h2>Gestionar Preferencias de Cookies</h2>
              <div className="cookies-actions">
                <CherryButton 
                  variant="red" 
                  size="medium"
                  onClick={handleAcceptAll}
                >
                  Aceptar Todas
                </CherryButton>
                <CherryButton 
                  variant="outline" 
                  size="medium"
                  onClick={handleRejectAll}
                >
                  Rechazar Todas
                </CherryButton>
              </div>
            </div>
          </div>
        </div>
  </main>
    </>
);
};

export default CookiesPage; 