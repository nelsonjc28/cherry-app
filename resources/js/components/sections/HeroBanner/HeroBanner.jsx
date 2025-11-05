import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useWelcomeSection from '../../../hooks/useWelcomeSection';
import { getHeroSliderImagePath, getHeroIconPath } from '../../../utils/assetPaths';
import useUserStore from '../../../store/userStore';
import './HeroBanner.css';

const HeroBanner = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const { welcomeSections, loading, error } = useWelcomeSection(4);
  const { user } = useUserStore();

  // Referencias para swipe
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isDragging = useRef(false);
  const hasMovedSignificantly = useRef(false);
  const bannerRef = useRef(null);

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

  // Funciones para manejar swipe
  const handleTouchStart = useCallback((e) => {
    console.log('📱 Touch Start');
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    isDragging.current = true;
    hasMovedSignificantly.current = false;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging.current) return;
    touchEndX.current = e.touches[0].clientX;

    // Detectar si hay movimiento significativo
    const movement = Math.abs(touchStartX.current - touchEndX.current);
    if (movement > 10) {
      hasMovedSignificantly.current = true;
      console.log('📱 Movimiento detectado:', movement + 'px');
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;

    const swipeThreshold = 50; // Mínimo de píxeles para considerar un swipe
    const difference = touchStartX.current - touchEndX.current;

    console.log('📱 Touch End:', {
      difference: Math.abs(difference) + 'px',
      hasMovedSignificantly: hasMovedSignificantly.current,
      isDragging: isDragging.current,
      threshold: swipeThreshold + 'px'
    });

    // Solo cambiar slide si hubo movimiento significativo
    if (hasMovedSignificantly.current && Math.abs(difference) > swipeThreshold) {
      console.log('📱 ↔️ SWIPE detectado - cambiando slide');
      if (difference > 0) {
        // Swipe a la izquierda - siguiente slide
        setCurrentSlide((prev) => (prev + 1) % banners.length);
      } else {
        // Swipe a la derecha - slide anterior
        setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
      }

      // Si hubo swipe, mantener el flag por un momento para bloquear clicks
      isDragging.current = false;
      // NO resetear hasMovedSignificantly inmediatamente para bloquear el click
      setTimeout(() => {
        console.log('📱 Flags reseteados después de swipe');
        hasMovedSignificantly.current = false;
      }, 200);
      touchStartX.current = 0;
      touchEndX.current = 0;
    } else {
      // Si NO hubo swipe (fue un tap), resetear inmediatamente para permitir el click
      console.log('📱 👆 TAP detectado - reseteando flags INMEDIATAMENTE para permitir click');
      isDragging.current = false;
      hasMovedSignificantly.current = false;
      touchStartX.current = 0;
      touchEndX.current = 0;
    }
  }, [banners.length]);

  // Soporte para mouse drag (desktop)
  const handleMouseDown = useCallback((e) => {
    touchStartX.current = e.clientX;
    touchEndX.current = e.clientX;
    isDragging.current = true;
    hasMovedSignificantly.current = false;
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    touchEndX.current = e.clientX;

    // Detectar si hay movimiento significativo
    const movement = Math.abs(touchStartX.current - touchEndX.current);
    if (movement > 10) {
      hasMovedSignificantly.current = true;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return;

    const swipeThreshold = 50;
    const difference = touchStartX.current - touchEndX.current;

    console.log('🖱️ Mouse Up:', {
      difference,
      hasMovedSignificantly: hasMovedSignificantly.current,
      isDragging: isDragging.current
    });

    // Solo cambiar slide si hubo movimiento significativo
    if (hasMovedSignificantly.current && Math.abs(difference) > swipeThreshold) {
      console.log('↔️ Drag detectado - cambiando slide');
      if (difference > 0) {
        setCurrentSlide((prev) => (prev + 1) % banners.length);
      } else {
        setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
      }

      // Si hubo drag, mantener el flag por un momento para bloquear clicks
      isDragging.current = false;
      // NO resetear hasMovedSignificantly inmediatamente para bloquear el click
      setTimeout(() => {
        hasMovedSignificantly.current = false;
      }, 200);
      touchStartX.current = 0;
      touchEndX.current = 0;
    } else {
      // Si NO hubo drag (fue un click), resetear inmediatamente para permitir el click
      console.log('🖱️ Click detectado - permitiendo navegación');
      isDragging.current = false;
      hasMovedSignificantly.current = false;
      touchStartX.current = 0;
      touchEndX.current = 0;
    }
  }, [banners.length]);

  // Prevenir drag de imágenes
  const handleDragStart = useCallback((e) => {
    e.preventDefault();
  }, []);

  // Memoizar la función handleImageClick
  const handleImageClick = useCallback((e, banner) => {
    console.log('🖱️ Image click detected:', {
      hasMovedSignificantly: hasMovedSignificantly.current,
      isDragging: isDragging.current,
      buttonUrl: banner.buttonUrl
    });

    // Solo navegar si no hubo movimiento significativo (no fue un swipe)
    if (!hasMovedSignificantly.current) {
      console.log('✅ Navegando a:', banner.buttonUrl);
      e.preventDefault();
      e.stopPropagation();

      // Usar setTimeout para asegurar que el navigate se ejecute después del evento
      setTimeout(() => {
        navigate(banner.buttonUrl);
      }, 0);
    } else {
      console.log('❌ Click bloqueado por swipe');
      e.preventDefault();
      e.stopPropagation();
    }
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
    }, 7000); // Change slide every 7 seconds

    // Limpiar y reiniciar el intervalo cuando cambia el slide
    return () => clearInterval(interval);
  }, [banners.length, currentSlide]); // Agregado currentSlide como dependencia

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
                  className="btn-explore"
                  title="Explorar Colección"
                  aria-label="Explorar Colección"
                  href="/catalogo"
                  data-discover="true"
                  style={{
                    backgroundColor: '#EA2630',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '14px 20px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '16px',
                    fontWeight: '400',
                    height: '50px',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <img
                    alt="Icono de catálogo"
                    width="20"
                    height="20"
                    src="./icons/hero/Users.svg"
                    style={{ filter: 'brightness(0) invert(1)' }}
                  />
                  Explorar Colección
                </a>
              </div>
            </div>
            <div className="banner-image-container">
              <img
                src={getHeroSliderImagePath('hero-slider1-girl.png')}
                alt="Mujer joven modelando vestido elegante de la colección Cherry Central, estilo moderno y sofisticado"
                className="banner-image"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/catalogo');
                }}
                style={{ cursor: 'pointer' }}
                onError={handleImageError}
                draggable="false"
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="hero-banner hero-banner--swipeable"
      role="banner"
      ref={bannerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Main Banner */}
      <div className="banner-container">
        <div className="banner-content">
          <div className="banner-text-container">
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
            <h1 className="banner-title">
              <span className="title-part1">{currentBanner.titlePart1}</span>
              <span className="title-part2">{currentBanner.titlePart2}</span>
            </h1>

            <p className="banner-description">
              {currentBanner.description}
            </p>

            <div className="banner-actions">
              <a
                className="btn-explore"
                title={currentBanner.buttonText}
                aria-label={currentBanner.buttonText}
                href={currentBanner.buttonUrl}
                data-discover="true"
                onClick={(e) => {
                  // Prevenir navegación si hubo un swipe
                  if (hasMovedSignificantly.current) {
                    e.preventDefault();
                  }
                }}
                style={{
                  backgroundColor: '#EA2630',
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px 20px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '16px',
                  fontWeight: '400',
                  height: '50px',
                  transition: 'all 0.3s ease'
                }}
              >
                <img
                  alt="Icono de catálogo"
                  width="20"
                  height="20"
                  src="./icons/hero/Users.svg"
                  style={{ filter: 'brightness(0) invert(1)' }}
                  
                />
                {currentBanner.buttonText}
              </a>
            </div>
          </div>

          <div className="banner-image-container">
            <Link
              to={currentBanner.buttonUrl}
              onClick={(e) => {
                // Prevenir navegación si hubo swipe
                if (hasMovedSignificantly.current) {
                  e.preventDefault();
                  e.stopPropagation();
                } else {
                }
              }}
              style={{ display: 'block', cursor: 'pointer' }}
            >
              <img
                src={currentBanner.image}
                alt={currentBanner.imageAlt}
                className="banner-image"
                onDragStart={handleDragStart}
                style={{ userSelect: 'none' }}
                onError={handleImageError}
                draggable="false"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroBanner; 
