import React, { useState, useEffect } from 'react';
import ReviewCard from './ReviewCard';
import './CustomerReviews.css';

const CustomerReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fallback reviews data
  const fallbackReviews = [
    {
      id: 1,
      name: "María González",
      avatar: "https://ui-avatars.com/api/?name=María+González&background=random",
      rating: 5,
      text: "Los productos son de excelente calidad y el servicio al cliente es excepcional. Definitivamente recomiendo esta tienda."
    },
    {
      id: 2,
      name: "Juan Pérez", 
      avatar: "https://ui-avatars.com/api/?name=Juan+Pérez&background=random",
      rating: 5,
      text: "Me encanta la variedad de productos y lo rápidos que son los envíos. Siempre encuentro lo que busco."
    },
    {
      id: 3,
      name: "Ana Rodríguez",
      avatar: "https://ui-avatars.com/api/?name=Ana+Rodríguez&background=random", 
      rating: 5,
      text: "La calidad de los accesorios es increíble. Llevo comprando aquí más de un año y nunca me ha decepcionado."
    }
  ];

  useEffect(() => {
    const fetchApprovedReviews = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/reviews/approved');
        const data = await response.json();
        
        if (data.success && data.reviews.length > 0) {
          setReviews(data.reviews);
        } else {
          // Si no hay reseñas aprobadas, usar fallback
          setReviews(fallbackReviews);
        }
      } catch (err) {
        console.error('Error fetching approved reviews:', err);
        setError(err.message);
        // En caso de error, usar reseñas de fallback
        setReviews(fallbackReviews);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovedReviews();
  }, []);

  if (loading) {
    return (
      <section className="customer-reviews">
        <div className="container">
          <div className="reviews-header">
            <div className="reviews-subtitle">Reviews</div>
            <h2 className="section-title">Comentarios de clientes</h2>
          </div>
          <div className="reviews-loading">
            <p>Cargando comentarios...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="customer-reviews">
      <div className="container">
        {/* Reviews Header */}
        <div className="reviews-header">
          <div className="reviews-subtitle">Reviews</div>
          <h2 className="section-title">Comentarios de clientes</h2>
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
