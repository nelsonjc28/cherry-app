import React, { useState, useEffect } from 'react';
import BestSellerCard from './BestSellerCard';
import ProductSlider from '../../ProductSlider/ProductSlider';
import { getHeroIconPath } from '../../../utils/assetPaths';
import { getRandomProducts } from '../../../api/cherryApi';
import './BestSellers.css';

const BestSellers = ({
  products = [],
  title = "Productos más vendidos",
  description = "Perfectos para ocasiones especiales, con diseños que realzan la figura",
  useApi = true
}) => {
  const [apiProducts, setApiProducts] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);

  // Cargar productos desde la API si useApi es true
  useEffect(() => {
    const loadRandomProducts = async () => {
      try {
        setLocalLoading(true);
        // Usar la nueva función que incluye ofertas personalizadas
        const productsData = await getRandomProducts(6);

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
      setApiProducts(products.slice(0, 6));
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
      <div className="container best-sellers-container">
        <h2 className="best-sellers-title">{title}</h2>
        <p className="best-sellers-description">{description}</p>

        {/* Desktop Grid View */}
        <div className="best-sellers-grid desktop-view">
          {displayProducts.slice(0, 6).map((product) => (
            <BestSellerCard
              key={product.id}
              id={product.id}
              title={product.title}
              image={product.image}
              price={product.price}
              originalPrice={product.originalPrice}
              discount={product.discount}
              userOffer={product.userOffer}
              hasUserOffer={product.hasUserOffer}
              rating={product.rating}
              totalRatings={product.totalRatings}
              description={product.description}
              onFavoriteToggle={handleFavoriteToggle}
            />
          ))}
        </div>

        {/* Mobile View - Slider */}
        <div className="mobile-view">
          <ProductSlider
            products={displayProducts.slice(0, 4)}
            onFavoriteToggle={handleFavoriteToggle}
            showTitle={false}
            showViewAll={false}
            slidesPerView={{ desktop: 4, tablet: 2, mobile: 1.2 }}
            showFavoriteButton={false}
            renderCard={(product) => (
              <BestSellerCard
                key={product.id}
                id={product.id}
                title={product.title}
                image={product.image}
                price={product.price}
                originalPrice={product.originalPrice}
                discount={product.discount}
                userOffer={product.userOffer}
                hasUserOffer={product.hasUserOffer}
                rating={product.rating}
                description={product.description}
                onFavoriteToggle={handleFavoriteToggle}
              />
            )}
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
