import React from 'react';
import { Helmet } from 'react-helmet-async';
import './TerminosPage.css';

const TerminosPage = () => {
  return (
    <>
      <Helmet>
        <title>Términos y Condiciones - Cherry Central</title>
        <meta name="description" content="Términos y condiciones de uso de Cherry Central. Conoce nuestros términos legales y políticas de uso." />
      </Helmet>

      <main className="terminos-page">
        <div className="container">
          <div className="terminos-content">
            <h1>Términos y Condiciones</h1>
            <p className="terminos-date">Última actualización: Enero 2025</p>

            <section className="terminos-section">
              <h2>1. Aceptación de los Términos</h2>
              <p>
                Al acceder y utilizar este sitio web, usted acepta estar sujeto a estos términos y condiciones de uso. 
                Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestro servicio.
              </p>
            </section>

            <section className="terminos-section">
              <h2>2. Descripción del Servicio</h2>
              <p>
                Cherry Central es una plataforma de comercio electrónico que ofrece productos de moda femenina. 
                Nuestro servicio incluye la visualización de catálogos, información de productos y facilitación 
                de transacciones comerciales.
              </p>
            </section>

            <section className="terminos-section">
              <h2>3. Uso del Sitio</h2>
              <p>Usted se compromete a:</p>
              <ul>
                <li>Utilizar el sitio solo para fines legales y apropiados</li>
                <li>No intentar acceder a áreas restringidas del sitio</li>
                <li>No interferir con el funcionamiento del sitio</li>
                <li>No transmitir virus o código malicioso</li>
                <li>Respetar los derechos de propiedad intelectual</li>
              </ul>
            </section>

            <section className="terminos-section">
              <h2>4. Información del Usuario</h2>
              <p>
                Al registrarse en nuestro sitio, usted proporciona información personal que será tratada 
                de acuerdo con nuestra Política de Privacidad. Usted es responsable de mantener la 
                confidencialidad de su cuenta y contraseña.
              </p>
            </section>

            <section className="terminos-section">
              <h2>5. Productos y Precios</h2>
              <p>
                Los precios mostrados están sujetos a cambios sin previo aviso. Nos esforzamos por 
                mantener la información de productos actualizada, pero no garantizamos la disponibilidad 
                de todos los productos mostrados.
              </p>
            </section>

            <section className="terminos-section">
              <h2>6. Propiedad Intelectual</h2>
              <p>
                Todo el contenido de este sitio web, incluyendo textos, imágenes, logos y diseño, 
                está protegido por derechos de autor y otras leyes de propiedad intelectual. 
                No está permitida la reproducción sin autorización previa.
              </p>
            </section>

            <section className="terminos-section">
              <h2>7. Limitación de Responsabilidad</h2>
              <p>
                Cherry Central no será responsable por daños indirectos, incidentales o consecuentes 
                que puedan resultar del uso de nuestro servicio.
              </p>
            </section>

            <section className="terminos-section">
              <h2>8. Modificaciones</h2>
              <p>
                Nos reservamos el derecho de modificar estos términos en cualquier momento. 
                Los cambios entrarán en vigor inmediatamente después de su publicación en el sitio.
              </p>
            </section>

            <section className="terminos-section">
              <h2>9. Ley Aplicable</h2>
              <p>
                Estos términos se rigen por las leyes de México. Cualquier disputa será resuelta 
                en los tribunales competentes de la Ciudad de México.
              </p>
            </section>

            <section className="terminos-section">
              <h2>10. Contacto</h2>
              <p>
                Si tiene preguntas sobre estos términos, puede contactarnos a través de:
              </p>
              <ul>
                <li>Email: legal@cherrycentral.com</li>
                <li>Teléfono: +52 (55) 1234-5678</li>
                <li>Dirección: Ciudad de México, México</li>
              </ul>
            </section>

            <div className="terminos-footer">
              <p>
                Al continuar utilizando nuestro sitio, usted confirma que ha leído, 
                entendido y aceptado estos términos y condiciones.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default TerminosPage; 