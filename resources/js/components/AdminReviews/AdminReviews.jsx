import React, { useState, useEffect } from 'react';
import StarRating from '../StarRating/StarRating';
import CherryButton from '../CherryButton/CherryButton';
import api from '../../config/axios';
import Swal from 'sweetalert2';
import './AdminReviews.css';

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [error, setError] = useState(null);

  // Load reviews from API
  const loadReviews = async (status = null) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (status && status !== 'all') {
        params.status = status;
      }
      
      const response = await api.get('/admin/reviews', { params });
      
      if (response.data.success) {
        setReviews(response.data.reviews);
        setCounts(response.data.counts);
      } else {
        setError('Error al cargar las reseñas');
      }
    } catch (err) {
      console.error('Error loading reviews:', err);
      setError('Error de conexión al cargar las reseñas');
      if (window.showToast) {
        window.showToast('Error al cargar las reseñas', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews(filter === 'all' ? null : filter);
  }, [filter]);

  // Handle approve review
  const handleApprove = async (reviewId) => {
    try {
      const response = await api.post(`/admin/reviews/${reviewId}/approve`);
      
      if (response.data.success) {
        if (window.showToast) {
          window.showToast('Reseña aprobada exitosamente', 'success');
        }
        // Reload reviews to get updated data
        loadReviews(filter === 'all' ? null : filter);
      } else {
        if (window.showToast) {
          window.showToast('Error al aprobar la reseña', 'error');
        }
      }
    } catch (err) {
      console.error('Error approving review:', err);
      if (window.showToast) {
        window.showToast('Error de conexión al aprobar la reseña', 'error');
      }
    }
  };

  // Handle reject review
  const handleReject = async (reviewId) => {
    try {
      const response = await api.post(`/admin/reviews/${reviewId}/reject`);
      
      if (response.data.success) {
        if (window.showToast) {
          window.showToast('Reseña rechazada exitosamente', 'success');
        }
        // Reload reviews to get updated data
        loadReviews(filter === 'all' ? null : filter);
      } else {
        if (window.showToast) {
          window.showToast('Error al rechazar la reseña', 'error');
        }
      }
    } catch (err) {
      console.error('Error rejecting review:', err);
      if (window.showToast) {
        window.showToast('Error de conexión al rechazar la reseña', 'error');
      }
    }
  };

  // Handle delete review
  const handleDelete = async (reviewId) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: '¿Quieres eliminar esta reseña? Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const response = await api.delete(`/admin/reviews/${reviewId}`);
      
      if (response.data.success) {
        if (window.showToast) {
          window.showToast('Reseña eliminada exitosamente', 'success');
        }
        // Reload reviews to get updated data
        loadReviews(filter === 'all' ? null : filter);
      } else {
        if (window.showToast) {
          window.showToast('Error al eliminar la reseña', 'error');
        }
      }
    } catch (err) {
      console.error('Error deleting review:', err);
      if (window.showToast) {
        window.showToast('Error de conexión al eliminar la reseña', 'error');
      }
    }
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

  if (error) {
    return (
      <div className="admin-reviews-error">
        <p>{error}</p>
        <button onClick={() => loadReviews(filter === 'all' ? null : filter)}>
          Reintentar
        </button>
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
          Pendientes ({counts.pending || 0})
        </button>
        <button 
          className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
          onClick={() => setFilter('approved')}
        >
          Aprobadas ({counts.approved || 0})
        </button>
        <button 
          className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
          onClick={() => setFilter('rejected')}
        >
          Rechazadas ({counts.rejected || 0})
        </button>
        <button 
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todas ({counts.all || 0})
        </button>
      </div>

      {/* Reviews List */}
      <div className="admin-reviews-list">
        {reviews.length === 0 ? (
          <div className="no-reviews">
            <p>No hay reseñas {filter === 'all' ? '' : filter === 'pending' ? 'pendientes' : filter === 'approved' ? 'aprobadas' : 'rechazadas'}</p>
          </div>
        ) : (
          reviews.map(review => (
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
                <StarRating 
                  rating={review.rating} 
                  readonly={true} 
                  showText={false} 
                  size="medium"
                />
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

              <div className="review-actions">
                {review.status === 'pending' && (
                  <>
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
                  </>
                )}
                <CherryButton
                  variant="outline"
                  size="small"
                  onClick={() => handleDelete(review.id)}
                  style={{ marginLeft: review.status === 'pending' ? '8px' : '0' }}
                >
                  🗑️ Eliminar
                </CherryButton>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminReviews;
