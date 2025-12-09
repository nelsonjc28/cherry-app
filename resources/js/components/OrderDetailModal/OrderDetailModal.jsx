import React from 'react';
import PropTypes from 'prop-types';
import CherryButton from '../CherryButton/CherryButton';
import './OrderDetailModal.css';

const OrderDetailModal = ({ order, isOpen, onClose, showReviewButton = false }) => {
  if (!isOpen || !order) return null;

  // Agrupar productos por product_id
  const groupedProducts = React.useMemo(() => {
    if (!order.items || order.items.length === 0) return [];
    
    const grouped = {};
    
    order.items.forEach((item) => {
      const productId = item.product_id;
      
      if (!grouped[productId]) {
        // Solo usar imagen si existe y no es el placeholder
        const validImage = item.image && item.image !== '/images/catalogProductImages/Rectangle 4922.png' 
          ? item.image 
          : null;
        
        grouped[productId] = {
          product_id: productId,
          title: item.title || 'Producto',
          image: validImage,
          items: [],
          totalQuantity: 0,
          totalSubtotal: 0,
          sizes: [],
          colors: [],
          barcodes: []
        };
      }
      
      // Si el grupo no tiene imagen y este item tiene una válida, actualizarla
      if (!grouped[productId].image && item.image && item.image !== '/images/catalogProductImages/Rectangle 4922.png') {
        grouped[productId].image = item.image;
      }
      
      grouped[productId].items.push(item);
      grouped[productId].totalQuantity += item.quantity || 0;
      grouped[productId].totalSubtotal += parseFloat(item.subtotal) || 0;
      
      if (item.size && !grouped[productId].sizes.includes(item.size)) {
        grouped[productId].sizes.push(item.size);
      }
      
      if (item.color && !grouped[productId].colors.includes(item.color)) {
        grouped[productId].colors.push(item.color);
      }
      
      if (item.barcode && !grouped[productId].barcodes.includes(item.barcode)) {
        grouped[productId].barcodes.push(item.barcode);
      }
    });
    
    return Object.values(grouped);
  }, [order.items]);

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

          {/* Información del cliente */}
          <div className="order-detail-section">
            <h3>Cliente</h3>
            <div className="order-detail-info">
              <div className="info-row">
                <span className="label">Nombre:</span>
                <span className="value">{order.customerName || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="label">Email:</span>
                <span className="value">{order.customerEmail || 'N/A'}</span>
              </div>
              {order.paymentMethod && (
                <div className="info-row">
                  <span className="label">Método de pago:</span>
                  <span className="value">{order.paymentMethod}</span>
                </div>
              )}
              {order.paymentId && (
                <div className="info-row">
                  <span className="label">ID de pago:</span>
                  <span className="value">{order.paymentId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Productos */}
          <div className="order-detail-section">
            <h3>Productos ({groupedProducts.length})</h3>
            <div className="order-detail-products">
              {groupedProducts.map((group, index) => (
                <div key={group.product_id || index} className="product-item">
                  {group.image && group.image !== '/images/catalogProductImages/Rectangle 4922.png' && (
                    <div className="product-item__image">
                      <img 
                        src={group.image} 
                        alt={group.title}
                        onError={(e) => {
                          e.target.parentElement.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="product-item__details">
                    <h4 className="product-item__title">{group.title}</h4>
                    <div className="product-item__info">
                      <div className="info-row">
                        <span className="label">ID Producto:</span>
                        <span className="value">{group.product_id}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Cantidad total:</span>
                        <span className="value">{group.totalQuantity} unidades</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Subtotal:</span>
                        <span className="value subtotal">
                          ${group.totalSubtotal.toFixed(2)}
                        </span>
                      </div>
                      {group.sizes.length > 0 && (
                        <div className="info-row">
                          <span className="label">Tallas:</span>
                          <span className="value">{group.sizes.join(', ')}</span>
                        </div>
                      )}
                      {group.colors.length > 0 && (
                        <div className="info-row">
                          <span className="label">Colores:</span>
                          <span className="value">{group.colors.join(', ')}</span>
                        </div>
                      )}
                      {group.barcodes.length > 0 && (
                        <div className="info-row">
                          <span className="label">Códigos de barras:</span>
                          <span className="value">{group.barcodes.join(', ')}</span>
                        </div>
                      )}
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
                  ${groupedProducts.reduce((sum, group) => sum + group.totalSubtotal, 0).toFixed(2)}
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
          {showReviewButton && (order.status === 'Enviado' || order.status === 'enviado') && order.items?.[0] && !order.items[0].hasReview && (
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
          {showReviewButton && (order.status === 'Enviado' || order.status === 'enviado') && order.items?.[0] && order.items[0].hasReview && (
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
  onClose: PropTypes.func.isRequired,
  showReviewButton: PropTypes.bool
};

export default OrderDetailModal;