import React, { useEffect, useRef, useState } from 'react';
import ReviewCard from '../sections/CustomerReviews/ReviewCard';
import './TestimonialsSlider.css';

const TestimonialVideo = ({ src, fallbackSrc, label, setVideoRef, onEnded, onRequestPlay }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayClick = () => {
    if (!videoRef.current) return;
    if (onRequestPlay) {
      onRequestPlay();
    }
    videoRef.current.play().catch(() => {
      setIsPlaying(false);
    });
  };

  return (
    <article className="testimonial-video-card">
      <div className="testimonial-video-media">
        <video
          ref={(node) => {
            videoRef.current = node;
            if (setVideoRef) {
              setVideoRef(node);
            }
          }}
          className="testimonial-video-element"
          controls
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={onEnded}
          aria-label={label}
        >
          <source src={src} type="video/mp4" />
          {fallbackSrc ? <source src={fallbackSrc} type="video/mp4" /> : null}
          Tu navegador no soporta videos HTML5.
        </video>

        {!isPlaying && (
          <button
            type="button"
            className="testimonial-video-play-button"
            onClick={handlePlayClick}
            aria-label={`Reproducir ${label}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M8 5.5v13L18 12 8 5.5z" fill="#ffffff" />
            </svg>
          </button>
        )}
      </div>
    </article>
  );
};

const getSlidePosition = (index, currentIndex, total) => {
  const prevIndex = (currentIndex - 1 + total) % total;
  const nextIndex = (currentIndex + 1) % total;

  if (index === currentIndex) return 'active';
  if (index === prevIndex) return 'prev';
  if (index === nextIndex) return 'next';
  return 'hidden';
};

const TestimonialsSlider = () => {
  const videoRefs = useRef([]);
  const touchStartX = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoIndex, setVideoIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const testimonials = [
    {
      id: 1,
      name: "Fe de los Ángeles A.",
      rating: 5,
      text: "Comprar en CHERRY es comprar entre familia, me siento cómoda y contenta, porque ahí encuentro ropa muy bonita, exclusiva, telas de calidad y un personal que se ha vuelto parte de mi familia. LO RECOMIENDO AMPLIAMENTE."
    },
    {
      id: 2,
      name: "Isabel G.",
      rating: 5,
      text: "Pertenecer como cliente a la empresa CHERRY es un privilegio, en cuanto empecé a comprar se reflejó, mis ventas subieron, y mis clientas están muy satisfechas, las telas son de excelente calidad y modelos en tendencia, por lo tanto a mi negocio y a mí me benefician mucho en todos los aspectos."
    },
    {
      id: 3,
      name: "Sergio L.",
      rating: 5,
      text: "En CHERRY no solo encuentro ropa hermosa, exclusiva y con telas de excelente calidad; también encuentro calidez, apoyo y personas que se han convertido en parte de mi familia. Ser parte de CHERRY transformó mi vida, no solo me ayuda a sentirme seguro y confiado, también me dio la oportunidad de mejorar mis ingresos y crecer económicamente."
    }
  ];

  const totalTestimonials = testimonials.length;

  const testimonialVideos = [
    {
      id: 1,
      src: '/videos/testimonio-1.mp4',
      fallbackSrc: '/videos/testimonios-1.mp4',
      label: 'Video testimonio 1',
    },
    { id: 2, src: '/videos/testimonio-2.mp4', label: 'Video testimonio 2' },
  ];

  const totalVideos = testimonialVideos.length;
  const showVideoArrows = totalVideos > 1;

  const goToPrevTestimonial = () => {
    setCurrentIndex((index) => (index - 1 + totalTestimonials) % totalTestimonials);
  };

  const goToNextTestimonial = () => {
    setCurrentIndex((index) => (index + 1) % totalTestimonials);
  };

  const goToTestimonial = (index) => {
    setCurrentIndex(index);
  };

  const goToPrevVideo = () => {
    setVideoIndex((index) => (index - 1 + totalVideos) % totalVideos);
  };

  const goToNextVideo = () => {
    setVideoIndex((index) => (index + 1) % totalVideos);
  };

  const setVideoRefAt = (index, node) => {
    videoRefs.current[index] = node;
  };

  const pauseOtherVideos = (activeIndex) => {
    videoRefs.current.forEach((videoNode, index) => {
      if (!videoNode || index === activeIndex) return;
      if (!videoNode.paused) {
        videoNode.pause();
      }
    });
  };

  const playVideoAt = (index) => {
    const videoNode = videoRefs.current[index];
    if (!videoNode) return;

    pauseOtherVideos(index);
    videoNode.play().catch(() => {});
  };

  const handleVideoEnded = (index) => {
    const nextIndex = (index + 1) % testimonialVideos.length;
    setVideoIndex(nextIndex);
    setTimeout(() => {
      playVideoAt(nextIndex);
    }, 300);
  };

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchEnd = (event) => {
    const deltaX = event.changedTouches[0].clientX - touchStartX.current;
    if (deltaX > 50) {
      goToPrevTestimonial();
    } else if (deltaX < -50) {
      goToNextTestimonial();
    }
    setIsPaused(false);
  };

  useEffect(() => {
    if (isPaused || totalTestimonials < 2) return undefined;

    const intervalId = setInterval(() => {
      setCurrentIndex((index) => (index + 1) % totalTestimonials);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [isPaused, totalTestimonials]);

  useEffect(() => {
    pauseOtherVideos(videoIndex);
  }, [videoIndex]);

  return (
    <section className="testimonials-slider-section">
      <div className="testimonials-slider-container">
        <div className="testimonials-videos-carousel">
          <div className="testimonials-videos-stage">
            <div className="testimonials-videos-grid">
              {testimonialVideos.map((video, index) => (
                <div
                  key={video.id}
                  className={`testimonials-video-slide${index === videoIndex ? ' is-active' : ''}`}
                >
                  <TestimonialVideo
                    src={video.src}
                    fallbackSrc={video.fallbackSrc}
                    label={video.label}
                    setVideoRef={(node) => setVideoRefAt(index, node)}
                    onEnded={() => handleVideoEnded(index)}
                    onRequestPlay={() => pauseOtherVideos(index)}
                  />
                </div>
              ))}
            </div>

            {showVideoArrows && (
              <>
                <button
                  type="button"
                  className="testimonials-video-nav testimonials-video-nav--prev"
                  onClick={goToPrevVideo}
                  aria-label="Video anterior"
                >
                  <svg width="10" height="17" viewBox="0 0 10 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0.195312 7.90365C-0.0651042 8.16406 -0.0651042 8.52865 0.195312 8.78906L7.85156 16.4974C8.0599 16.7578 8.47656 16.7578 8.73698 16.4974L9.72656 15.4557C9.98698 15.1953 9.98698 14.8307 9.72656 14.5703L3.58073 8.32031L9.72656 2.1224C9.98698 1.86198 9.98698 1.44531 9.72656 1.23698L8.73698 0.195313C8.47656 -0.0651042 8.0599 -0.0651042 7.85156 0.195313L0.195312 7.90365Z" fill="#EA2630" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="testimonials-video-nav testimonials-video-nav--next"
                  onClick={goToNextVideo}
                  aria-label="Video siguiente"
                >
                  <svg width="10" height="17" viewBox="0 0 10 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.72656 8.78906C9.98698 8.52865 9.98698 8.16406 9.72656 7.90365L2.1224 0.195313C1.86198 -0.0651042 1.44531 -0.0651042 1.23698 0.195313L0.195312 1.23698C-0.0651042 1.44531 -0.0651042 1.86198 0.195312 2.1224L6.34115 8.32031L0.195312 14.5703C-0.0651042 14.8307 -0.0651042 15.1953 0.195312 15.4557L1.23698 16.4974C1.44531 16.7578 1.86198 16.7578 2.1224 16.4974L9.72656 8.78906Z" fill="#EA2630" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="testimonials-slider-wrapper">
          <div className="testimonials-slider-stage">
            <div
              className="testimonials-swiper"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {testimonials.map((testimonial, index) => {
                const position = getSlidePosition(index, currentIndex, totalTestimonials);

                return (
                  <div
                    key={testimonial.id}
                    className={`testimonials-slide testimonials-slide--${position}`}
                    aria-hidden={position !== 'active'}
                  >
                    <ReviewCard
                      name={testimonial.name}
                      rating={testimonial.rating}
                      text={testimonial.text}
                    />
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="testimonials-slider-button-prev"
              onClick={goToPrevTestimonial}
              aria-label="Testimonio anterior"
            >
              <svg width="10" height="17" viewBox="0 0 10 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0.195312 7.90365C-0.0651042 8.16406 -0.0651042 8.52865 0.195312 8.78906L7.85156 16.4974C8.0599 16.7578 8.47656 16.7578 8.73698 16.4974L9.72656 15.4557C9.98698 15.1953 9.98698 14.8307 9.72656 14.5703L3.58073 8.32031L9.72656 2.1224C9.98698 1.86198 9.98698 1.44531 9.72656 1.23698L8.73698 0.195313C8.47656 -0.0651042 8.0599 -0.0651042 7.85156 0.195313L0.195312 7.90365Z" fill="#EA2630" />
              </svg>
            </button>
            <button
              type="button"
              className="testimonials-slider-button-next"
              onClick={goToNextTestimonial}
              aria-label="Testimonio siguiente"
            >
              <svg width="10" height="17" viewBox="0 0 10 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.72656 8.78906C9.98698 8.52865 9.98698 8.16406 9.72656 7.90365L2.1224 0.195313C1.86198 -0.0651042 1.44531 -0.0651042 1.23698 0.195313L0.195312 1.23698C-0.0651042 1.44531 -0.0651042 1.86198 0.195312 2.1224L6.34115 8.32031L0.195312 14.5703C-0.0651042 14.8307 -0.0651042 15.1953 0.195312 15.4557L1.23698 16.4974C1.44531 16.7578 1.86198 16.7578 2.1224 16.4974L9.72656 8.78906Z" fill="#EA2630" />
              </svg>
            </button>
          </div>

          <div className="testimonials-pagination" role="tablist" aria-label="Testimonios">
            {testimonials.map((testimonial, index) => (
              <button
                key={testimonial.id}
                type="button"
                className={`testimonials-pagination-bullet${index === currentIndex ? ' is-active' : ''}`}
                onClick={() => goToTestimonial(index)}
                aria-label={`Ver testimonio de ${testimonial.name}`}
                aria-current={index === currentIndex ? 'true' : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSlider;
