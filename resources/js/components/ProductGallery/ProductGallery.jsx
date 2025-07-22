import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Thumbs } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/thumbs';
import ProductGalleryModal from './ProductGalleryModal';
import './ProductGallery.css';

const ProductGallery = ({ productId, productTitle, onImageChange }) => {
  const [images, setImages] = useState([]);
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialIndex, setModalInitialIndex] = useState(0);

  // Generar URLs de imágenes para el producto
  useEffect(() => {
    if (!productId) return;

    const generateImageUrls = () => {
      const urls = [];
      // Intentar cargar hasta 6 imágenes por producto
      for (let i = 1; i <= 6; i++) {
        urls.push(`https://cherry-fotos.s3.amazonaws.com/shopify/${productId}/${productId}_${i}.jpg`);
      }
      return urls;
    };

    const imageUrls = generateImageUrls();
    setImages(imageUrls);
    setLoading(false);
  }, [productId]);

  const handleImageClick = (index) => {
    setModalInitialIndex(index);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleSlideChange = (swiper) => {
    if (onImageChange) {
      onImageChange(swiper.activeIndex);
    }
  };

  if (loading) {
    return (
      <div className="product-gallery">
        <div className="product-gallery__loading">
          <div className="product-gallery__loading-spinner"></div>
          <p>Cargando imágenes...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="product-gallery">
        {/* Galería principal */}
        <div className="product-gallery__main">
          <Swiper
            spaceBetween={10}
            navigation={true}
            pagination={{ clickable: true }}
            thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
            modules={[Navigation, Pagination, Thumbs]}
            className="product-gallery__swiper"
            onSlideChange={handleSlideChange}
            allowTouchMove={true}
            grabCursor={true}
            loop={false}
          >
            {images.map((image, index) => (
              <SwiperSlide key={index} className="product-gallery__slide">
                <img
                  src={image}
                  alt={`${productTitle} - Imagen ${index + 1}`}
                  className="product-gallery__image"
                  onClick={() => handleImageClick(index)}
                  style={{ cursor: 'pointer' }}
                  onError={(e) => {
                    // No ocultar la imagen, solo mostrar un placeholder
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPkltYWdlbiBubyBkaXNwb25pYmxlPC90ZXh0Pgo8L3N2Zz4K';
                  }}
                  onLoad={() => {
                    // Image loaded successfully
                  }}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Miniaturas */}
        <div className="product-gallery__thumbs">
          <Swiper
            onSwiper={setThumbsSwiper}
            spaceBetween={10}
            slidesPerView={4}
            watchSlidesProgress={true}
            modules={[Navigation, Thumbs]}
            className="product-gallery__thumbs-swiper"
            allowTouchMove={true}
            grabCursor={true}
          >
            {images.map((image, index) => (
              <SwiperSlide key={index} className="product-gallery__thumb-slide">
                <img
                  src={image}
                  alt={`Miniatura ${index + 1}`}
                  className="product-gallery__thumb-image"
                  onClick={() => handleImageClick(index)}
                  style={{ cursor: 'pointer' }}
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPkltYWdlbjwvdGV4dD4KPC9zdmc+Cg==';
                  }}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Indicador de imágenes */}
        <div className="product-gallery__indicator">
          <span className="product-gallery__indicator-text">
            {images.length} imágenes disponibles - Haz clic para ampliar
          </span>
        </div>
      </div>

      {/* Modal para vista completa */}
      <ProductGalleryModal
        images={images}
        initialIndex={modalInitialIndex}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        productTitle={productTitle}
      />
    </>
  );
};

export default ProductGallery; 