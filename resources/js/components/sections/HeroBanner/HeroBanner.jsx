import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useWelcomeSection from '../../../hooks/useWelcomeSection';
import { getHeroSliderImagePath, getHeroIconPath } from '../../../utils/assetPaths';
import useUserStore from '../../../store/userStore';
import './HeroBanner.css';

const HeroBanner = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const { welcomeSections, loading, error } = useWelcomeSection(3);
  const { user } = useUserStore();

  // Memoizar los banners de fallback para evitar recreaciones
  const fallbackBanners = useMemo(() => [
    {
      id: 1,
      image: getHeroSliderImagePath('hero-slider1-girl.png'),
      titlePart1: '¡Bienvenida',
      titlePart2: 'a la moda que te inspira!',
      description: 'Explora nuestra colección única y actualizada que resalta tu estilo personal.',
      buttonText: 'Explorar Colección',
      buttonUrl: '/catalogo',
      imageAlt: 'Mujer joven modelando vestido elegante de la colección Cherry Central, estilo moderno y sofisticado'
    }
  ], []);

  // Memoizar la conversión de secciones de bienvenida al formato del banner
  const banners = useMemo(() => {
    if (welcomeSections.length > 0) {
      return welcomeSections.map((section, index) => ({
        id: section.id,
        image: section.image_path ? `${window.location.origin}/${section.image_path}` : getHeroSliderImagePath('hero-slider1-girl.png'),
        titlePart1: section.title ? section.title.split(' ')[0] : '¡Bienvenida',
        titlePart2: section.title ? section.title.split(' ').slice(1).join(' ') : 'a la moda que te inspira!',
        description: section.subtitle || 'Explora nuestra colección única y actualizada que resalta tu estilo personal.',
        buttonText: section.button_text || 'Explorar Colección',
        buttonUrl: section.button_url || '/catalogo',
        imageAlt: `Imagen de bienvenida ${index + 1} de Cherry Central`
      }));
    }
    return fallbackBanners;
  }, [welcomeSections, fallbackBanners]);

  // Memoizar la función goToSlide
  const goToSlide = useCallback((index) => {
    setCurrentSlide(index);
  }, []);

  // Memoizar la función handleImageClick
  const handleImageClick = useCallback((banner) => {
    navigate(banner.buttonUrl);
  }, [navigate]);

  // Memoizar la función handleImageError para evitar recreaciones
  const handleImageError = useCallback((e) => {
    // Usar una imagen de placeholder más específica y optimizada
    e.target.src = '/images/welcome-sections/default-welcome.jpg';
    // Prevenir futuros errores
    e.target.onerror = null;
  }, []);

  // Auto-advance slides if there are multiple banners
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 30000); // Change slide every 30 seconds

    return () => clearInterval(interval);
  }, [banners.length]);

  // Memoizar el banner actual para evitar recálculos
  const currentBanner = useMemo(() => banners[currentSlide], [banners, currentSlide]);

  if (loading) {
    return (
      <section className="hero-banner" role="banner">
        <div className="banner-container">
          <div className="banner-content">
            <div className="banner-text-container">
              <div className="banner-title skeleton">
                <div className="skeleton-line"></div>
                <div className="skeleton-line"></div>
              </div>
              <div className="banner-description skeleton">
                <div className="skeleton-line"></div>
              </div>
              <div className="banner-actions skeleton">
                <div className="skeleton-button"></div>
              </div>
            </div>
            <div className="banner-image-container skeleton">
              <div className="skeleton-image"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="hero-banner" role="banner">
        <div className="banner-container">
          <div className="banner-content">
            <div className="banner-text-container">
              <h1 className="banner-title">
                <span className="title-part1">¡Bienvenida</span>
                <span className="title-part2">a la moda que te inspira!</span>
              </h1>
              <p className="banner-description">
                Explora nuestra colección única y actualizada que resalta tu estilo personal.
              </p>
              <div className="banner-actions">
                <a 
                  className="btn-affiliate" 
                  title={currentBanner.buttonText} 
                  aria-label={currentBanner.buttonText} 
                  href={currentBanner.buttonUrl} 
                  data-discover="true"
                >
                  <img 
                    alt="Icono de catálogo" 
                    width="20" 
                    height="20" 
                    src="./icons/hero/Users.svg"
                  />
                  {currentBanner.buttonText}
                </a>
              </div>
            </div>
            <div className="banner-image-container">
              <img 
                src={getHeroSliderImagePath('hero-slider1-girl.png')} 
                alt="Mujer joven modelando vestido elegante de la colección Cherry Central, estilo moderno y sofisticado"
                className="banner-image"
                onClick={() => navigate('/catalogo')}
                style={{ cursor: 'pointer' }}
                onError={handleImageError}
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="hero-banner" role="banner">
      {/* Main Banner */}
      <div className="banner-container">
        <div className="banner-content">
          <div className="banner-text-container">
            <h1 className="banner-title">
              <span className="title-part1">{currentBanner.titlePart1}</span>
              <span className="title-part2">{currentBanner.titlePart2}</span>
            </h1>
            
            <p className="banner-description">
              {currentBanner.description}
            </p>
            
            <div className="banner-actions">
              <a 
                className="btn-affiliate" 
                title={currentBanner.buttonText} 
                aria-label={currentBanner.buttonText} 
                href={currentBanner.buttonUrl} 
                data-discover="true"
              >
                <img 
                  alt="Icono de catálogo" 
                  width="20" 
                  height="20" 
                  src="./icons/hero/Users.svg"
                />
                {currentBanner.buttonText}
              </a>
            </div>
          </div>
          
          <div className="banner-image-container">
            <img 
              src={currentBanner.image} 
              alt={currentBanner.imageAlt}
              className="banner-image"
              onClick={() => handleImageClick(currentBanner)}
              style={{ cursor: 'pointer' }}
              onError={handleImageError}
            />
          </div>
        </div>
      </div>

      {/* Slider Navigation - Solo mostrar si hay múltiples banners */}
      {banners.length > 1 && (
        <div className="slider-navigation">
          {banners.map((_, index) => (
            <button
              key={index}
              className={`slider-dot ${currentSlide === index ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Ir al slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default HeroBanner; 