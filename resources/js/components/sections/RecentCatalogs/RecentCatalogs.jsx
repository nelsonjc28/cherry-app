import React from 'react';
import { Link } from 'react-router-dom';
import { getFeaturedCatalogImagePath } from '../../../utils/assetPaths';
import './RecentCatalogs.css';
import { getHeroIconPath } from '../../../utils/assetPaths';
import useHomeCatalogs from '../../../hooks/useHomeCatalogs';

const RecentCatalogs = () => {
  const { catalogs, loading, error } = useHomeCatalogs();

  // Mapear catálogos al formato del componente y limitar a 4
  const mappedCatalogs = catalogs
    .slice(0, 4) // Limitar a solo 4 catálogos
    .map(catalog => ({
      id: catalog.id,
      title: catalog.name,
      subtitle: catalog.description || 'Descubre nuestra colección exclusiva',
      image: catalog.image || getFeaturedCatalogImagePath('image_example_1.png'),
      link: `/catalogo/${catalog.id}`,
      buttonText: 'Ver más',
      imageAlt: `Catálogo ${catalog.name} de Cherry Central`,
      hasPdf: catalog.hasPdf,
      pdfCount: catalog.pdfCount
    }));

  return (
    <section className="recent-catalogs" aria-labelledby="recent-catalogs-heading">
      <div className="container">
        {/* Section header */}
        <header className="section-header">
          <span className="section-tag">Destacados</span>
          <h2 id="recent-catalogs-heading" className="section-title">Descubre nuestros catálogos más recientes</h2>
          <p className="section-description">
            En nuestra tienda, siempre encontrarás lo último en moda. Te presentamos una selección exclusiva de productos que marcan
            tendencia. ¡No te quedes sin tu favorito!
          </p>
        </header>

        {/* Catalogs grid */}
        {loading ? (
          <div className="catalogs-loading">
            <div className="spinner"></div>
            <p>Cargando catálogos...</p>
          </div>
        ) : error ? (
          <div className="catalogs-error">
            <p>{error}</p>
          </div>
        ) : mappedCatalogs.length === 0 ? (
          <div className="catalogs-empty">
            <p>No hay catálogos disponibles en este momento</p>
          </div>
        ) : (
          <div className="catalogs-grid" role="list">
            {mappedCatalogs.map((catalog) => (
              <article key={catalog.id} className="catalog-card" role="listitem">
                <div className="home-catalog-content">
                  <div className="catalog-text">
                    <p className="catalog-subtitle">{catalog.subtitle}</p>
                    <h3 className="catalog-title">{catalog.title}</h3>
                  </div>
                  <div className='content-btn-explore'>
                    <a
                      className="btn-explore"
                      title="Únete a nuestro programa de afiliados y comienza tu negocio"
                      aria-label="Afiliate a Cherry Central y comienza tu negocio"
                      href="/afiliate"
                      data-discover="true"
                    >
                      Ver más
                      <img
                        alt="Flecha hacia la derecha"
                        width="20"
                        height="20"
                        src="./icons/hero/Chevron Right.svg"
                      />
                    </a>
                  </div>
                </div>
                <div className="home-catalog-image">
                  <Link to={catalog.link} className="catalog-image-link">
                    <img
                      src={catalog.image}
                      alt={catalog.imageAlt}
                      loading="lazy"
                      width="278"
                      height="240"
                    />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* View more catalogs link */}
        <footer className="view-more-section">
          <Link
            to="/catalogos"
            className="view-more-link"
            aria-label="Ver todos los catálogos de moda femenina disponibles"
          >
            Ver todos los catálogos
            <img
              src={getHeroIconPath('Chevron Right.svg')}
              alt="Ver más"
              width="16"
              height="16"
            />
          </Link>
        </footer>
      </div>
    </section>
  );
};

export default RecentCatalogs; 