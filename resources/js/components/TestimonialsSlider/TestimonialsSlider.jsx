import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay, EffectCoverflow } from 'swiper/modules';
import ReviewCard from '../sections/CustomerReviews/ReviewCard';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/effect-coverflow';
import './TestimonialsSlider.css';

const TestimonialsSlider = () => {
  // Mock data para testimonios
  const testimonials = [
    {
      id: 1,
      name: "Laura Martínez",
      avatar: "https://ui-avatars.com/api/?name=Laura+Martínez&background=EA2630&color=fff&size=128",
      rating: 5,
      text: "Ser parte de Cherry ha transformado mi vida. Ahora tengo mi propio negocio y gano más de lo que imaginaba. ¡Totalmente recomendado!"
    },
    {
      id: 2,
      name: "Carlos Rodríguez",
      avatar: "https://ui-avatars.com/api/?name=Carlos+Rodríguez&background=EA2630&color=fff&size=128",
      rating: 5,
      text: "La plataforma es muy fácil de usar y el soporte es excelente. En solo 3 meses he logrado crear una red de clientes increíble."
    },
    {
      id: 3,
      name: "Diana Flores",
      avatar: "https://ui-avatars.com/api/?name=Diana+Flores&background=EA2630&color=fff&size=128",
      rating: 5,
      text: "Los productos son de alta calidad y mis clientes están encantados. Las ganancias quincenales son puntuales. ¡Es una gran oportunidad!"
    },
    {
      id: 4,
      name: "Roberto Sánchez",
      avatar: "https://ui-avatars.com/api/?name=Roberto+Sánchez&background=EA2630&color=fff&size=128",
      rating: 5,
      text: "Comencé sin experiencia y ahora manejo mi propio negocio desde casa. El material promocional y los catálogos son muy profesionales."
    }
  ];

  return (
    <section className="testimonials-slider-section">
      <div className="testimonials-slider-container">
        <div className="testimonials-header">
          <h2 className="testimonials-title">Testimonios de nuestros usuarios</h2>
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

