import React, { useState } from 'react';
import PropTypes from 'prop-types';
import CherryButton from '../CherryButton/CherryButton';
import api from '../../config/axios';
import './OrderDetailModal.css';
import { buildStreetWithNumbers } from '../../utils/addressDisplay';

/** URL de checkout (MP devuelve init_point o podemos armar redirect con preference_id). */
const mercadoPagoUrlFromPayload = (d) => {
  if (!d || typeof d !== 'object') return null;
  return [
    d.redirect_url,
    d.init_point,
    d.sandbox_init_point,
    d.payment_url,
    d.sandbox_payment_url,
  ].find((u) => typeof u === 'string' && u.trim().length > 0) || null;
};

const RetryRemainderPaymentButton = ({ orderId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRetryPayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post(`/payment/retry-remainder/${orderId}`);

      if (response.data.success) {
        const paymentUrl = mercadoPagoUrlFromPayload(response.data.data);
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

/** Orden completa pendiente en MP (incluye la parte “faltante” de un split crédito + MP). */
const PayPendingOrderButton = ({ orderId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePay = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post(`/payment/pay-pending-order/${orderId}`);

      if (response.data.success) {
        const paymentUrl = mercadoPagoUrlFromPayload(response.data.data);
        if (paymentUrl) {
          window.location.href = paymentUrl;
        } else {
          setError('No se pudo obtener la URL de pago');
        }
      } else {
        setError(response.data.message || 'Error al crear la preferencia de pago');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar el pago');
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
        onClick={handlePay}
        disabled={loading}
        style={{ width: '100%' }}
      >
        {loading ? 'Abriendo Mercado Pago…' : 'Pagar con Mercado Pago'}
      </CherryButton>
    </div>
  );
};

PayPendingOrderButton.propTypes = {
  orderId: PropTypes.number.isRequired
};

// Función helper para formatear el número de orden igual que en API externa
const formatOrderNumber = (order) => {
  const prefix = (order.is_advance_order ?? false) ? 'PD' : 'CD';
  const orderId = order.id || parseInt(order.orderNumber) || 0;
  return prefix + String(orderId).padStart(4, '0');
};

/** Agrupa ítems por producto; el desglose talla/color/cantidad va en la misma fila. */
const groupOrderItemsByProduct = (items) => {
  if (!items?.length) return [];
  const map = new Map();

  items.forEach((item, idx) => {
    const pid = String(item.product_id ?? `row-${idx}`);
    const validImage =
      item.image && item.image !== '/images/catalogProductImages/Rectangle 4922.png'
        ? item.image
        : null;

    if (!map.has(pid)) {
      map.set(pid, {
        key: pid,
        productId: item.product_id,
        title: item.title || item.name || 'Producto',
        image: validImage,
        variants: [],
        totalQuantity: 0,
        totalSubtotal: 0
      });
    }

    const row = map.get(pid);
    if (!row.image && validImage) row.image = validImage;

    const qty = item.quantity || 0;
    const price = parseFloat(item.price) || 0;
    const subtotal = parseFloat(item.subtotal) || 0;
    const orig =
      item.original_price != null ? parseFloat(item.original_price) : null;

    row.variants.push({
      key: item.id != null ? String(item.id) : `${pid}-v-${idx}`,
      color: item.color || null,
      size: item.size || null,
      quantity: qty,
      price,
      subtotal,
      hasDiscount: !!item.has_discount,
      originalPrice: orig,
      discountPercentage: item.discount_percentage || 0,
      discountAmount: parseFloat(item.discount_amount) || 0,
      finalUnitPrice: parseFloat(item.final_unit_price ?? item.price) || 0,
      productLabels: Array.isArray(item.product_labels) ? item.product_labels : [],
      descPromo: item.desc_promo ?? null,
      barcode: item.barcode || null
    });
    row.totalQuantity += qty;
    row.totalSubtotal += subtotal;
  });

  return Array.from(map.values());
};

const formatMoney = (value) => `$${(parseFloat(value) || 0).toFixed(2)}`;

const OrderDetailModal = ({ order, isOpen, onClose, showReviewButton = false, isAdmin = false }) => {
  if (!isOpen || !order) return null;

  const groupedRows = React.useMemo(
    () => groupOrderItemsByProduct(order.items),
    [order.items]
  );

  const shippingMethodLabel =
    order.shipping_method_label ||
    (order.address ? 'Envío a Domicilio' : 'Retiro en Tienda');
  const isPickup = shippingMethodLabel === 'Retiro en Tienda';

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const totalPieces = groupedRows.reduce((sum, row) => sum + row.totalQuantity, 0);
  const linesSubtotalSum = groupedRows.reduce((sum, row) => sum + row.totalSubtotal, 0);
  const shippingNum = parseFloat(order.shipping_cost) || 0;
  const totalNum = parseFloat(order.totalAmount) || 0;
  const netMerchandise = Math.max(0, totalNum - shippingNum);
  // Si el total registrado no coincide con líneas bruto + envío (descuentos globales / split crédito–MP), el resumen usa mercancía neta.
  const summarySubtotal =
    Math.abs(linesSubtotalSum + shippingNum - totalNum) > 0.05 ? netMerchandise : linesSubtotalSum;

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

            {/* Método de entrega (admin / cliente) */}
            <div className="info-section">
              <h3>Método de entrega</h3>
              <div className="order-detail-info">
                <div className="info-row">
                  <span className="info-label">Tipo:</span>
                  <span>{shippingMethodLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {isPickup && (
            <div className="order-detail-modal__pickup-banner" role="status">
              Cliente retira en sucursal
            </div>
          )}

          {!isPickup && order.address && (
            <div className="order-info-grid order-info-grid--delivery-address">
              <div className="info-section" style={{ gridColumn: '1 / -1' }}>
                <h3>Dirección de envío</h3>
                <div className="order-detail-info">
                  {order.address.full_address && (
                    <div className="info-row info-row--full-width">
                      <span className="info-label">Dirección completa:</span>
                      <span>{order.address.full_address}</span>
                    </div>
                  )}
                  {(order.address.street_address || order.address.street_number_ext || order.address.street_number_int) && (
                    <div className="info-row">
                      <span className="info-label">Calle y número:</span>
                      <span>{buildStreetWithNumbers(order.address) || order.address.street_address}</span>
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
            </div>
          )}

          {!isPickup && !order.address && (
            <div className="order-detail-modal__no-delivery-address">
              Envío a domicilio: no hay dirección registrada en esta orden.
            </div>
          )}

          {/* Total de piezas */}
          <div className="total-pieces">
            Total de Piezas: {totalPieces}
          </div>

          {isAdmin &&
            order.paid_with_credit &&
            /credito|crédito/i.test(String(order.payment_method || order.paymentMethod || '')) &&
            ['pendiente_pago', 'pending_payment'].includes(
              String(order.statusRaw || '').toLowerCase()
            ) && (
              <div className="order-detail-modal__credit-liquidation-notice" role="note">
                Pago mediante Crédito Cherry — Pendiente de liquidación.
              </div>
            )}

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
                    {order.amount_pending > 0 && order.statusRaw === 'pendiente_pago' && (
                      <div className="info-row" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
                        <RetryRemainderPaymentButton orderId={order.id} />
                      </div>
                    )}
                  </>
                )}
                {/* Split crédito + MP: la orden del faltante no lleva paid_with_credit pero sí pendiente_pago */}
                {!order.paid_with_credit &&
                  order.statusRaw === 'pendiente_pago' &&
                  parseFloat(order.amount_pending ?? order.totalAmount ?? 0) > 0.01 && (
                    <div className="info-row" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
                      <PayPendingOrderButton orderId={order.id} />
                    </div>
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
              {groupedRows.map((row) => {
                const unitKeys = [...new Set(row.variants.map((v) => v.price.toFixed(2)))];
                const singleUnitPrice = unitKeys.length === 1 ? parseFloat(unitKeys[0], 10) : null;
                const anyDiscount = row.variants.some(
                  (v) => v.hasDiscount && v.originalPrice != null && v.originalPrice > v.price
                );
                const rowLabels = [...new Set(row.variants.flatMap((v) => v.productLabels || []))];

                return (
                  <div key={row.key} className="product-item">
                    {row.image && (
                      <img
                        src={row.image}
                        alt={row.title}
                        className="product-image"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="product-details product-details--grouped">
                      <div className="product-details__main">
                        <div className="product-name">{row.title}</div>
                        <div className="product-id">ID: {row.productId}</div>
                        {rowLabels.length > 0 && (
                          <div className="product-tags">
                            {rowLabels.map((label) => (
                              <span key={`${row.key}-${label}`} className={`product-tag product-tag--${label.toLowerCase().replace('ó', 'o').replace('á', 'a')}`}>
                                {label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="product-variant-col">
                        <span className="product-variant-col__label">Color</span>
                        <div className="product-variant-col__lines">
                          {row.variants.map((v) => (
                            <div key={`${v.key}-c`}>{v.color || '—'}</div>
                          ))}
                        </div>
                      </div>
                      <div className="product-variant-col">
                        <span className="product-variant-col__label">Talla</span>
                        <div className="product-variant-col__lines">
                          {row.variants.map((v) => (
                            <div key={`${v.key}-s`}>{v.size || '—'}</div>
                          ))}
                        </div>
                      </div>
                      <div className="product-variant-col">
                        <span className="product-variant-col__label">Cantidad</span>
                        <div className="product-variant-col__lines">
                          {row.variants.map((v) => (
                            <div key={`${v.key}-q`}>{v.quantity}</div>
                          ))}
                        </div>
                      </div>
                      <div className="product-quantity">
                        <strong>Total pzas:</strong> {row.totalQuantity}
                      </div>
                      <div className="product-price">
                        {singleUnitPrice != null ? (
                          <>
                            {anyDiscount ? (
                              <span style={{ fontSize: '11px', color: '#666', display: 'block' }}>
                                (mismo precio en todas las líneas)
                              </span>
                            ) : null}
                            <span>Precio final: {formatMoney(singleUnitPrice)}</span>
                          </>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#555' }}>Varios precios</span>
                        )}
                      </div>
                      <div className="product-subtotal">${row.totalSubtotal.toFixed(2)}</div>
                      <div className="product-price-breakdown">
                        <div className="product-item__breakdown-table-wrapper">
                          <table className="product-item__breakdown-table">
                            <thead>
                              <tr>
                                <th>Variante</th>
                                <th>Precio original</th>
                                <th>Descuento aplicado</th>
                                <th>Precio final pagado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.variants.map((v) => (
                                <tr key={`${v.key}-price-breakdown`}>
                                  <td className="product-price-breakdown__variant">
                                    {(v.color || '—')} / {(v.size || '—')} x {v.quantity}
                                  </td>
                                  <td>
                                    {v.originalPrice != null && v.originalPrice > 0
                                      ? formatMoney(v.originalPrice)
                                      : formatMoney(v.finalUnitPrice)}
                                  </td>
                                  <td>
                                    {formatMoney(v.discountAmount)}
                                    {v.discountPercentage > 0 ? ` (${v.discountPercentage}%)` : ''}
                                  </td>
                                  <td>{formatMoney(v.finalUnitPrice)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resumen de precios */}
          <div className="summary-section">
            <div className="summary-row">
              <span className="summary-label">Subtotal:</span>
              <span>${summarySubtotal.toFixed(2)}</span>
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