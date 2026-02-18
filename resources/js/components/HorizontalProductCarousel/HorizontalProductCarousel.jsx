import { Link } from 'react-router-dom';
import CatalogProductCard from '../CatalogProductCard/CatalogProductCard';
import ProductCard from '../ProductCard/ProductCard';
import './HorizontalProductCarousel.css';

const HorizontalProductCarousel = ({
  title,
  products = [],
  viewAllLink,
  viewAllText = 'Ver Más',
  showTitle = true,
  showViewAll = false,
  onFavoriteToggle,
  showFavoriteButton = false,
  variant = 'default',
  useCatalogCard = false // Usar CatalogProductCard si es true, ProductCard si es false
}) => {
  if (!products || products.length === 0) {
    return null;
  }

  const ProductCardComponent = useCatalogCard ? CatalogProductCard : ProductCard;

  return (
    <div className="horizontal-product-carousel">
      {(showTitle || showViewAll) && (
        <div className="horizontal-carousel-header">
          {showTitle && title && (
            <h2 className="horizontal-carousel-title">{title}</h2>
          )}
          {showViewAll && viewAllLink && (
            <Link to={viewAllLink} className="horizontal-carousel-view-all">
              {viewAllText}
              <span className="arrow">
                <svg width="8" height="12" viewBox="0 0 8 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.12484 0.349243L0.604004 0.844035C0.499837 0.974243 0.499837 1.18258 0.604004 1.28674L5.31755 6.00028L0.604004 10.7399C0.499837 10.844 0.499837 11.0524 0.604004 11.1826L1.12484 11.6774C1.25505 11.8076 1.43734 11.8076 1.56755 11.6774L7.0363 6.23466C7.14046 6.10445 7.14046 5.92216 7.0363 5.79195L1.56755 0.349243C1.43734 0.219035 1.25505 0.219035 1.12484 0.349243Z" fill="#EA2630" />
                </svg>
              </span>
            </Link>
          )}
        </div>
      )}

      <div className="horizontal-carousel-container">
        <div className="horizontal-carousel-scroll">
          {products.map((product) => (
            <div key={product.id || product.id_articulo} className="horizontal-carousel-item">
              {useCatalogCard ? (
                <CatalogProductCard 
                  product={product} 
                  onFavoriteToggle={onFavoriteToggle}
                />
              ) : (
                <ProductCard 
                  product={product} 
                  showFavoriteButton={showFavoriteButton}
                  variant={variant}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HorizontalProductCarousel;
