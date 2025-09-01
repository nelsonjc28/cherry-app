import React, { useState, useEffect } from 'react';
import BestSellerCard from './BestSellerCard';
import ProductSlider from '../../ProductSlider/ProductSlider';
import { getHeroIconPath } from '../../../utils/assetPaths';
import { useExternalApiContext } from '../../../contexts/ExternalApiContext';
import './BestSellers.css';

const BestSellers = ({ 
  products = [], 
  title = "Productos más vendidos", 
  description = "Perfectos para ocasiones especiales, con diseños que realzan la figura",
  useApi = true
}) => {
  const { getRandomProductsCached, loading } = useExternalApiContext();
  const [apiProducts, setApiProducts] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);

  // Cargar productos desde la API si useApi es true
  useEffect(() => {
    const loadRandomProducts = async () => {
      try {
        setLocalLoading(true);
        const productsData = await getRandomProductsCached(5);
        
        if (productsData && productsData.length > 0) {
          setApiProducts(productsData);
        } else {
          setApiProducts(products);
        }
      } catch (error) {
        setApiProducts(products);
      } finally {
        setLocalLoading(false);
      }
    };

    if (useApi) {
      loadRandomProducts();
    } else {
      setApiProducts(products);
      setLocalLoading(false);
    }
  }, []); // SOLO se ejecuta una vez al montar el componente

  // Handle favorite toggle callback
  const handleFavoriteToggle = (productId) => {
    // Here you would typically update your favorites state/API
  };

  const displayProducts = useApi ? apiProducts : products;

  if (localLoading) {
    return (
      <section className="best-sellers">
        <div className="container">
          <div className="best-sellers-header">
            <h2 className="best-sellers-title">{title}</h2>
            <p className="best-sellers-description">{description}</p>
          </div>
          <div className="loading-spinner">
            <p>Cargando productos...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="best-sellers">
      <div className="container">
        {/* Best Sellers Header */}
        <div className="best-sellers-header">
          <h2 className="best-sellers-title">{title}</h2>
          <p className="best-sellers-description">{description}</p>
        </div>
        
        {/* Desktop View - Asymmetric Grid */}
        <div className="desktop-view">
          <div className="best-sellers-grid">
            {/* First Row: Wide-Narrow layout (2fr 1fr) */}
            <div className="best-sellers-row first-row">
              {displayProducts[0] && (
                <BestSellerCard 
                  key={displayProducts[0].id}
                  id={displayProducts[0].id}
                  title={displayProducts[0].title}
                  image={displayProducts[0].image}
                  price={displayProducts[0].price}
                  rating={displayProducts[0].rating}
                  description={displayProducts[0].description}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              )}
              {displayProducts[1] && (
                <BestSellerCard 
                  key={displayProducts[1].id}
                  id={displayProducts[1].id}
                  title={displayProducts[1].title}
                  image={displayProducts[1].image}
                  price={displayProducts[1].price}
                  rating={displayProducts[1].rating}
                  description={displayProducts[1].description}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              )}
            </div>

            {/* Second Row: Narrow-Wide layout (1fr 2fr) */}
            <div className="best-sellers-row second-row">
              {displayProducts[2] && (
                <BestSellerCard 
                  key={displayProducts[2].id}
                  id={displayProducts[2].id}
                  title={displayProducts[2].title}
                  image={displayProducts[2].image}
                  price={displayProducts[2].price}
                  rating={displayProducts[2].rating}
                  description={displayProducts[2].description}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              )}
              {displayProducts[3] && (
                <BestSellerCard 
                  key={displayProducts[3].id}
                  id={displayProducts[3].id}
                  title={displayProducts[3].title}
                  image={displayProducts[3].image}
                  price={displayProducts[3].price}
                  rating={displayProducts[3].rating}
                  description={displayProducts[3].description}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              )}
            </div>
          </div>
        </div>

        {/* Mobile View - Slider */}
        <div className="mobile-view">
          <ProductSlider 
            products={displayProducts}
            onFavoriteToggle={handleFavoriteToggle}
            showTitle={false}
            showViewAll={false}
            slidesPerView={{ desktop: 4, tablet: 2, mobile: 1.2 }}
            showFavoriteButton={false}
          />
        </div>

        {/* View More Link */}
        <div className="best-sellers-footer">
          <a href="/productos/mas-vendidos" className="view-more-link">
            Ver Más
            <img 
              src={getHeroIconPath('Chevron Right.svg')} 
              alt="Ver más" 
              width="16" 
              height="16" 
            />
          </a>
        </div>
      </div>
    </section>
  );
};

export default BestSellers; 