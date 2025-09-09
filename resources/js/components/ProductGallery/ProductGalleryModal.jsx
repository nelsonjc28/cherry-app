import React, { useState, useEffect, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Keyboard, Zoom, Mousewheel } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/zoom';
import 'swiper/css/mousewheel';
import './ProductGalleryModal.css';

const ProductGalleryModal = ({ images, initialIndex = 0, isOpen, onClose, productTitle }) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const swiperRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  // Reset active index when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveIndex(initialIndex);
      setIsZoomed(false);
      setShowScrollHint(false);
    }
  }, [isOpen, initialIndex]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen || !images || images.length === 0) return null;

  const handleClose = () => {
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  const handleImageClick = () => {
    setIsZoomed(!isZoomed);
  };

  const showScrollFeedback = () => {
    setShowScrollHint(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setShowScrollHint(false);
    }, 1500);
  };

  const handleMouseWheel = (e) => {
    if (swiperRef.current && swiperRef.current.swiper) {
      const swiper = swiperRef.current.swiper;
      
      // Solo navegar si no está en zoom
      if (!swiper.zoom.scale || swiper.zoom.scale <= 1) {
        e.preventDefault();
        
        if (e.deltaY > 0) {
          // Scroll hacia abajo - siguiente imagen
          if (!swiper.isEnd) {
            swiper.slideNext();
            showScrollFeedback();
          }
        } else {
          // Scroll hacia arriba - imagen anterior
          if (!swiper.isBeginning) {
            swiper.slidePrev();
            showScrollFeedback();
          }
        }
      }
    }
  };

  return (
    <div 
      className="product-gallery-modal"
      onClick={handleClose}
      onKeyDown={handleKeyDown}
      onWheel={handleMouseWheel}
      tabIndex={0}
    >
      <div className="product-gallery-modal__content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="product-gallery-modal__header">
          <h3 className="product-gallery-modal__title">{productTitle}</h3>
          <div className="product-gallery-modal__controls">
            <button 
              className="product-gallery-modal__zoom-btn"
              onClick={handleImageClick}
              aria-label={isZoomed ? "Reducir zoom" : "Ampliar zoom"}
              title={isZoomed ? "Reducir zoom" : "Ampliar zoom"}
            >
              {isZoomed ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              )}
            </button>
            <button 
              className="product-gallery-modal__close"
              onClick={handleClose}
              aria-label="Cerrar galería"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="product-gallery-modal__gallery">
          <Swiper
            ref={swiperRef}
            spaceBetween={20}
            navigation={true}
            pagination={{ clickable: true }}
            keyboard={{ enabled: true }}
            mousewheel={{ 
              forceToAxis: true,
              sensitivity: 1,
              releaseOnEdges: true
            }}
            zoom={{ 
              maxRatio: 3,
              minRatio: 1,
              toggle: true,
              containerClass: 'swiper-zoom-container',
              zoomedSlideClass: 'swiper-slide-zoomed'
            }}
            modules={[Navigation, Pagination, Keyboard, Zoom, Mousewheel]}
            className="product-gallery-modal__swiper"
            initialSlide={initialIndex}
            onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
            allowTouchMove={true}
            grabCursor={true}
            loop={false}
          >
            {images.map((image, index) => (
              <SwiperSlide key={index} className="product-gallery-modal__slide">
                <div className="swiper-zoom-container">
                  <img
                    src={image}
                    alt={`${productTitle} - Imagen ${index + 1}`}
                    className="product-gallery-modal__image"
                    onError={(e) => {
                      // Image failed to load
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiPkltYWdlbiBubyBkaXNwb25pYmxlPC90ZXh0Pgo8L3N2Zz4K';
                    }}
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
          
          {/* Scroll indicator */}
          {showScrollHint && (
            <div className="product-gallery-modal__scroll-indicator show">
              {activeIndex === 0 ? "Siguiente imagen" : activeIndex === images.length - 1 ? "Imagen anterior" : "Navegando..."}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="product-gallery-modal__footer">
          <span className="product-gallery-modal__counter">
            {activeIndex + 1} de {images.length}
          </span>
          <span className="product-gallery-modal__zoom-hint">
            {isZoomed ? "Haz clic para reducir zoom" : "Haz clic en la imagen para ampliar • Usa la rueda del mouse para navegar"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProductGalleryModal; 
