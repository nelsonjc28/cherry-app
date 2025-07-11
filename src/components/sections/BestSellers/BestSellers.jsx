import React from 'react';
import BestSellerCard from './BestSellerCard';
import ProductSlider from '../../ProductSlider/ProductSlider';
import { getHeroIconPath } from '../../../utils/assetPaths';
import './BestSellers.css';

const BestSellers = ({ products = [], title = "Productos más vendidos", description = "Perfectos para ocasiones especiales, con diseños que realzan la figura" }) => {
  // Handle favorite toggle callback
  const handleFavoriteToggle = (productId, isFavorited) => {
    console.log(`Product ${productId} ${isFavorited ? 'added to' : 'removed from'} favorites`);
    // Here you would typically update your favorites state/API
  };

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
              {products[0] && (
                <BestSellerCard 
                  key={products[0].id}
                  id={products[0].id}
                  title={products[0].title}
                  image={products[0].image}
                  price={products[0].price}
                  rating={products[0].rating}
                  description={products[0].description}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              )}
              {products[1] && (
                <BestSellerCard 
                  key={products[1].id}
                  id={products[1].id}
                  title={products[1].title}
                  image={products[1].image}
                  price={products[1].price}
                  rating={products[1].rating}
                  description={products[1].description}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              )}
            </div>

            {/* Second Row: Narrow-Wide layout (1fr 2fr) */}
            <div className="best-sellers-row second-row">
              {products[2] && (
                <BestSellerCard 
                  key={products[2].id}
                  id={products[2].id}
                  title={products[2].title}
                  image={products[2].image}
                  price={products[2].price}
                  rating={products[2].rating}
                  description={products[2].description}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              )}
              {products[3] && (
                <BestSellerCard 
                  key={products[3].id}
                  id={products[3].id}
                  title={products[3].title}
                  image={products[3].image}
                  price={products[3].price}
                  rating={products[3].rating}
                  description={products[3].description}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              )}
            </div>
          </div>
        </div>

        {/* Mobile View - Slider */}
        <div className="mobile-view">
          <ProductSlider 
            products={products}
            onFavoriteToggle={handleFavoriteToggle}
            showTitle={false}
            showViewAll={false}
            slidesPerView={{ desktop: 4, tablet: 2, mobile: 1.2 }}
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