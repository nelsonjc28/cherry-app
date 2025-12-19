import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './CatalogCollectionsPage.css';
import { getIconPath } from '../utils/assetPaths';
import { publicCatalogService } from '../services/api';

const CatalogCollectionsPage = () => {
  const [catalogs, setCatalogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isMobile = window.innerWidth < 768;

  // Cargar catálogos al montar el componente
  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    try {
      setLoading(true);
      const response = await publicCatalogService.getAll();
      
      if (response.data.success) {
        // Mostrar todos los catálogos públicos (ordenados desde el backend)
        const catalogsData = response.data.catalogs || response.data.data || [];
        setCatalogs(catalogsData);
      } else {
        setCatalogs([]);
      }
    } catch (error) {
      setError('Error al cargar los catálogos');
      setCatalogs([]);
      if (window.showToast) {
        window.showToast('Error al cargar los catálogos', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="catalog-collections-page">
      <div className="container">
        {/* Header */}
        <header className="catalog-collections-page__header">
          <h1 className="catalog-collections-page__title">Catálogos</h1>
        </header>

        {/* Grid de catálogos */}
        {loading ? (
          <div className="catalog-collections-page__loading">
            <div className="spinner"></div>
            <p>Cargando catálogos...</p>
          </div>
        ) : error ? (
          <div className="catalog-collections-page__error">
            <p>{error}</p>
            <button onClick={fetchCatalogs} className="retry-button">
              Reintentar
            </button>
          </div>
        ) : catalogs.length === 0 ? (
          <div className="catalog-collections-page__empty">
            <p>No hay catálogos disponibles en este momento</p>
          </div>
        ) : (
          <div className="catalog-collections-page__grid">
            {catalogs.map((catalog) => (
              <div className="catalog-collections-page__card" key={catalog.id}>
                <Link to={`/catalogo/${catalog.id}`} className="catalog-collections-page__card-image-link">
                  <div className="catalog-collections-page__card-image-wrapper">
                    <img 
                      src={catalog.image || '/images/placeholder-catalog.png'} 
                      alt={catalog.name} 
                      className="catalog-collections-page__card-image" 
                    />
                  </div>
                </Link>
                <div className="catalog-collections-page__card-content">
                  <Link to={`/catalogo/${catalog.id}`} className="catalog-collections-page__card-title-link">
                    <h2 className="catalog-collections-page__card-title">{catalog.name}</h2>
                  </Link>
                  <p className="catalog-collections-page__card-description">
                    {catalog.description || 'Descubre nuestra colección exclusiva'}
                  </p>

                  {catalog.is_active && catalog.pdfs && catalog.pdfs.length > 0 && (
                    <Link
                      to={`/catalogo-pdf?id=${catalog.id}`}
                      className="catalog-collections-page__pdf-link"
                    >
                      <img src={getIconPath('File Alt.svg')} alt="Ver PDF" style={{ width: 18, height: 18, verticalAlign: 'middle' }} />
                      <span>Ver catálogo PDF</span>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogCollectionsPage; 
