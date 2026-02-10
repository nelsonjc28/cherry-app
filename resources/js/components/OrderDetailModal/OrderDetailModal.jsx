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

// Función helper para formatear el número de orden igual que en API externa
const formatOrderNumber = (order) => {
  const prefix = (order.is_advance_order ?? false) ? 'PD' : 'CD';
  const orderId = order.id || parseInt(order.orderNumber) || 0;
  return prefix + String(orderId).padStart(4, '0');
};

const OrderDetailModal = ({ order, isOpen, onClose, showReviewButton = false, isAdmin = false }) => {
  if (!isOpen || !order) return null;

  // Agrupar productos por product_id
  const groupedProducts = React.useMemo(() => {
    if (!order.items || order.items.length === 0) return [];
    const grouped = {};
    
    order.items.forEach((item) => {
      const productId = item.product_id;
      
      // Debug: Log de cada item
      
      
      if (!grouped[productId]) {
        // Usar la imagen del item solo si existe y no es placeholder
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
          barcodes: [],
          hasDiscount: item.has_discount || false,
          originalPrice: item.original_price || null,
          discountPercentage: item.discount_percentage || 0,
          price: item.price || 0
        };
        
      }
      
      // Si el grupo no tiene imagen y este item tiene una válida, actualizarla
      if (!grouped[productId].image && item.image && item.image !== '/images/catalogProductImages/Rectangle 4922.png') {
        grouped[productId].image = item.image;
      }
      
      grouped[productId].items.push(item);
      grouped[productId].totalQuantity += item.quantity || 0;
      grouped[productId].totalSubtotal += parseFloat(item.subtotal) || 0;
      
      // Actualizar información de precio original y descuento
      // Siempre actualizar el precio original si el item lo tiene
      if (item.original_price && item.original_price > 0) {
        // Actualizar precio original si no existe o si este es mayor
        if (!grouped[productId].originalPrice || item.original_price > grouped[productId].originalPrice) {
          grouped[productId].originalPrice = item.original_price;
        }
      }
      
      // Actualizar información de descuento si el item tiene descuento
      if (item.has_discount && item.original_price && item.original_price > item.price) {
        
        grouped[productId].hasDiscount = true;
        // Usar el precio original más alto si hay múltiples items con diferentes precios originales
        if (!grouped[productId].originalPrice || item.original_price > grouped[productId].originalPrice) {
          grouped[productId].originalPrice = item.original_price;
        }
        // Usar el porcentaje de descuento más alto
        if (item.discount_percentage > (grouped[productId].discountPercentage || 0)) {
          grouped[productId].discountPercentage = item.discount_percentage;
        }
        // Usar el precio con descuento (el más bajo)
        if (!grouped[productId].price || item.price < grouped[productId].price) {
          grouped[productId].price = item.price;
        }
      } else if (!grouped[productId].price && item.price) {
        // Si no hay descuento pero aún no tenemos precio, establecerlo
        grouped[productId].price = item.price;
      }
      
      // Asegurar que si algún item tiene descuento, el grupo lo refleje
      if (item.has_discount && item.original_price && item.original_price > item.price) {
        if (!grouped[productId].hasDiscount) {
          grouped[productId].hasDiscount = true;
        }
        if (!grouped[productId].originalPrice || item.original_price > grouped[productId].originalPrice) {
          grouped[productId].originalPrice = item.original_price;
        }
        if (item.discount_percentage > (grouped[productId].discountPercentage || 0)) {
          grouped[productId].discountPercentage = item.discount_percentage;
        }
      }
      
      if (item.size && !grouped[productId].sizes.includes(item.size)) {
        grouped[productId].sizes.push(item.size);
      }
      
      if (item.color && !grouped[productId].colors.includes(item.color)) {
        grouped[productId].colors.push(item.color);
      }
      
      // Solo agregar códigos de barras si es admin
      if (isAdmin && item.barcode && !grouped[productId].barcodes.includes(item.barcode)) {
        grouped[productId].barcodes.push(item.barcode);
      }
    });
    
    const result = Object.values(grouped);
    result.forEach(group => {
      
    });
    
    return result;
  }, [order.items]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Calcular total de piezas
  const totalPieces = groupedProducts.reduce((sum, group) => sum + group.totalQuantity, 0);

  return (
    <div className="order-detail-modal-overlay" onClick={handleBackdropClick}>
      <div className="order-detail-modal">
        <div className="order-detail-modal__header">
          <div className="print-header">
            <h1>Cherry</h1>
            <div className="order-number">Orden: {formatOrderNumber(order)}</div>
            <div className="order-date">Fecha: {order.date}</div>
          </div>
          <button 
            className="order-detail-modal__close-btn" 
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="order-detail-modal__content">
          <div className="order-info-grid">
            {/* Información del Cliente */}
            {(order.customerName || order.customerEmail || order.customerPhone) && (
              <div className="info-section">
                <h3>Información del Cliente</h3>
                <div className="order-detail-info">
                  {order.customerName && (
                    <div className="info-row">
                      <span className="info-label">Nombre:</span>
                      <span>
                        {order.customerFirstName || ''} 
                        {order.customerMiddleName ? ' ' + order.customerMiddleName : ''} 
                        {order.customerLastName ? ' ' + order.customerLastName : ''}
                        {!order.customerFirstName && !order.customerLastName && order.customerName}
                      </span>
                    </div>
                  )}
                  {order.customerEmail && (
                    <div className="info-row">
                      <span className="info-label">Email:</span>
                      <span>{order.customerEmail}</span>
                    </div>
                  )}
                  {order.customerPhone && (
                    <div className="info-row">
                      <span className="info-label">Teléfono:</span>
                      <span>{order.customerPhone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dirección de envío */}
            {order.address && (
              <div className="info-section">
                <h3>Dirección de Envío</h3>
                <div className="order-detail-info">
                  {order.address.street_address && (
                    <div className="info-row">
                      <span className="info-label">Dirección:</span>
                      <span>{order.address.street_address}</span>
                    </div>
                  )}
                  {order.address.colonia && (
                    <div className="info-row">
                      <span className="info-label">Colonia:</span>
                      <span>{order.address.colonia}</span>
                    </div>
                  )}
                  {order.address.municipality && (
                    <div className="info-row">
                      <span className="info-label">Municipio:</span>
                      <span>{order.address.municipality}</span>
                    </div>
                  )}
                  {order.address.city && (
                    <div className="info-row">
                      <span className="info-label">Ciudad:</span>
                      <span>{order.address.city}</span>
                    </div>
                  )}
                  {order.address.state && (
                    <div className="info-row">
                      <span className="info-label">Estado:</span>
                      <span>{order.address.state}</span>
                    </div>
                  )}
                  {order.address.postal_code && (
                    <div className="info-row">
                      <span className="info-label">Código Postal:</span>
                      <span>{order.address.postal_code}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Total de piezas */}
          <div className="total-pieces">
            Total de Piezas: {totalPieces}
          </div>


          {/* Información adicional (Estado, Pago, Surtido) */}
          <div className="order-info-grid">
            {/* Estado y Total */}
            <div className="info-section">
              <h3>Información General</h3>
              <div className="order-detail-info">
                <div className="info-row">
                  <span className="info-label">Estado:</span>
                  <span className={`status-badge status-badge--${order.statusColor}`}>
                    {order.status}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Total:</span>
                  <span className="value total-amount">
                    ${(parseFloat(order.totalAmount) || 0).toFixed(2)}
                  </span>
                </div>
                {/* Información de crédito si se pagó con crédito */}
                {order.paid_with_credit && (
                  <>
                    {order.amount_paid > 0 && (
                      <div className="info-row" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e0e0e0' }}>
                        <span className="info-label">Monto pagado con dinero:</span>
                        <span className="value" style={{ color: '#28a745', fontWeight: '600' }}>
                          ${(parseFloat(order.amount_paid || 0)).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {(order.credit_used > 0 || order.amount_pending > 0) && (
                      <div className="info-row info-row--full-width" style={{ marginTop: order.amount_paid > 0 ? '8px' : '12px', paddingTop: order.amount_paid > 0 ? '0' : '12px', borderTop: order.amount_paid > 0 ? 'none' : '1px solid #e0e0e0' }}>
                        <span className="info-label" style={{ fontWeight: '700', fontSize: '14px' }}>Crédito pendiente:</span>
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

            {/* Información de pago */}
            {(order.paymentMethod || order.paymentId) && (
              <div className="info-section">
                <h3>Información de Pago</h3>
                <div className="order-detail-info">
                  {order.paymentMethod && (
                    <div className="info-row">
                      <span className="info-label">Método de pago:</span>
                      <span>{order.paymentMethod}</span>
                    </div>
                  )}
                  {order.paymentId && (
                    <div className="info-row">
                      <span className="info-label">ID de pago:</span>
                      <span>{order.paymentId}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Información de surtido (solo admin) */}
            {isAdmin && (
              <div className="info-section">
                <h3>Información de Surtido</h3>
                <div className="order-detail-info">
                  <div className="info-row">
                    <span className="info-label">Preparado:</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={order.is_prepared || false}
                        onChange={async (e) => {
                          try {
                            const token = localStorage.getItem('token');
                            const response = await fetch(`/api/admin/orders/${order.id}/update-prepared`, {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ is_prepared: e.target.checked })
                            });
                            if (response.ok) {
                              const data = await response.json();
                              if (data.success) {
                                order.is_prepared = e.target.checked;
                                if (window.showToast) {
                                  window.showToast('Estado de preparado actualizado', 'success');
                                }
                              }
                            }
                          } catch (error) {
                            if (window.showToast) {
                              window.showToast('Error al actualizar estado de preparado', 'error');
                            }
                          }
                        }}
                      />
                      <span>{order.is_prepared ? 'Sí' : 'No'}</span>
                    </label>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Número de guía:</span>
                    <input
                      type="text"
                      value={order.tracking_number || ''}
                      placeholder="Ingrese el número de guía"
                      style={{ 
                        padding: '6px 10px', 
                        border: '1px solid #ddd', 
                        borderRadius: '4px',
                        width: '100%',
                        maxWidth: '300px'
                      }}
                      onBlur={async (e) => {
                        const newTrackingNumber = e.target.value.trim();
                        if (newTrackingNumber !== (order.tracking_number || '')) {
                          try {
                            const token = localStorage.getItem('token');
                            const response = await fetch(`/api/admin/orders/${order.id}/update-tracking`, {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ tracking_number: newTrackingNumber || null })
                            });
                            if (response.ok) {
                              const data = await response.json();
                              if (data.success) {
                                order.tracking_number = newTrackingNumber || null;
                                if (window.showToast) {
                                  window.showToast('Número de guía actualizado', 'success');
                                }
                              }
                            }
                          } catch (error) {
                            if (window.showToast) {
                              window.showToast('Error al actualizar número de guía', 'error');
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Productos */}
          <div className="products-section">
            <h2>Productos</h2>
            <div className="order-detail-products">
              {groupedProducts.map((group, index) => (
                <div key={group.product_id || index} className="product-item">
                  {group.image && group.image !== '/images/catalogProductImages/Rectangle 4922.png' && (
                    <img 
                      src={group.image} 
                      alt={group.title}
                      className="product-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <div className="product-details">
                    <div>
                      <div className="product-name">{group.title}</div>
                      <div className="product-id">ID: {group.product_id}</div>
                    </div>
                    <div className="product-quantity">
                      Cantidad: {group.totalQuantity}
                    </div>
                    <div className="product-price">
                      Precio: ${(group.price || (group.items && group.items[0]?.price) || 0).toFixed(2)}
                    </div>
                    <div className="product-subtotal">
                      ${group.totalSubtotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen de precios */}
          <div className="summary-section">
            <div className="summary-row">
              <span className="summary-label">Subtotal:</span>
              <span>${groupedProducts.reduce((sum, group) => sum + group.totalSubtotal, 0).toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Envío:</span>
              {parseFloat(order.shipping_cost || 0) === 0 ? (
                <span style={{ color: '#28a745', fontWeight: 'bold' }}>Gratis</span>
              ) : (
                <span>${(parseFloat(order.shipping_cost || 0)).toFixed(2)}</span>
              )}
            </div>
            <div className="summary-row summary-total">
              <span>Total:</span>
              <span>${(parseFloat(order.totalAmount) || 0).toFixed(2)}</span>
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
          <CherryButton 
            variant="red" 
            size="medium"
            onClick={() => {
              // Obtener el token de autenticación
              const token = localStorage.getItem('token');
              // Abrir la vista de impresión en una nueva ventana con el token como parámetro
              const url = `/api/orders/${order.id}/print${token ? `?token=${encodeURIComponent(token)}` : ''}`;
              window.open(url, '_blank');
            }}
          >
            🖨️ Imprimir Orden
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