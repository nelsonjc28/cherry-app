import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import './ReviewFormPage.css';
import CherryButton from '../components/CherryButton/CherryButton';
import StarRating from '../components/StarRating/StarRating';
import api from '../config/axios';

const ReviewFormPage = () => {
  const { orderId, productId } = useParams();
  const navigate = useNavigate();

  // Form state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [product, setProduct] = useState(null);
  const [canReview, setCanReview] = useState(false);

  // Verificar si el usuario puede escribir una reseña
  useEffect(() => {
    checkCanReview();
  }, [orderId, productId]);

  const checkCanReview = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/reviews/can-review/${orderId}/${productId}`);
      
      if (response.data.success) {
        setCanReview(response.data.can_review);
        setProduct(response.data.product);
        
        if (!response.data.can_review) {
          setError(response.data.message);
        }
      } else {
        setError(response.data.message || 'Error al verificar permisos');
      }
    } catch (err) {
      console.error('Error checking review permissions:', err);
      setError('Error de conexión al verificar permisos');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const maxImages = 5;
    
    if (images.length + files.length > maxImages) {
      alert(`Solo puedes subir máximo ${maxImages} imágenes`);
      return;
    }

    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImages(prev => [...prev, {
            id: Date.now() + Math.random(),
            file,
            preview: event.target.result,
            name: file.name
          }]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (imageId) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      if (window.showToast) {
        window.showToast('Por favor selecciona una calificación', 'error');
      }
      return;
    }
    
    if (comment.trim().length < 10) {
      if (window.showToast) {
        window.showToast('El comentario debe tener al menos 10 caracteres', 'error');
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('order_id', orderId);
      formData.append('product_id', productId);
      formData.append('rating', rating);
      formData.append('comment', comment);
      
      // Agregar imágenes si las hay
      images.forEach((image, index) => {
        formData.append(`images[${index}]`, image.file);
      });
      
      const response = await api.post('/reviews', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        setShowSuccess(true);
        
        if (window.showToast) {
          window.showToast('Reseña enviada exitosamente', 'success');
        }
        
        // Redirect after success
        setTimeout(() => {
          navigate('/perfil/mis-pedidos');
        }, 3000);
      } else {
        if (window.showToast) {
          window.showToast(response.data.message || 'Error al enviar la reseña', 'error');
        }
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      if (window.showToast) {
        window.showToast('Error de conexión al enviar la reseña', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  if (showSuccess) {
    return (
      <>
        <Helmet>
          <title>Reseña Enviada | Cherry Central</title>
        </Helmet>
        <div className="review-form-page">
          <div className="container">
            <div className="review-form__success">
              <div className="review-form__success-icon">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="32" r="32" fill="#4CAF50"/>
                  <path d="M20 32L28 40L44 24" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="review-form__success-title">¡Reseña enviada con éxito!</h1>
              <p className="review-form__success-message">
                Tu reseña está pendiente de aprobación. Una vez aprobada, aparecerá en la página del producto.
              </p>
              <p className="review-form__success-redirect">
                Serás redirigido a tus pedidos en unos segundos...
              </p>
              <CherryButton 
                variant="red" 
                onClick={() => navigate('/perfil/mis-pedidos')}
              >
                Volver a mis pedidos
              </CherryButton>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Escribir Reseña | Cherry Central</title>
        <meta name="description" content="Escribe una reseña para tu producto comprado" />
      </Helmet>

      <div className="review-form-page">
        <div className="container">
          <div className="review-form">
            <div className="review-form__header">
              <button 
                className="review-form__back-btn"
                onClick={() => navigate('/perfil/mis-pedidos')}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Volver
              </button>
              <h1 className="review-form__title">Escribir reseña</h1>
            </div>

            <div className="review-form__product">
              <img 
                src={mockProduct.image} 
                alt={mockProduct.title}
                className="review-form__product-image"
              />
              <div className="review-form__product-info">
                <h2 className="review-form__product-title">{mockProduct.title}</h2>
                <p className="review-form__product-order">Pedido #{mockProduct.orderNumber}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="review-form__form">
              {/* Rating Section */}
              <div className="review-form__section">
                <label className="review-form__label">
                  Calificación *
                </label>
                <StarRating 
                  rating={rating} 
                  onRatingChange={setRating}
                  size="lg"
                  showText={true}
                />
              </div>

              {/* Comment Section */}
              <div className="review-form__section">
                <label htmlFor="comment" className="review-form__label">
                  Comentario *
                </label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Comparte tu experiencia con este producto... (mínimo 10 caracteres)"
                  className="review-form__textarea"
                  rows="6"
                  maxLength="500"
                />
                <div className="review-form__char-count">
                  {comment.length}/500 caracteres
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="review-form__section">
                <label className="review-form__label">
                  Agregar fotos (opcional)
                </label>
                <p className="review-form__help-text">
                  Sube hasta 5 imágenes para mostrar tu experiencia con el producto
                </p>
                
                <div className="review-form__image-upload">
                  <input
                    type="file"
                    id="images"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="review-form__file-input"
                  />
                  <label htmlFor="images" className="review-form__upload-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Agregar fotos
                  </label>
                </div>

                {images.length > 0 && (
                  <div className="review-form__image-preview">
                    {images.map((image) => (
                      <div key={image.id} className="review-form__image-item">
                        <img 
                          src={image.preview} 
                          alt={image.name}
                          className="review-form__preview-image"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(image.id)}
                          className="review-form__remove-image"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="review-form__actions">
                <CherryButton
                  type="submit"
                  variant="red"
                  size="large"
                  fullWidth
                  disabled={isSubmitting || rating === 0 || comment.trim().length < 10}
                >
                  {isSubmitting ? 'Enviando reseña...' : 'Enviar reseña'}
                </CherryButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReviewFormPage;
