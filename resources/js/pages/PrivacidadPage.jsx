import React from 'react';
import { Helmet } from 'react-helmet-async';
import './PrivacidadPage.css';

const PrivacidadPage = () => {
  return (
    <>
      <Helmet>
        <title>Política de Privacidad - Cherry Central</title>
        <meta name="description" content="Política de privacidad de Cherry Central. Conoce cómo protegemos y utilizamos tu información personal." />
      </Helmet>

      <main className="privacidad-page">
        <div className="container">
          <div className="privacidad-content">
            <h1>Política de Privacidad</h1>
            <p className="privacidad-date">Última actualización: Enero 2025</p>

            <section className="privacidad-section">
              <h2>1. Información que Recopilamos</h2>
              <p>Recopilamos la siguiente información:</p>
              <ul>
                <li><strong>Información personal:</strong> Nombre, email, teléfono, dirección</li>
                <li><strong>Información de la cuenta:</strong> Credenciales de acceso, preferencias</li>
                <li><strong>Información de uso:</strong> Páginas visitadas, productos vistos</li>
                <li><strong>Información técnica:</strong> IP, navegador, dispositivo</li>
              </ul>
            </section>

            <section className="privacidad-section">
              <h2>2. Cómo Utilizamos tu Información</h2>
              <p>Utilizamos tu información para:</p>
              <ul>
                <li>Procesar y gestionar tus pedidos</li>
                <li>Proporcionar atención al cliente</li>
                <li>Enviar comunicaciones sobre productos y servicios</li>
                <li>Mejorar nuestros servicios y experiencia del usuario</li>
                <li>Cumplir con obligaciones legales</li>
              </ul>
            </section>

            <section className="privacidad-section">
              <h2>3. Compartir Información</h2>
              <p>
                No vendemos, alquilamos o compartimos tu información personal con terceros, 
                excepto en las siguientes circunstancias:
              </p>
              <ul>
                <li>Con tu consentimiento explícito</li>
                <li>Para cumplir con obligaciones legales</li>
                <li>Con proveedores de servicios que nos ayudan a operar</li>
                <li>Para proteger nuestros derechos y seguridad</li>
              </ul>
            </section>

            <section className="privacidad-section">
              <h2>4. Cookies y Tecnologías Similares</h2>
              <p>
                Utilizamos cookies y tecnologías similares para:
              </p>
              <ul>
                <li>Recordar tus preferencias</li>
                <li>Analizar el uso del sitio</li>
                <li>Personalizar tu experiencia</li>
                <li>Mejorar nuestros servicios</li>
              </ul>
              <p>
                Puedes controlar el uso de cookies a través de la configuración de tu navegador.
              </p>
            </section>

            <section className="privacidad-section">
              <h2>5. Seguridad de la Información</h2>
              <p>
                Implementamos medidas de seguridad técnicas y organizativas para proteger 
                tu información personal contra acceso no autorizado, alteración, divulgación 
                o destrucción.
              </p>
            </section>

            <section className="privacidad-section">
              <h2>6. Retención de Datos</h2>
              <p>
                Conservamos tu información personal solo durante el tiempo necesario 
                para cumplir con los propósitos para los que fue recopilada, o según 
                lo requiera la ley.
              </p>
            </section>

            <section className="privacidad-section">
              <h2>7. Tus Derechos</h2>
              <p>Tienes derecho a:</p>
              <ul>
                <li>Acceder a tu información personal</li>
                <li>Corregir información inexacta</li>
                <li>Solicitar la eliminación de tus datos</li>
                <li>Oponerte al procesamiento de tus datos</li>
                <li>Portabilidad de tus datos</li>
                <li>Retirar tu consentimiento en cualquier momento</li>
              </ul>
            </section>

            <section className="privacidad-section">
              <h2>8. Menores de Edad</h2>
              <p>
                Nuestro servicio no está dirigido a menores de 18 años. No recopilamos 
                intencionalmente información personal de menores de edad. Si eres padre 
                o tutor y crees que tu hijo nos ha proporcionado información personal, 
                contáctanos inmediatamente.
              </p>
            </section>

            <section className="privacidad-section">
              <h2>9. Enlaces a Terceros</h2>
              <p>
                Nuestro sitio puede contener enlaces a sitios web de terceros. 
                No somos responsables de las prácticas de privacidad de estos sitios. 
                Te recomendamos revisar sus políticas de privacidad.
              </p>
            </section>

            <section className="privacidad-section">
              <h2>10. Cambios a esta Política</h2>
              <p>
                Podemos actualizar esta política de privacidad ocasionalmente. 
                Te notificaremos sobre cambios significativos por email o a través 
                de nuestro sitio web.
              </p>
            </section>

            <section className="privacidad-section">
              <h2>11. Contacto</h2>
              <p>
                Si tienes preguntas sobre esta política de privacidad, contáctanos:
              </p>
              <ul>
                <li>Email: privacidad@cherrycentral.com</li>
                <li>Teléfono: +52 (55) 1234-5678</li>
                <li>Dirección: Ciudad de México, México</li>
              </ul>
            </section>

            <div className="privacidad-footer">
              <p>
                Al utilizar nuestro sitio, aceptas las prácticas descritas en esta 
                política de privacidad.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default PrivacidadPage; 