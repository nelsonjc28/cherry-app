import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import CherryButton from '../components/CherryButton/CherryButton';
import { getIconPath } from '../utils/assetPaths';
import './AfiliatePage.css';

const AfiliatePage = () => {
  return (
    <>
      <Helmet>
        <title>Afíliate a Cherry Central - Programa de Afiliados</title>
        <meta name="description" content="Únete a nuestro programa de afiliados y comienza a ganar dinero vendiendo moda femenina. Acceso exclusivo a catálogos y comisiones atractivas." />
      </Helmet>

      <main className="afiliate-page">
        <div className="container">
          {/* Hero Section */}
          <section className="afiliate-hero">
            <div className="afiliate-hero-content">
              <h1 className="afiliate-title">
                Únete a nuestro programa de afiliados
              </h1>
              <p className="afiliate-subtitle">
                Gana dinero vendiendo moda femenina de calidad. Acceso exclusivo a catálogos y comisiones atractivas.
              </p>
              <div className="afiliate-actions">
                <CherryButton variant="red" size="large">
                  Afíliate aquí
                </CherryButton>
                <Link to="/contacto" className="afiliate-contact-link">
                  Contactar para más información
                </Link>
              </div>
            </div>
            <div className="afiliate-hero-image">
              <img 
                src={getIconPath('Users.svg')} 
                alt="Programa de afiliados Cherry Central"
                className="afiliate-icon"
              />
            </div>
          </section>

          {/* Benefits Section */}
          <section className="afiliate-benefits">
            <h2 className="section-title">Beneficios del programa</h2>
            <div className="benefits-grid">
              <div className="benefit-card">
                <div className="benefit-icon">
                  <img src={getIconPath('Award.svg')} alt="Comisiones" />
                </div>
                <h3>Comisiones atractivas</h3>
                <p>Gana hasta 15% de comisión por cada venta realizada</p>
              </div>
              
              <div className="benefit-card">
                <div className="benefit-icon">
                  <img src={getIconPath('File Alt.svg')} alt="Catálogos" />
                </div>
                <h3>Acceso a catálogos exclusivos</h3>
                <p>Catálogos actualizados con las últimas tendencias</p>
              </div>
              
              <div className="benefit-card">
                <div className="benefit-icon">
                  <img src={getIconPath('Bell.svg')} alt="Notificaciones" />
                </div>
                <h3>Notificaciones en tiempo real</h3>
                <p>Recibe alertas de nuevas colecciones y ofertas</p>
              </div>
              
              <div className="benefit-card">
                <div className="benefit-icon">
                  <img src={getIconPath('Shopping Cart.svg')} alt="Ventas" />
                </div>
                <h3>Panel de control</h3>
                <p>Seguimiento detallado de tus ventas y comisiones</p>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="afiliate-how-it-works">
            <h2 className="section-title">¿Cómo funciona?</h2>
            <div className="steps-grid">
              <div className="step-card">
                <div className="step-number">1</div>
                <h3>Afíliate aquí</h3>
                <p>Completa el formulario de registro como afiliado</p>
              </div>
              
              <div className="step-card">
                <div className="step-number">2</div>
                <h3>Recibe tu código</h3>
                <p>Obtén tu código único de afiliado</p>
              </div>
              
              <div className="step-card">
                <div className="step-number">3</div>
                <h3>Comparte productos</h3>
                <p>Comparte enlaces de productos con tu código</p>
              </div>
              
              <div className="step-card">
                <div className="step-number">4</div>
                <h3>Gana comisiones</h3>
                <p>Recibe comisiones por cada venta realizada</p>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="afiliate-cta">
            <div className="cta-content">
              <h2>¿Listo para comenzar?</h2>
              <p>Únete a miles de afiliados que ya están ganando dinero con Cherry Central</p>
              <CherryButton variant="red" size="large">
                Comenzar ahora
              </CherryButton>
            </div>
          </section>
        </div>
      </main>
    </>
  );
};

export default AfiliatePage; 