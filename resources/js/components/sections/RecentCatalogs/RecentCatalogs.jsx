import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getFeaturedCatalogImagePath } from '../../../utils/assetPaths';
import './RecentCatalogs.css';
import { getHeroIconPath } from '../../../utils/assetPaths';
import { publicCatalogService } from '../../../services/api';

const RecentCatalogs = () => {
  const [catalogs, setCatalogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar catálogos al montar el componente
  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    try {
      setLoading(true);
      const response = await publicCatalogService.getAll();
      
      if (response.data.success) {
        // Filtrar solo catálogos que tengan PDF
        const catalogsWithPdf = response.data.data.filter(catalog => 
          catalog.pdf_images && 
          catalog.pdf_images.length > 0
        );
        
        // Mapear a formato del componente
        const mappedCatalogs = catalogsWithPdf.map(catalog => ({
          id: catalog.id,
          title: catalog.name,
          subtitle: catalog.description || 'Descubre nuestra colección exclusiva',
          image: catalog.image || getFeaturedCatalogImagePath('image_example_1.png'),
          link: `/catalogo/${catalog.id}`,
          buttonText: 'Ver más',
          imageAlt: `Catálogo ${catalog.name} de Cherry Central`,
          hasPdf: true,
          pdfCount: catalog.pdf_images.length
        }));
        
        setCatalogs(mappedCatalogs);
      }
    } catch (error) {
      setError('Error al cargar los catálogos');
      if (window.showToast) {
        window.showToast('Error al cargar los catálogos', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

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
        ) : catalogs.length === 0 ? (
          <div className="catalogs-empty">
            <p>No hay catálogos disponibles en este momento</p>
          </div>
        ) : (
          <div className="catalogs-grid" role="list">
            {catalogs.map((catalog) => (
              <article key={catalog.id} className="catalog-card" role="listitem">
                <div className="home-catalog-content">
                  <div className="catalog-text">
                    <p className="catalog-subtitle">{catalog.subtitle}</p>
                    <h3 className="catalog-title">{catalog.title}</h3>
                    {catalog.hasPdf && (
                      <p className="catalog-pdf-info">
                        📄 {catalog.pdfCount} página{catalog.pdfCount !== 1 ? 's' : ''} PDF
                      </p>
                    )}
                  </div>
                  <div className='content-btn-explore'>
                    <Link
                      to={catalog.link}
                      className="btn-explore"
                      title="Ver productos de este catálogo"
                      aria-label="Ver productos de este catálogo"
                    >
                      Ver productos
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