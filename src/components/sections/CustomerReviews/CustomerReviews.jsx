import React from 'react';
import ReviewCard from './ReviewCard';
import './CustomerReviews.css';

const CustomerReviews = () => {
  // Sample reviews data - this could come from props or API in the future
  const reviews = [
    {
      id: 1,
      name: "María González",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
      rating: 5,
      text: "Los productos son de excelente calidad y el servicio al cliente es excepcional. Definitivamente recomiendo esta tienda."
    },
    {
      id: 2,
      name: "Juan Pérez", 
      avatar: "https://randomuser.me/api/portraits/men/32.jpg",
      rating: 5,
      text: "Me encanta la variedad de productos y lo rápidos que son los envíos. Siempre encuentro lo que busco."
    },
    {
      id: 3,
      name: "Ana Rodríguez",
      avatar: "https://randomuser.me/api/portraits/women/65.jpg", 
      rating: 5,
      text: "La calidad de los accesorios es increíble. Llevo comprando aquí más de un año y nunca me ha decepcionado."
    }
  ];

  return (
    <section className="customer-reviews">
      <div className="container">
        {/* Reviews Header */}
        <div className="reviews-header">
          <div className="reviews-subtitle">Reviews</div>
          <h2 className="section-title">Comentarios de clientes</h2>
          <p className="section-description">
            Lorem ipsum dolor sit amet consectetur. Nulla ante tellus posuere ac nunc. Arcu diam nunc non.
          </p>
        </div>
        
        {/* Reviews Grid */}
        <div className="reviews-grid">
          {reviews.map((review) => (
            <ReviewCard 
              key={review.id}
              name={review.name}
              avatar={review.avatar}
              rating={review.rating}
              text={review.text}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CustomerReviews; 