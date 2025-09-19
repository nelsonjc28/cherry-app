import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, A11y } from 'swiper/modules';
import { Link } from 'react-router-dom';
import ProductCard from '../ProductCard/ProductCard';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import './ProductSlider.css';

const ProductSlider = ({ 
  title, 
  products, 
  viewAllLink, 
  viewAllText = 'Ver Más', 
  slidesPerView = { desktop: 4, tablet: 2, mobile: 1.2 },
  showTitle = true,
  showFavoriteButton = false,
  renderCard = null
}) => {
  return (
    <div className="product-slider-container">
      <div className="product-slider-header">
        {showTitle && title && (
          <h2 className="product-slider-title">{title}</h2>
        )}
        {viewAllLink && (
          <Link to={viewAllLink} className="product-slider-view-all">
            {viewAllText} <span className="arrow">→</span>
          </Link>
        )}
      </div>

      <Swiper
        modules={[Navigation, Pagination, A11y]}
        spaceBetween={20}
        slidesPerView={slidesPerView.mobile}
        pagination={{ 
          clickable: true,
          dynamicBullets: true
        }}
        breakpoints={{
          640: {
            slidesPerView: slidesPerView.tablet,
            spaceBetween: 20,
          },
          1024: {
            slidesPerView: slidesPerView.desktop,
            spaceBetween: 30,
          },
        }}
        className="product-swiper"
      >
        {products.map((product) => (
          <SwiperSlide key={product.id} className="product-slide">
            {renderCard ? (
              renderCard(product)
            ) : (
              <ProductCard product={product} showFavoriteButton={showFavoriteButton} />
            )}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default ProductSlider; 
