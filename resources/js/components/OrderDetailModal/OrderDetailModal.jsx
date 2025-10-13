import React from 'react';
import PropTypes from 'prop-types';
import CherryButton from '../CherryButton/CherryButton';
import './OrderDetailModal.css';

const OrderDetailModal = ({ order, isOpen, onClose }) => {
  if (!isOpen || !order) return null;


  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="order-detail-modal-overlay" onClick={handleBackdropClick}>
      <div className="order-detail-modal">
        <div className="order-detail-modal__header">
          <h2>Detalle del Pedido</h2>
          <button 
            className="order-detail-modal__close-btn" 
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="order-detail-modal__content">
          {/* Información general de la orden */}
          <div className="order-detail-section">
            <h3>Información General</h3>
            <div className="order-detail-info">
              <div className="info-row">
                <span className="label">Número de pedido:</span>
                <span className="value">{order.orderNumber}</span>
              </div>
              <div className="info-row">
                <span className="label">Fecha:</span>
                <span className="value">{order.date}</span>
              </div>
              <div className="info-row">
                <span className="label">Estado:</span>
                <span className={`status-badge status-badge--${order.statusColor}`}>
                  {order.status}
                </span>
              </div>
              <div className="info-row">
                <span className="label">Total:</span>
                <span className="value total-amount">
                  ${(parseFloat(order.totalAmount) || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Productos */}
          <div className="order-detail-section">
            <h3>Productos ({order.items?.length || 0})</h3>
            <div className="order-detail-products">
              {order.items?.map((item, index) => (
                  <div key={item.id || index} className="product-item">
                    <div className="product-item__image">
                      <img 
                        src={item.image || '/images/catalogProductImages/Rectangle 4922.png'} 
                        alt={item.title || 'Producto'}
                        onError={(e) => {
                          e.target.src = '/images/catalogProductImages/Rectangle 4922.png';
                        }}
                      />
                    </div>
                    <div className="product-item__details">
                      <h4 className="product-item__title">{item.title || 'Producto'}</h4>
                      <div className="product-item__info">
                        <div className="info-row">
                          <span className="label">ID:</span>
                          <span className="value">{item.product_id}</span>
                        </div>
                        <div className="info-row">
                          <span className="label">Cantidad:</span>
                          <span className="value">{item.quantity}</span>
                        </div>
                        <div className="info-row">
                          <span className="label">Precio unitario:</span>
                          <span className="value">${(parseFloat(item.price) || 0).toFixed(2)}</span>
                        </div>
                        <div className="info-row">
                          <span className="label">Subtotal:</span>
                          <span className="value subtotal">
                            ${(parseFloat(item.subtotal) || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          </div>

          {/* Dirección de envío */}
          {order.address && (
            <div className="order-detail-section">
              <h3>Dirección de Envío</h3>
              <div className="order-detail-address">
                <div className="address-info">
                  <div className="info-row">
                    <span className="label">Calle:</span>
                    <span className="value">{order.address.street}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Ciudad:</span>
                    <span className="value">{order.address.city}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Estado:</span>
                    <span className="value">{order.address.state}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Código postal:</span>
                    <span className="value">{order.address.postal_code}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Resumen de precios */}
          <div className="order-detail-section">
            <h3>Resumen</h3>
            <div className="order-detail-summary">
              <div className="summary-row">
                <span className="label">Subtotal productos:</span>
                <span className="value">
                  ${order.items?.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="summary-row">
                <span className="label">Envío:</span>
                <span className="value">$0.00</span>
              </div>
              <div className="summary-row total-row">
                <span className="label">Total:</span>
                <span className="value">${(parseFloat(order.totalAmount) || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="order-detail-modal__footer">
          <CherryButton 
            variant="outline" 
            size="medium" 
            onClick={onClose}
          >
            Cerrar
          </CherryButton>
          {(order.status === 'Enviado' || order.status === 'enviado') && order.items?.[0] && !order.items[0].hasReview && (
            <CherryButton 
              variant="red" 
              size="medium"
              onClick={() => {
                // Navegar a escribir reseña
                window.location.href = `/escribir-resena/${order.id}/${order.items?.[0]?.product_id}`;
              }}
            >
              ⭐ Calificar y comentar
            </CherryButton>
          )}
          {(order.status === 'Enviado' || order.status === 'enviado') && order.items?.[0] && order.items[0].hasReview && (
            <div className="order-detail__reviewed">
              <span className="reviewed-text">✅ Ya calificado</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

OrderDetailModal.propTypes = {
  order: PropTypes.object,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default OrderDetailModal;