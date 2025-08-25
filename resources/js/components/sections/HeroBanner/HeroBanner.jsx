import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getHeroSliderImagePath, getHeroIconPath } from '../../../utils/assetPaths';
import useWelcomeSection from '../../../hooks/useWelcomeSection';
import './HeroBanner.css';

const HeroBanner = () => {
  const navigate = useNavigate();
  // State to control current slide
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Hook para obtener las secciones de bienvenida activas (limitado a 3)
  const { welcomeSections, loading, error } = useWelcomeSection(3);

  // Main banner data with robust asset paths (fallback)
  const fallbackBanners = [
    {
      id: 1,
      image: getHeroSliderImagePath('hero-slider1-girl.png'),
      titlePart1: '¡Bienvenida',
      titlePart2: 'a la moda que te inspira!',
      description: 'Explora nuestra colección única y actualizada que resalta tu estilo personal. Afíliate hoy y accede a ofertas exclusivas que no querrás perderte.',
      buttonText: 'Explorar Colección',
      buttonUrl: '/catalogo',
      imageAlt: 'Mujer joven modelando vestido elegante de la colección Cherry Central, estilo moderno y sofisticado'
    }
  ];

  // Convertir secciones de bienvenida al formato del banner
  const banners = welcomeSections.length > 0 
    ? welcomeSections.map((section, index) => ({
        id: section.id,
        image: section.image_path ? `${window.location.origin}/${section.image_path}` : getHeroSliderImagePath('hero-slider1-girl.png'),
        titlePart1: section.title ? section.title.split(' ')[0] : '¡Bienvenida',
        titlePart2: section.title ? section.title.split(' ').slice(1).join(' ') : 'a la moda que te inspira!',
        description: section.subtitle || 'Explora nuestra colección única y actualizada que resalta tu estilo personal.',
        buttonText: section.button_text || 'Explorar Colección',
        buttonUrl: section.button_url || '/catalogo',
        imageAlt: `Imagen de bienvenida ${index + 1} de Cherry Central`
      }))
    : fallbackBanners;

  // Function to change slides
  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Function to handle image click - redirect to button URL
  const handleImageClick = (banner) => {
    navigate(banner.buttonUrl);
  };

  // Auto-advance slides if there are multiple banners
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 30000); // Change slide every 30 seconds

    return () => clearInterval(interval);
  }, [banners.length]);

  const currentBanner = banners[currentSlide];

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
              <Link 
                to={currentBanner.buttonUrl} 
                className="btn-explore"
                title={currentBanner.buttonText}
                aria-label={currentBanner.buttonText}
              >
                <p className="explora-text">{currentBanner.buttonText}</p>
                <img 
                  src={getHeroIconPath('Chevron Right.svg')} 
                  alt="Flecha hacia la derecha" 
                  width="20" 
                  height="20" 
                />
              </Link>
            </div>
          </div>
          
          <div className="banner-image-container">
            <img 
              src={currentBanner.image} 
              alt={currentBanner.imageAlt}
              className="banner-image"
              onClick={() => handleImageClick(currentBanner)}
              style={{ cursor: 'pointer' }}
              onError={(e) => {
                e.target.src = '/placeholder-banner.jpg';
              }}
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

      {/* Navigation arrows for multiple banners */}
      {banners.length > 1 && (
        <>
          <button
            className="slider-arrow slider-arrow--prev"
            onClick={() => goToSlide((currentSlide - 1 + banners.length) % banners.length)}
            aria-label="Slide anterior"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <button
            className="slider-arrow slider-arrow--next"
            onClick={() => goToSlide((currentSlide + 1) % banners.length)}
            aria-label="Slide siguiente"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </>
      )}
    </section>
  );
};

export default HeroBanner; 