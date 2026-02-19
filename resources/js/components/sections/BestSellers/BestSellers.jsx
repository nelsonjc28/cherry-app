import React, { useState, useEffect, useRef } from 'react';
import BestSellerCard from './BestSellerCard';
import ProductSlider from '../../ProductSlider/ProductSlider';
import { getHeroIconPath } from '../../../utils/assetPaths';
import { getTopSellingProducts } from '../../../api/cherryApi';
import { applyUserOffersToProducts } from '../../../api/userOffers';
import useUserStore from '../../../store/userStore';
import './BestSellers.css';

const BestSellers = ({
  title = "Productos más vendidos",
  description = "Los 6 productos favoritos de nuestros clientes este mes",
}) => {
  const { user } = useUserStore();
  const [displayProducts, setDisplayProducts] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const loadProducts = async () => {
      try {
        setLocalLoading(true);
        const products = await getTopSellingProducts(6);

        if (products && products.length > 0) {
          const finalProducts = user
            ? await applyUserOffersToProducts(products)
            : products;
          setDisplayProducts(finalProducts.slice(0, 6));
        } else {
          setDisplayProducts([]);
        }
      } catch (error) {
        setDisplayProducts([]);
      } finally {
        setLocalLoading(false);
      }
    };

    loadProducts();
  }, []);

  const handleFavoriteToggle = (productId) => {};

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

        {/* Desktop Grid View - 3 columns x 2 rows */}
        <div className="best-sellers-grid desktop-view">
          {displayProducts.slice(0, 6).map((product) => (
            <div key={product.id} className="best-seller-card-wrapper">
              <BestSellerCard
                id={product.id}
                title={product.title || product.nombre}
                image={product.image || `https://cherry-fotos.s3.amazonaws.com/shopify/${product.id}/${product.id}_1.jpg`}
                price={product.price || product.precio}
                originalPrice={product.originalPrice || product.precio_original}
                discount={product.discount || product.desc_promo}
                userOffer={product.userOffer}
                hasUserOffer={product.hasUserOffer}
                rating={product.rating || 0}
                totalRatings={product.totalRatings || 0}
                description={product.description || product.descripcion || ''}
                stock={product.stock ?? product.inventario ?? 0}
                isNew={product.isNew || false}
                onFavoriteToggle={handleFavoriteToggle}
                product={product}
                stock_received_count={product.stock_received_count || 0}
                stockReceivedCount={product.stockReceivedCount || 0}
              />
            </div>
          ))}
        </div>

        {/* Mobile View - Slider */}
        <div className="mobile-view">
          <ProductSlider
            products={displayProducts.slice(0, 6)}
            onFavoriteToggle={handleFavoriteToggle}
            showTitle={false}
            showViewAll={false}
            slidesPerView={{ desktop: 3, tablet: 2, mobile: 1.2 }}
            showFavoriteButton={false}
            renderCard={(product) => (
              <div key={product.id} className="best-seller-card-wrapper">
                <BestSellerCard
                  id={product.id}
                  title={product.title || product.nombre}
                  image={product.image || `https://cherry-fotos.s3.amazonaws.com/shopify/${product.id}/${product.id}_1.jpg`}
                  price={product.price || product.precio}
                  originalPrice={product.originalPrice || product.precio_original}
                  discount={product.discount || product.desc_promo}
                  userOffer={product.userOffer}
                  hasUserOffer={product.hasUserOffer}
                  rating={product.rating || 0}
                  totalRatings={product.totalRatings || 0}
                  description={product.description || product.descripcion || ''}
                  stock={product.stock ?? product.inventario ?? 0}
                  isNew={product.isNew || false}
                  onFavoriteToggle={handleFavoriteToggle}
                  product={product}
                  stock_received_count={product.stock_received_count || 0}
                  stockReceivedCount={product.stockReceivedCount || 0}
                />
              </div>
            )}
          />
        </div>

        {/* View More Link */}
        <div className="best-sellers-footer">
          <a href="/destacados" className="view-more-link">
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
