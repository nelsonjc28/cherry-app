import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './ProductReviews.css';
import StarRating from '../StarRating/StarRating';

const ProductReviews = ({ productId: propProductId }) => {
  const { productId: paramProductId } = useParams();
  const productId = propProductId || paramProductId;
  
  const [sortBy] = useState('recent');
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load reviews from API
  useEffect(() => {
    const loadReviews = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`/api/reviews/product/${productId}`);
        
        if (response.data.success) {
          setReviews(response.data.reviews);
          setStats(response.data.stats);
        } else {
          setError('Error al cargar las reseñas');
        }
      } catch (err) {
        setError('Error al cargar las reseñas');
        console.error('Error loading reviews:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [productId]);

  // Mock reviews data (fallback - will be removed)
  const mockReviews = [
    {
      id: 1,
      userName: 'María González',
      rating: 5,
      date: '15 de agosto 2024',
      comment: 'Excelente calidad! La chamarra llegó exactamente como se veía en las fotos. El material es muy bueno y los detalles bordados son hermosos. Definitivamente la recomiendo.',
      images: [
        '/images/catalogProductImages/Rectangle 4922.png',
        '/images/catalogProductImages/Rectangle 4922 (1).png'
      ],
      verified: true
    },
    {
      id: 2,
      userName: 'Carlos Ruiz',
      rating: 4,
      date: '10 de agosto 2024',
      comment: 'Muy buena chamarra, la talla es correcta y el diseño está genial. Solo le quito una estrella porque tardó un poco más en llegar de lo esperado, pero en general estoy satisfecho con la compra.',
      images: [
        '/images/catalogProductImages/Rectangle 4922.png'
      ],
      verified: true
    },
    {
      id: 3,
      userName: 'Ana Martínez',
      rating: 5,
      date: '5 de agosto 2024',
      comment: 'Me encanta! Es exactamente lo que esperaba. Los bordados son de muy buena calidad y la tela se siente resistente. Ya he recibido varios cumplidos cuando la uso. Sin duda volvería a comprar.',
      images: [],
      verified: true
    }
  ];

  // Use only real approved reviews - no mock data
  const currentReviews = reviews.length > 0 ? reviews : [];
  const averageRating = stats.average || 0;
  const totalReviews = stats.total || 0;

  const getRatingDistribution = () => {
    if (stats.distribution && Object.keys(stats.distribution).length > 0) {
      return stats.distribution;
    }
    // Return empty distribution if no real reviews
    return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  };

  const ratingDistribution = getRatingDistribution();

  const sortedReviews = [...currentReviews].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.created_at || b.date) - new Date(a.created_at || a.date);
      case 'oldest':
        return new Date(a.created_at || a.date) - new Date(b.created_at || b.date);
      case 'highest':
        return b.rating - a.rating;
      case 'lowest':
        return a.rating - b.rating;
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="product-reviews">
        <div className="product-reviews__container">
          <div className="product-reviews__loading">
            <p>Cargando reseñas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-reviews">
        <div className="product-reviews__container">
          <div className="product-reviews__error">
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="product-reviews">
      <div className="product-reviews__container">
        <div className="product-reviews__header">
        <h2 className="product-reviews__title">Reseñas de clientes</h2>
        
        <div className="product-reviews__summary">
          <div className="product-reviews__average">
            <div className="product-reviews__average-score">
              {averageRating.toFixed(1)}
            </div>
            <div className="product-reviews__total-reviews">
              {totalReviews} reseñas
            </div>
            <div className="product-reviews__average-stars">
              <StarRating 
                rating={Math.round(averageRating)} 
                readOnly={true}
                size="md"
                showText={false}
                className="product-reviews__stars"
              />
            </div>
          </div>

          <div className="product-reviews__distribution">
            {[5, 4, 3, 2, 1].map(rating => (
              <div key={rating} className="product-reviews__distribution-row">
                <span className="product-reviews__distribution-label">
                  {rating} 
                </span>
                <div className="product-reviews__distribution-bar">
                  <div 
                    className="product-reviews__distribution-fill"
                    style={{ 
                      width: `${totalReviews > 0 ? (typeof ratingDistribution[rating] === 'object' ? ratingDistribution[rating].percentage : (ratingDistribution[rating] / totalReviews) * 100) : 0}%` 
                    }}
                  ></div>
                </div>
                <span className="product-reviews__distribution-count">
                  {typeof ratingDistribution[rating] === 'object' ? ratingDistribution[rating].count : ratingDistribution[rating]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="product-reviews__list">
        {sortedReviews.map((review) => (
          <div key={review.id} className="product-reviews__item">
            <div className="product-reviews__item-header">
              <div className="product-reviews__user-info">
                <div className="product-reviews__user-avatar">
                  {(review.user?.name || review.userName || 'Usuario').charAt(0).toUpperCase()}
                </div>
                <div className="product-reviews__user-details">
                  <div className="product-reviews__user-name">
                    {review.user?.name || review.userName || 'Usuario'}
                  </div>
                  <div className="product-reviews__date">{review.created_at || review.date}</div>
                </div>
              </div>
              <div className="product-reviews__rating">
                <StarRating 
                  rating={review.rating} 
                  readOnly={true}
                  size="md"
                  showText={false}
                  className="product-reviews__stars"
                />
              </div>
            </div>

            <div className="product-reviews__content">
              <p className="product-reviews__comment">{review.comment}</p>
              
              {review.images.length > 0 && (
                <div className="product-reviews__images">
                  {review.images.map((image, index) => (
                    <div key={index} className="product-reviews__image-container">
                      <img 
                        src={image} 
                        alt={`Reseña de ${review.userName} - Imagen ${index + 1}`}
                        className="product-reviews__image"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

        {currentReviews.length === 0 && (
          <div className="product-reviews__empty">
            <div className="product-reviews__empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
            </div>
            <p>Este producto aún no tiene reseñas.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductReviews;
