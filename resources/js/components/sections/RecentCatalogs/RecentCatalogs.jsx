import { Link } from 'react-router-dom';
import { getFeaturedCatalogImagePath } from '../../../utils/assetPaths';
import './RecentCatalogs.css';
import { getHeroIconPath } from '../../../utils/assetPaths';

const RecentCatalogs = () => {
  // Recent catalogs data with featured images
  const catalogs = [
    {
      id: 1,
      title: 'Lo mejor para tu estilo personal',
      subtitle: 'Cada pieza ha sido elegida para resaltar tu belleza',
      image: getFeaturedCatalogImagePath('image_example_1.png'),
      link: '/catalogo/estilo',
      buttonText: 'Ver más',
      imageAlt: 'Mujer elegante modelando vestido rosa de la colección Cherry Central, perfecto para resaltar tu estilo personal'
    },
    {
      id: 2,
      title: 'Explora nuestra colección',
      subtitle: 'Encuentra el vestido perfecto para cualquier ocasión.',
      image: getFeaturedCatalogImagePath('image_example_2.png'),
      link: '/catalogo/coleccion',
      buttonText: 'Ver más',
      imageAlt: 'Modelo femenina luciendo outfit completo de la nueva colección Cherry Central para ocasiones especiales'
    }
  ];

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
        <div className="catalogs-grid" role="list">
          {catalogs.map((catalog) => (
            <article key={catalog.id} className="catalog-card" role="listitem">
              <div className="home-catalog-content">
                <div className="catalog-text">
                  <p className="catalog-subtitle">{catalog.subtitle}</p>
                  <h3 className="catalog-title">{catalog.title}</h3>
                </div>
                <div className='content-btn-explore'>
                  <Link
                    to="/afiliate"
                    className="btn-explore"
                    title="Únete a nuestro programa de afiliados y comienza tu negocio"
                    aria-label="Afiliate a Cherry Central y comienza tu negocio"
                  >
                    Ver más
                    <img
                      src={getHeroIconPath('Chevron Right.svg')}
                      alt="Flecha hacia la derecha"
                      width="20"
                      height="20"
                    />
                  </Link>
                </div>
              </div>
              <div className="home-catalog-image">
                <img
                  src={catalog.image}
                  alt={catalog.imageAlt}
                  loading="lazy"
                  width="278"
                  height="240"
                />
              </div>
            </article>
          ))}
        </div>

        {/* View more catalogs link */}
        <footer className="view-more-section">
          <Link
            to="/catalogo"
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