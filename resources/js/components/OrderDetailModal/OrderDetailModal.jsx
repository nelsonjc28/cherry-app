import React, { useState } from 'react';
import PropTypes from 'prop-types';
import CherryButton from '../CherryButton/CherryButton';
import api from '../../config/axios';
import './OrderDetailModal.css';

const RetryRemainderPaymentButton = ({ orderId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRetryPayment = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post(`/payment/retry-remainder/${orderId}`);
      
      if (response.data.success) {
        // Redirigir a la URL de pago de MercadoPago
        const paymentUrl = response.data.data.payment_url || response.data.data.sandbox_payment_url;
        if (paymentUrl) {
          window.location.href = paymentUrl;
        } else {
          setError('No se pudo obtener la URL de pago');
        }
      } else {
        setError(response.data.message || 'Error al crear la preferencia de pago');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al reintentar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {error && (
        <div style={{ color: '#d32f2f', marginBottom: '8px', fontSize: '14px' }}>
          {error}
        </div>
      )}
      <CherryButton
        variant="red"
        size="medium"
        onClick={handleRetryPayment}
        disabled={loading}
        style={{ width: '100%' }}
      >
        {loading ? 'Creando pago...' : 'Reintentar Pago del Saldo Pendiente'}
      </CherryButton>
    </div>
  );
};

RetryRemainderPaymentButton.propTypes = {
  orderId: PropTypes.number.isRequired
};

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
              {/* Información de crédito si se pagó con crédito */}
              {order.paid_with_credit && (
                <>
                  {order.amount_paid > 0 && (
                    <div className="info-row" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e0e0e0' }}>
                      <span className="label">Monto pagado con dinero:</span>
                      <span className="value" style={{ color: '#28a745', fontWeight: '600' }}>
                        ${(parseFloat(order.amount_paid || 0)).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {(order.credit_used > 0 || order.amount_pending > 0) && (
                    <div className="info-row" style={{ marginTop: order.amount_paid > 0 ? '8px' : '12px', paddingTop: order.amount_paid > 0 ? '0' : '12px', borderTop: order.amount_paid > 0 ? 'none' : '1px solid #e0e0e0' }}>
                      <span className="label" style={{ fontWeight: '700', fontSize: '14px' }}>Saldo pendiente a cancelar:</span>
                      <span className="value" style={{ color: '#d32f2f', fontWeight: '700', fontSize: '18px' }}>
                        ${((parseFloat(order.credit_used || 0)) + (parseFloat(order.amount_pending || 0))).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {order.amount_pending > 0 && order.status === 'pendiente_pago' && (
                    <div className="info-row" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
                      <RetryRemainderPaymentButton orderId={order.id} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Información del Cliente */}
          {(order.customerName || order.customerEmail || order.customerPhone) && (
          <div className="order-detail-section">
              <h3>Información del Cliente</h3>
              <div className="order-detail-info">
                {order.customerName && (
                        <div className="info-row">
                    <span className="label">Nombre completo:</span>
                    <span className="value">
                      {order.customerFirstName || ''} 
                      {order.customerMiddleName ? ' ' + order.customerMiddleName : ''} 
                      {order.customerLastName ? ' ' + order.customerLastName : ''}
                      {!order.customerFirstName && !order.customerLastName && order.customerName}
                          </span>
                        </div>
                )}
                {order.customerEmail && (
                  <div className="info-row">
                    <span className="label">Email:</span>
                    <span className="value">{order.customerEmail}</span>
                      </div>
                )}
                {order.customerPhone && (
                  <div className="info-row">
                    <span className="label">Teléfono:</span>
                    <span className="value">{order.customerPhone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dirección de envío */}
          {order.address && (
            <div className="order-detail-section">
              <h3>Dirección de Envío</h3>
              <div className="order-detail-address">
                <div className="address-info">
                  {order.address.street_address && (
                    <div className="info-row">
                      <span className="label">Dirección (Calle y Número):</span>
                      <span className="value">{order.address.street_address}</span>
                    </div>
                  )}
                  {order.address.municipality && (
                  <div className="info-row">
                      <span className="label">Colonia/Asentamiento:</span>
                      <span className="value">{order.address.municipality}</span>
                  </div>
                  )}
                  {order.address.city && (
                  <div className="info-row">
                      <span className="label">Municipio:</span>
                    <span className="value">{order.address.city}</span>
                  </div>
                  )}
                  {order.address.state && (
                  <div className="info-row">
                    <span className="label">Estado:</span>
                    <span className="value">{order.address.state}</span>
                  </div>
                  )}
                  {order.address.country && (
                    <div className="info-row">
                      <span className="label">País:</span>
                      <span className="value">{order.address.country}</span>
                    </div>
                  )}
                  {order.address.additional_info && (
                    <div className="info-row">
                      <span className="label">Información adicional:</span>
                      <span className="value">{order.address.additional_info}</span>
                    </div>
                  )}
                  {order.address.postal_code && (
                  <div className="info-row">
                    <span className="label">Código postal:</span>
                    <span className="value">{order.address.postal_code}</span>
                  </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Información de pago */}
          {(order.paymentMethod || order.paymentId) && (
            <div className="order-detail-section">
              <h3>Información de Pago</h3>
              <div className="order-detail-info">
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
          )}

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
                    
                    {/* Tabla de desglose por talla y código de barras */}
                    {group.items && group.items.length > 0 && (
                      <div className="product-item__breakdown">
                        <h5 className="product-item__breakdown-title">Desglose por Talla y Código de Barras</h5>
                        <div className="product-item__breakdown-table-wrapper">
                          <table className="product-item__breakdown-table">
                            <thead>
                              <tr>
                                <th>Color</th>
                                <th>Talla</th>
                                <th>Cantidad</th>
                                <th>Código de Barras</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.items.map((item, itemIdx) => (
                                <tr key={itemIdx}>
                                  <td>{item.color || '-'}</td>
                                  <td>{item.size || '-'}</td>
                                  <td className="product-item__breakdown-quantity">{item.quantity || 0}</td>
                                  <td className="product-item__breakdown-barcode">
                                    {item.barcode ? (
                                      <span className="product-item__barcode">{item.barcode}</span>
                                    ) : (
                                      <span className="product-item__barcode-empty">-</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

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