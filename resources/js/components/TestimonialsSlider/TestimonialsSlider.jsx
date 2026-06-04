import React, { useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay, EffectCoverflow } from 'swiper/modules';
import ReviewCard from '../sections/CustomerReviews/ReviewCard';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/effect-coverflow';
import './TestimonialsSlider.css';

const TestimonialVideo = ({ src, fallbackSrc, label }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayClick = () => {
    if (!videoRef.current) return;
    videoRef.current.play().catch(() => {
      setIsPlaying(false);
    });
  };

  return (
    <article className="testimonial-video-card">
      <div className="testimonial-video-media">
        <video
          ref={videoRef}
          className="testimonial-video-element"
          controls
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
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

const TestimonialsSlider = () => {
  const testimonials = [
    {
      id: 1,
      name: "Fe de los Ángeles A.",
      avatar: "https://ui-avatars.com/api/?name=Fe+Angeles&background=EA2630&color=fff&size=128",
      rating: 5,
      text: "Comprar en CHERRY es comprar entre familia, me siento cómoda y contenta, porque ahí encuentro ropa muy bonita, exclusiva, telas de calidad y un personal que se ha vuelto parte de mi familia. LO RECOMIENDO AMPLIAMENTE."
    },
    {
      id: 2,
      name: "Isabel G.",
      avatar: "https://ui-avatars.com/api/?name=Isabel+G&background=EA2630&color=fff&size=128",
      rating: 5,
      text: "Pertenecer como cliente a la empresa CHERRY es un privilegio, en cuanto empecé a comprar se reflejó, mis ventas subieron, y mis clientas están muy satisfechas, las telas son de excelente calidad y modelos en tendencia, por lo tanto a mi negocio y a mí me benefician mucho en todos los aspectos."
    },
    {
      id: 3,
      name: "Sergio L.",
      avatar: "https://ui-avatars.com/api/?name=Sergio+L&background=EA2630&color=fff&size=128",
      rating: 5,
      text: "En CHERRY no solo encuentro ropa hermosa, exclusiva y con telas de excelente calidad; también encuentro calidez, apoyo y personas que se han convertido en parte de mi familia. Ser parte de CHERRY transformó mi vida, no solo me ayuda a sentirme seguro y confiado, también me dio la oportunidad de mejorar mis ingresos y crecer económicamente."
    }
  ];

  const testimonialVideos = [
    {
      id: 1,
      src: '/videos/testimonio-1.mp4',
      fallbackSrc: '/videos/testimonios-1.mp4',
      label: 'Video testimonio 1',
    },
    { id: 2, src: '/videos/testimonio-2.mp4', label: 'Video testimonio 2' },
  ];

  return (
    <section className="testimonials-slider-section">
      <div className="testimonials-slider-container">
        <div className="testimonials-header">
          <h2 className="testimonials-title">Testimonios de nuestros usuarios</h2>
        </div>

        <div className="testimonials-videos-grid">
          {testimonialVideos.map((video) => (
            <TestimonialVideo
              key={video.id}
              src={video.src}
              fallbackSrc={video.fallbackSrc}
              label={video.label}
            />
          ))}
        </div>

        <div className="testimonials-slider-wrapper">
          <Swiper
            modules={[Navigation, Autoplay, EffectCoverflow]}
            spaceBetween={20}
            slidesPerView={1.15}
            loop={true}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            navigation={{
              prevEl: '.testimonials-slider-button-prev',
              nextEl: '.testimonials-slider-button-next',
            }}
            speed={800}
            grabCursor={true}
            centeredSlides={false}
            breakpoints={{
              640: {
                slidesPerView: 1.5,
                spaceBetween: 20,
                centeredSlides: false,
              },
              768: {
                slidesPerView: 2,
                spaceBetween: 25,
                centeredSlides: false,
              },
              1024: {
                slidesPerView: 3,
                spaceBetween: 25,
                centeredSlides: false,
              },
              1280: {
                slidesPerView: 3,
                spaceBetween: 30,
                centeredSlides: false,
              },
            }}
            className="testimonials-swiper"
          >
            {testimonials.map((testimonial) => (
              <SwiperSlide key={testimonial.id}>
                <ReviewCard
                  name={testimonial.name}
                  avatar={testimonial.avatar}
                  rating={testimonial.rating}
                  text={testimonial.text}
                />
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Navigation Buttons */}
          <div className="testimonials-slider-button-prev">
            <svg width="10" height="17" viewBox="0 0 10 17" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0.195312 7.90365C-0.0651042 8.16406 -0.0651042 8.52865 0.195312 8.78906L7.85156 16.4974C8.0599 16.7578 8.47656 16.7578 8.73698 16.4974L9.72656 15.4557C9.98698 15.1953 9.98698 14.8307 9.72656 14.5703L3.58073 8.32031L9.72656 2.1224C9.98698 1.86198 9.98698 1.44531 9.72656 1.23698L8.73698 0.195313C8.47656 -0.0651042 8.0599 -0.0651042 7.85156 0.195313L0.195312 7.90365Z" fill="#EA2630" />
            </svg>
          </div>
          <div className="testimonials-slider-button-next">
            <svg width="10" height="17" viewBox="0 0 10 17" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.72656 8.78906C9.98698 8.52865 9.98698 8.16406 9.72656 7.90365L2.1224 0.195313C1.86198 -0.0651042 1.44531 -0.0651042 1.23698 0.195313L0.195312 1.23698C-0.0651042 1.44531 -0.0651042 1.86198 0.195312 2.1224L6.34115 8.32031L0.195312 14.5703C-0.0651042 14.8307 -0.0651042 15.1953 0.195312 15.4557L1.23698 16.4974C1.44531 16.7578 1.86198 16.7578 2.1224 16.4974L9.72656 8.78906Z" fill="#EA2630" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSlider;

