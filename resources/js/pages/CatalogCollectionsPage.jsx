import { Link } from 'react-router-dom';
import './CatalogCollectionsPage.css';
import CustomButton from '../components/CustomButton';
import { getIconPath } from '../utils/assetPaths';
import { mockCatalogs } from '../api/mockCatalogs';

const CatalogCollectionsPage = () => {

  const isMobile = window.innerWidth < 768;

  return (
    <div className="catalog-collections-page">
      <div className="container">
        {/* Header */}
        <header className="catalog-collections-page__header">
          <h1 className="catalog-collections-page__title">Catálogos</h1>
          <CustomButton
            variant="filled"
            size={isMobile ? 'small' : 'medium'}
            iconLeft={<img src={getIconPath('Whatsapp.svg')} alt="Compartir clientes" style={{ width: 16, height: 16 }} />}>
            <span className="catalog-collections-page__whatsapp-text">Compartir a clientes</span>
          </CustomButton>
        </header>

        {/* Grid de catálogos */}
        <div className="catalog-collections-page__grid">
          {mockCatalogs.map((catalog) => (
            <div className="catalog-collections-page__card" key={catalog.id}>
              <Link to="/catalogo" className="catalog-collections-page__card-image-link">
                <div className="catalog-collections-page__card-image-wrapper">
                  <img src={catalog.cover} alt={catalog.name} className="catalog-collections-page__card-image" />
                </div>
              </Link>
              <div className="catalog-collections-page__card-content">
                <Link to="/catalogo" className="catalog-collections-page__card-title-link">
                  <h2 className="catalog-collections-page__card-title">{catalog.name}</h2>
                </Link>
                <p className="catalog-collections-page__card-description">{catalog.description}</p>
                <Link
                  to={`/catalogo-pdf?id=${catalog.id}`}
                  className="catalog-collections-page__pdf-link"
                >
                  <img src={getIconPath('File Alt.svg')} alt="Ver PDF" style={{ width: 18, height: 18, verticalAlign: 'middle' }} />
                  <span>Ver catálogo PDF</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CatalogCollectionsPage; 