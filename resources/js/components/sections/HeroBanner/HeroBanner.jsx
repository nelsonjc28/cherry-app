import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHeroSliderImagePath, getHeroIconPath } from '../../../utils/assetPaths';
import useWelcomeSection from '../../../hooks/useWelcomeSection';
import './HeroBanner.css';

const HeroBanner = () => {
  // State to control current slide
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Hook para obtener la sección de bienvenida activa
  const { welcomeSection, loading, error } = useWelcomeSection();

  // Main banner data with robust asset paths
  const banners = [
    {
      id: 1,
      image: getHeroSliderImagePath('hero-slider1-girl.png'),
      titlePart1: '¡Bienvenida',
      titlePart2: 'a la moda que te inspira!',
      description: 'Explora nuestra colección única y actualizada que resalta tu estilo personal. Afíliate hoy y accede a ofertas exclusivas que no querrás perderte.',
      imageAlt: 'Mujer joven modelando vestido elegante de la colección Cherry Central, estilo moderno y sofisticado'
    },
    {
      id: 2,
      image: getHeroSliderImagePath('hero-slider1-girl.png'),
      titlePart1: 'Descubre',
      titlePart2: 'lo mejor para tu estilo',
      description: 'Encuentra piezas únicas que complementan tu personalidad y estilo. La mejor selección de accesorios de temporada.',
      imageAlt: 'Modelo femenina luciendo outfit completo con accesorios únicos de Cherry Central'
    },
    {
      id: 3,
      image: getHeroSliderImagePath('hero-slider1-girl.png'),
      titlePart1: 'Descubre',
      titlePart2: 'lo mejor para tu estilo',
      description: 'Encuentra piezas únicas que complementan tu personalidad y estilo. La mejor selección de accesorios de temporada.',
      imageAlt: 'Modelo femenina luciendo outfit completo con accesorios únicos de Cherry Central'
    }
  ];

  // Function to change slides
  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Si hay una sección activa desde la base de datos, usarla
  const activeBanner = welcomeSection ? {
    id: 1,
    image: welcomeSection.image_path ? `${window.location.origin}/${welcomeSection.image_path}` : getHeroSliderImagePath('hero-slider1-girl.png'),
    titlePart1: welcomeSection.title ? welcomeSection.title.split(' ')[0] : '¡Bienvenida',
    titlePart2: welcomeSection.title ? welcomeSection.title.split(' ').slice(1).join(' ') : 'a la moda que te inspira!',
    description: welcomeSection.subtitle || 'Explora nuestra colección única y actualizada que resalta tu estilo personal. Afíliate hoy y accede a ofertas exclusivas que no querrás perderte.',
    buttonText: welcomeSection.button_text || 'Explorar Colección',
    buttonUrl: welcomeSection.button_url || '/catalogo',
    imageAlt: 'Imagen de bienvenida dinámica de Cherry Central'
  } : banners[currentSlide];

  return (
    <section className="hero-banner" role="banner">
      {/* Main Banner */}
      <div className="banner-container">
        <div className="banner-content">
          <div className="banner-text-container">
            <h1 className="banner-title">
              <span className="title-part1">{activeBanner.titlePart1}</span>
              <span className="title-part2">{activeBanner.titlePart2}</span>
            </h1>
            
            <p className="banner-description">
              {activeBanner.description}
            </p>
            
            <div className="banner-actions">
              <Link 
                to={activeBanner.buttonUrl || "/explorar"} 
                className="btn-explore"
                title={activeBanner.buttonText || "Explora toda nuestra colección de moda femenina"}
                aria-label={activeBanner.buttonText || "Explora el catálogo completo de productos"}
              >
                <p className="explora-text">{activeBanner.buttonText || "Explora"}</p>
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
              src={activeBanner.image} 
              alt={activeBanner.imageAlt}
              className="banner-image"
              onError={(e) => {
                e.target.src = '/placeholder-banner.jpg';
              }}
            />
          </div>
        </div>
      </div>

      {/* Slider Navigation - Solo mostrar si no hay sección activa */}
      {!welcomeSection && banners.length > 1 && (
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