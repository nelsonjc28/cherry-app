import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import CherryButton from '../components/CherryButton/CherryButton';
import { getIconPath } from '../utils/assetPaths';
import { publicAffiliateContentService } from '../services/api';
import './AfiliatePage.css';

const imgUrl = (path) => (path ? `/${path}` : null);

const AfiliatePage = () => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchContent = async () => {
      try {
        const res = await publicAffiliateContentService.getAll();
        if (active && res.data?.success) setContent(res.data.data);
      } catch (err) {
        // Vista pública: fallback silencioso a contenido estático
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchContent();
    return () => { active = false; };
  }, []);

  const banner = content?.banner;
  const season = content?.season;
  const promoBanners = content?.promo_banners || [];
  const faqs = content?.faqs || [];

  return (
    <>
      <Helmet>
        <title>Afíliate a Cherry Central - Programa de Afiliados</title>
        <meta name="description" content="Únete a nuestro programa de afiliados y comienza a ganar dinero vendiendo moda femenina. Acceso exclusivo a catálogos y comisiones atractivas." />
      </Helmet>

      <main className="afiliate-page">
        <div className="container">
          {/* ===== Banner superior dinámico ===== */}
          {!loading && banner ? (
            <section className="afiliate-hero">
              <div className="afiliate-hero-content">
                <h1 className="afiliate-title">{banner.title}</h1>
                <p className="afiliate-subtitle">{banner.subtitle}</p>
                <div className="afiliate-actions">
                  <a href={banner.button_url} className="btn-afiliate-action">
                    <CherryButton variant="red" size="large">{banner.button_text}</CherryButton>
                  </a>
                  <Link to="/contacto" className="afiliate-contact-link">
                    Contactar para más información
                  </Link>
                </div>
              </div>
              <div className="afiliate-hero-image">
                <img
                  src={banner.image_path ? imgUrl(banner.image_path) : getIconPath('Users.svg')}
                  alt={banner.title}
                  className="afiliate-icon"
                />
              </div>
            </section>
          ) : (
            <section className="afiliate-hero">
              <div className="afiliate-hero-content">
                <h1 className="afiliate-title">Únete a nuestro programa de afiliados</h1>
                <p className="afiliate-subtitle">
                  Gana dinero vendiendo moda femenina de calidad. Acceso exclusivo a catálogos y comisiones atractivas.
                </p>
                <div className="afiliate-actions">
                  <CherryButton variant="red" size="large">Afíliate aquí</CherryButton>
                  <Link to="/contacto" className="afiliate-contact-link">Contactar para más información</Link>
                </div>
              </div>
              <div className="afiliate-hero-image">
                <img src={getIconPath('Users.svg')} alt="Programa de afiliados Cherry Central" className="afiliate-icon" />
              </div>
            </section>
          )}

          {/* ===== Sección "Conoce la nueva Temporada" dinámica ===== */}
          {!loading && season && (
            <section className="afiliate-season">
              <h2 className="section-title">{season.title}</h2>
              {season.catalog && (
                <p className="afiliate-season-catalog">
                  Descubre el catálogo{' '}
                  <Link to={`/catalogos/${season.catalog.id}`}>{season.catalog.name}</Link>
                </p>
              )}
              {season.active_boxes && season.active_boxes.length > 0 && (
                <div className="benefits-grid">
                  {season.active_boxes.map((box) => (
                    <div key={box.id} className="benefit-card">
                      {box.image_path && (
                        <div className="benefit-icon">
                          <img src={imgUrl(box.image_path)} alt={box.title} />
                        </div>
                      )}
                      <h3>{box.title}</h3>
                      <p>{box.description}</p>
                      {box.button_text && box.button_url && (
                        <a href={box.button_url} className="afiliate-box-link">{box.button_text} →</a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ===== Banners promocionales dinámicos ===== */}
          {!loading && promoBanners.length > 0 && (
            <section className="afiliate-promos">
              {promoBanners.map((promo) => (
                <div key={promo.id} className="afiliate-promo-card">
                  {promo.image_path && (
                    <img src={imgUrl(promo.image_path)} alt={promo.title} className="afiliate-promo-image" />
                  )}
                  <div className="afiliate-promo-body">
                    <h3>{promo.title}</h3>
                    <p>{promo.description}</p>
                    {promo.button_text && promo.button_url && (
                      <a href={promo.button_url} className="afiliate-promo-link">{promo.button_text} →</a>
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* ===== Beneficios (contenido fijo) ===== */}
          {!season && (
            <section className="afiliate-benefits">
              <h2 className="section-title">Beneficios del programa</h2>
              <div className="benefits-grid">
                <div className="benefit-card">
                  <div className="benefit-icon"><img src={getIconPath('Award.svg')} alt="Comisiones" /></div>
                  <h3>Comisiones atractivas</h3>
                  <p>Gana hasta 15% de comisión por cada venta realizada</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon"><img src={getIconPath('File Alt.svg')} alt="Catálogos" /></div>
                  <h3>Acceso a catálogos exclusivos</h3>
                  <p>Catálogos actualizados con las últimas tendencias</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon"><img src={getIconPath('Bell.svg')} alt="Notificaciones" /></div>
                  <h3>Notificaciones en tiempo real</h3>
                  <p>Recibe alertas de nuevas colecciones y ofertas</p>
                </div>
                <div className="benefit-card">
                  <div className="benefit-icon"><img src={getIconPath('Shopping Cart.svg')} alt="Ventas" /></div>
                  <h3>Panel de control</h3>
                  <p>Seguimiento detallado de tus ventas y comisiones</p>
                </div>
              </div>
            </section>
          )}

          {/* ===== Cómo funciona (contenido fijo) ===== */}
          <section className="afiliate-how-it-works">
            <h2 className="section-title">¿Cómo funciona?</h2>
            <div className="steps-grid">
              <div className="step-card"><div className="step-number">1</div><h3>Afíliate aquí</h3><p>Completa el formulario de registro como afiliado</p></div>
              <div className="step-card"><div className="step-number">2</div><h3>Recibe tu código</h3><p>Obtén tu código único de afiliado</p></div>
              <div className="step-card"><div className="step-number">3</div><h3>Comparte productos</h3><p>Comparte enlaces de productos con tu código</p></div>
              <div className="step-card"><div className="step-number">4</div><h3>Gana comisiones</h3><p>Recibe comisiones por cada venta realizada</p></div>
            </div>
          </section>

          {/* ===== CTA (contenido fijo) ===== */}
          <section className="afiliate-cta">
            <div className="cta-content">
              <h2>¿Listo para comenzar?</h2>
              <p>Únete a miles de afiliados que ya están ganando dinero con Cherry Central</p>
              <CherryButton variant="red" size="large">Comenzar ahora</CherryButton>
            </div>
          </section>

          {/* ===== Preguntas Frecuentes dinámicas ===== */}
          {!loading && faqs.length > 0 && (
            <section className="afiliate-faq">
              <h2 className="section-title">Preguntas Frecuentes</h2>
              <div className="afiliate-faq-list">
                {faqs.map((faq) => (
                  <details key={faq.id} className="afiliate-faq-item">
                    <summary>{faq.question}</summary>
                    <p>{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
};

export default AfiliatePage;