import React, { useState, useEffect } from 'react';
import StarRating from '../StarRating/StarRating';
import CherryButton from '../CherryButton/CherryButton';
import './AdminReviews.css';

// Mock data with pending and approved reviews
const mockAdminReviews = [
  {
    id: 1,
    userName: 'María González',
    userEmail: 'maria@email.com',
    productId: 'prod-123',
    productName: 'Blusa Elegante Cherry',
    rating: 5,
    comment: 'Excelente producto! La calidad es increíble y el ajuste perfecto. Lo recomiendo totalmente.',
    images: [
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=150&h=150&fit=crop'
    ],
    date: '2024-08-29',
    status: 'pending'
  },
  {
    id: 2,
    userName: 'Carlos Ruiz',
    userEmail: 'carlos@email.com',
    productId: 'prod-456',
    productName: 'Pantalón Casual Cherry',
    rating: 4,
    comment: 'Muy buen producto, aunque tardó un poco en llegar. La calidad es buena.',
    images: [],
    date: '2024-08-28',
    status: 'pending'
  },
  {
    id: 3,
    userName: 'Ana Martínez',
    userEmail: 'ana@email.com',
    productId: 'prod-789',
    productName: 'Vestido Cherry Premium',
    rating: 5,
    comment: 'Superó mis expectativas! El diseño es hermoso y la funcionalidad excelente.',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&h=150&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=150&h=150&fit=crop'
    ],
    date: '2024-08-27',
    status: 'approved'
  },
  {
    id: 4,
    userName: 'Roberto Silva',
    userEmail: 'roberto@email.com',
    productId: 'prod-101',
    productName: 'Camisa Cherry Classic',
    rating: 2,
    comment: 'No cumplió mis expectativas. El material se siente barato y la talla no es correcta.',
    images: [],
    date: '2024-08-26',
    status: 'rejected'
  }
];

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all
  const [_selectedReview, _setSelectedReview] = useState(null);

  useEffect(() => {
    // Simulate API call
    const loadReviews = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setReviews(mockAdminReviews);
      setLoading(false);
    };

    loadReviews();
  }, []);

  const filteredReviews = reviews.filter(review => {
    if (filter === 'all') return true;
    return review.status === filter;
  });

  const handleApprove = async (reviewId) => {
    setReviews(prevReviews =>
      prevReviews.map(review =>
        review.id === reviewId
          ? { ...review, status: 'approved' }
          : review
      )
    );
    
    // Here would be the API call
    console.log('Approving review:', reviewId);
  };

  const handleReject = async (reviewId) => {
    setReviews(prevReviews =>
      prevReviews.map(review =>
        review.id === reviewId
          ? { ...review, status: 'rejected' }
          : review
      )
    );
    
    // Here would be the API call
    console.log('Rejecting review:', reviewId);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pendiente', className: 'status-pending' },
      approved: { label: 'Aprobada', className: 'status-approved' },
      rejected: { label: 'Rechazada', className: 'status-rejected' }
    };
    
    const config = statusConfig[status];
    return (
      <span className={`status-badge ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="admin-reviews-loading">
        <div className="loading-spinner"></div>
        <p>Cargando reseñas...</p>
      </div>
    );
  }

  return (
    <div className="admin-reviews">
      <div className="admin-reviews-header">
        <h2>Reseñas</h2>
        <p>Administra las reseñas de productos enviadas por los usuarios</p>
      </div>

      {/* Filters */}
      <div className="admin-reviews-filters">
        <button 
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pendientes ({reviews.filter(r => r.status === 'pending').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
          onClick={() => setFilter('approved')}
        >
          Aprobadas ({reviews.filter(r => r.status === 'approved').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
          onClick={() => setFilter('rejected')}
        >
          Rechazadas ({reviews.filter(r => r.status === 'rejected').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todas ({reviews.length})
        </button>
      </div>

      {/* Reviews List */}
      <div className="admin-reviews-list">
        {filteredReviews.length === 0 ? (
          <div className="no-reviews">
            <p>No hay reseñas {filter === 'all' ? '' : filter === 'pending' ? 'pendientes' : filter === 'approved' ? 'aprobadas' : 'rechazadas'}</p>
          </div>
        ) : (
          filteredReviews.map(review => (
            <div key={review.id} className="admin-review-item">
              <div className="review-header">
                <div className="review-user-info">
                  <h4>{review.userName}</h4>
                  <p>{review.userEmail}</p>
                  <span className="review-date">{formatDate(review.date)}</span>
                </div>
                <div className="review-status">
                  {getStatusBadge(review.status)}
                </div>
              </div>

              <div className="review-product">
                <strong>Producto:</strong> {review.productName} (ID: {review.productId})
              </div>

              <div className="review-rating">
                <StarRating rating={review.rating} readonly showText={false} />
                <span>({review.rating}/5)</span>
              </div>

              <div className="review-comment">
                <p>{review.comment}</p>
              </div>

              {review.images.length > 0 && (
                <div className="review-images">
                  <strong>Imágenes adjuntas:</strong>
                  <div className="images-grid">
                    {review.images.map((image, index) => (
                      <img key={index} src={image} alt={`Imagen ${index + 1}`} />
                    ))}
                  </div>
                </div>
              )}

              {review.status === 'pending' && (
                <div className="review-actions">
                  <CherryButton
                    variant="red"
                    size="small"
                    onClick={() => handleApprove(review.id)}
                  >
                    ✓ Aprobar
                  </CherryButton>
                  <CherryButton
                    variant="outline"
                    size="small"
                    onClick={() => handleReject(review.id)}
                  >
                    ✗ Rechazar
                  </CherryButton>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminReviews;
