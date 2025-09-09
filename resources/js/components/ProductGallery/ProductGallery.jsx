import React, { useState, useEffect, useRef } from 'react';
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
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const mainSwiperRef = useRef(null);

  // Función para verificar si una imagen existe
  const checkImageExists = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  };

  // Generar URLs de imágenes para el producto y verificar disponibilidad
  useEffect(() => {
    if (!productId) return;

    const loadAvailableImages = async () => {
      setLoading(true);
      const availableImages = [];
      

      
      // Intentar cargar hasta 6 imágenes por producto
      for (let i = 1; i <= 6; i++) {
        const imageUrl = `https://cherry-fotos.s3.amazonaws.com/shopify/${productId}/${productId}_${i}.jpg`;

        
        const exists = await checkImageExists(imageUrl);
        if (exists) {

          availableImages.push(imageUrl);
        } else {

        }
      }



      // Si no hay imágenes disponibles, usar una imagen por defecto
      if (availableImages.length === 0) {

        availableImages.push('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPkltYWdlbiBubyBkaXNwb25pYmxlPC90ZXh0Pgo8L3N2Zz4K');
      }

      setImages(availableImages);
      setLoading(false);
    };

    loadAvailableImages();
  }, [productId]);

  const handleMainImageClick = (index) => {
    setModalInitialIndex(index);
    setIsModalOpen(true);
  };

  const handleThumbnailClick = (index) => {
    setActiveImageIndex(index);
    if (mainSwiperRef.current && mainSwiperRef.current.swiper) {
      mainSwiperRef.current.swiper.slideTo(index);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleSlideChange = (swiper) => {
    setActiveImageIndex(swiper.activeIndex);
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
            ref={mainSwiperRef}
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
            initialSlide={activeImageIndex}
          >
            {images.map((image, index) => (
              <SwiperSlide key={index} className="product-gallery__slide">
                <img
                  src={image}
                  alt={`${productTitle} - Imagen ${index + 1}`}
                  className="product-gallery__image"
                  onClick={() => handleMainImageClick(index)}
                  style={{ cursor: 'pointer' }}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Miniaturas - solo mostrar si hay más de una imagen */}
        {images.length > 1 && (
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
                    onClick={() => handleThumbnailClick(index)}
                    style={{ cursor: 'pointer' }}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}

        {/* Indicador de imágenes - solo mostrar si hay más de una imagen */}
        {images.length > 1 && (
          <div className="product-gallery__indicator">
            <span className="product-gallery__indicator-text">
              {images.length} imágenes disponibles - Haz clic en la imagen principal para ampliar
            </span>
          </div>
        )}
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
