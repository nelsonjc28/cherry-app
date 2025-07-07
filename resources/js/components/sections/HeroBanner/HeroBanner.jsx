import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getHeroSliderImagePath, getHeroIconPath } from '../../../utils/assetPaths';
import './HeroBanner.css';

const HeroBanner = () => {
  // State to control current slide
  const [currentSlide, setCurrentSlide] = useState(0);

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
      id: 2,
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

  return (
    <section className="hero-banner" role="banner">
      {/* Main Banner */}
      <div className="banner-container">
        <div className="banner-content">
          <div className="banner-text-container">
            <h1 className="banner-title">
              <span className="title-part1">{banners[currentSlide].titlePart1}</span>
              <span className="title-part2">{banners[currentSlide].titlePart2}</span>
            </h1>
            
            <p className="banner-description">
              {banners[currentSlide].description}
            </p>
            
            <div className="banner-actions">
              <Link 
                to="/afiliate" 
                className="btn-affiliate"
                title="Únete a nuestro programa de afiliados y comienza tu negocio"
                aria-label="Afiliate a Cherry Central y comienza tu negocio"
              >
                <img 
                  src={getHeroIconPath('Users.svg')} 
                  alt="Icono de usuarios" 
                  width="20" 
                  height="20" 
                />
                Afiliate ahora
              </Link>
              
              <Link 
                to="/explorar" 
                className="btn-explore"
                title="Explora toda nuestra colección de moda femenina"
                aria-label="Explora el catálogo completo de productos"
              >
                <p className="explora-text">Explora</p>
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
            <div className="image-wrapper">
              <img 
                src={banners[currentSlide].image} 
                alt={banners[currentSlide].imageAlt}
                className="hero-image" 
                loading="eager"
                fetchPriority="high"
              />
              <div className="decorative-lines" aria-hidden="true">
                <div className="line line-1"></div>
                <div className="line line-2"></div>
                <div className="line line-3"></div>
                <div className="line line-4"></div>
                <div className="line line-5"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Slide Indicators */}
        <div className="banner-indicators" role="tablist" aria-label="Slides del banner principal">
          {banners.map((_, index) => (
            <button
              key={index}
              className={`indicator ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              role="tab"
              aria-selected={index === currentSlide}
              aria-controls={`slide-${index}`}
              aria-label={`Ir al slide ${index + 1} de ${banners.length}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroBanner; 