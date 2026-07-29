import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import CherryButton from '../CherryButton/CherryButton';
import api from '../../config/axios';
import { adminOrderService } from '../../services/api';
import useUserStore from '../../store/userStore';
import './OrderDetailModal.css';
import './mobile_order_detail.css';
import { buildStreetWithNumbers } from '../../utils/addressDisplay';
import { formatOrderNumberDisplay } from '../../utils/orderDisplayNumber';
import {
  getVolumeDiscountMainTier,
  getVolumeDiscountExtraPercent,
} from '../../utils/sellerVolumeDiscount';
import { getIconPath } from '../../utils/assetPaths';
import { orderQualifiesForExternalApi } from '../../utils/orderExternalApi';

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

const ResendExternalApiButton = ({ orderId, externalApiSent, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleResend = async () => {
    const confirmMsg = externalApiSent
      ? 'Este pedido ya está marcado como enviado a la API externa. ¿Reenviar de todos modos?'
      : '¿Enviar este pedido a la API externa del almacén?';
    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await adminOrderService.resendToExternalApi(orderId);

      if (response.data?.success) {
        if (window.showToast) {
          const toastType = response.data.api_confirmation === 'duplicado' ? 'warning' : 'success';
          let msg = response.data.message || 'Pedido enviado a la API externa';
          if (response.data.no_pedido) {
            msg += ` (noPedido: ${response.data.no_pedido})`;
          }
          window.showToast(msg, toastType);
        }
        onSuccess?.(response.data.order);
      } else {
        setError(response.data?.message || 'No se pudo enviar el pedido');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al enviar a la API externa');
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
        variant="outline"
        size="medium"
        onClick={handleResend}
        disabled={loading}
        style={{ width: '100%' }}
      >
        {loading ? 'Enviando…' : externalApiSent ? '↻ Reenviar a API externa' : '↑ Enviar a API externa'}
      </CherryButton>
    </div>
  );
};

ResendExternalApiButton.propTypes = {
  orderId: PropTypes.number.isRequired,
  externalApiSent: PropTypes.bool,
  onSuccess: PropTypes.func,
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

const normalizeOrderForDetail = (order) => {
  if (!order || typeof order !== 'object') return order;

  const sourceItems =
    Array.isArray(order.items) && order.items.length > 0
      ? order.items
      : Array.isArray(order.order_items) && order.order_items.length > 0
      ? order.order_items
      : Array.isArray(order.lines) && order.lines.length > 0
      ? order.lines
      : [];

  const normalizedItems = sourceItems.map((item) => {
    const producto = item.producto || item.product || item.product_data || null;
    const title = item.title || item.name || producto?.name || producto?.title || item.product_name || 'Producto';
    const image =
      item.image ||
      item.product_image ||
      producto?.image ||
      producto?.image_url ||
      producto?.thumbnail ||
      null;
    const productId = item.product_id ?? item.productId ?? producto?.id ?? null;
    const quantity = item.quantity ?? item.qty ?? item.cantidad ?? 0;
    const price = item.price ?? item.unit_price ?? item.unit_price_amount ?? 0;
    const subtotal = item.subtotal ?? item.total ?? item.line_total ?? price * quantity;

    return {
      ...item,
      title,
      image,
      product_id: productId,
      quantity,
      price,
      subtotal,
      barcode: item.barcode || item.sku || producto?.sku || null,
      color: item.color || item.color_name || item.product_color || null,
      size: item.size || item.size_name || item.talla || null,
      original_price: item.original_price ?? item.price ?? null,
      final_unit_price: item.final_unit_price ?? item.price ?? item.unit_price ?? 0,
      has_discount: item.has_discount ?? item.discount_amount > 0 ?? item.discount_percentage > 0 ?? false,
      discount_percentage: item.discount_percentage ?? 0,
      discount_amount: item.discount_amount ?? 0,
      product: producto ? {
        id: producto.id,
        title: title,
        image: image,
        sku: item.barcode || item.sku || producto?.sku || null,
        price: price,
        variants: producto?.variants || null,
      } : undefined,
    };
  });

  const user = order.user || order.buyer || null;
  const firstName = order.customerFirstName || order.customer_first_name || user?.first_name || user?.name?.split?.(' ')?.[0] || '';
  const lastName = order.customerLastName || order.customer_last_name || user?.last_name || '';
  const customerName =
    order.customerName ||
    order.customer_name ||
    order.buyer_name ||
    user?.name ||
    [firstName, lastName].filter(Boolean).join(' ') ||
    null;
  const customerEmail = order.customerEmail || order.customer_email || user?.email || null;
  const customerPhone = order.customerPhone || order.customer_phone || user?.phone || null;
  const shippingLabel = order.shipping_method_label || (order.address ? 'Envío a Domicilio' : 'Retiro en Tienda');
  const paymentMethod = order.paymentMethod || order.payment_method || null;
  const paymentId = order.paymentId || order.mercadopago_payment_id || null;
  const totalAmount = order.totalAmount ?? order.total_amount ?? order.total ?? 0;
  const subtotal = order.subtotal ?? order.subtotal_amount ?? null;
  const discounted_total = order.discounted_total ?? order.discounted_total ?? subtotal;
  const amount_paid = order.amount_paid ?? order.amountPaid ?? order.amount_paid ?? 0;
  const amount_pending = order.amount_pending ?? order.amountPending ?? 0;
  const shipping_cost = order.shipping_cost ?? order.shipping_amount ?? 0;

  return {
    ...order,
    items: normalizedItems,
    customerName,
    customerFirstName: firstName || null,
    customerLastName: lastName || null,
    customerEmail,
    customerPhone,
    shipping_method_label: shippingLabel,
    paymentMethod,
    paymentId,
    totalAmount,
    subtotal,
    discounted_total,
    amount_paid,
    amount_pending,
    shipping_cost,
  };
};

/**
 * Desglose del descuento por volumen (misma lógica que carrito / PriceService).
 * @returns {null | { total: number, main: number, extra: number, d1: number, d2: number }}
 */
const getVolumeBreakdown = (gross, net, d1Raw, d2Raw, userForFallback) => {
  const g = Math.max(0, parseFloat(gross) || 0);
  const n = net != null && net !== '' && !Number.isNaN(parseFloat(net)) ? Math.max(0, parseFloat(net)) : g;
  const V = Math.max(0, g - n);
  if (V < 0.009) return null;

  const d1Parsed = d1Raw != null && d1Raw !== '' ? parseFloat(d1Raw) : NaN;
  let d1n = !Number.isNaN(d1Parsed) ? Math.max(0, d1Parsed) : 0;
  const d2Explicit = d2Raw != null && d2Raw !== '';
  const d2Parsed = d2Explicit ? parseFloat(d2Raw) : NaN;
  let d2n = !Number.isNaN(d2Parsed) ? Math.max(0, d2Parsed) : 0;

  if (d1n <= 0.0001 && userForFallback) {
    d1n = getVolumeDiscountMainTier(userForFallback).mainPercent;
  }
  if (!d2Explicit && userForFallback) {
    d2n = getVolumeDiscountExtraPercent(userForFallback);
  }

  if (d2n > 0.0001 && d1n > 0.0001) {
    const r1 = d1n / 100;
    const r2 = d2n / 100;
    const denom = r1 + (1 - r1) * r2;
    if (denom < 0.0001) return { total: V, main: V, extra: 0, d1: d1n, d2: d2n };
    const e = V / denom;
    const main = e * r1;
    const extra = Math.max(0, V - main);
    return { total: V, main, extra, d1: d1n, d2: d2n };
  }
  if (d1n > 0.0001) {
    return { total: V, main: V, extra: 0, d1: d1n, d2: 0 };
  }
  const fbD1 = userForFallback ? getVolumeDiscountMainTier(userForFallback).mainPercent : 30;
  return { total: V, main: V, extra: 0, d1: fbD1, d2: 0 };
};

const OrderDetailModal = ({
  order,
  isOpen,
  onClose,
  showReviewButton = false,
  isAdmin = false,
  onOrderUpdated,
  inlineMode = false,
}) => {
  const viewerUser = useUserStore((s) => s.user);
  const isViewerOroDiamante = ['oro', 'diamante'].includes(
    String(viewerUser?.seller_category || '').toLowerCase()
  );
  const showMercadoPagoPayActions =
    isAdmin ||
    !['oro', 'diamante'].includes(String(viewerUser?.seller_category || '').toLowerCase());

  order = normalizeOrderForDetail(order);
 
  const formatOrderNumber = (o) =>
    formatOrderNumberDisplay(o, { isViewerOroDiamante: !isAdmin && isViewerOroDiamante });

  const groupedRows = React.useMemo(
    () => (order?.items?.length ? groupOrderItemsByProduct(order.items) : []),
    [order?.items]
  );

  const [isSharingOrder, setIsSharingOrder] = useState(false);

  useEffect(() => {
    if (!isOpen || !order?.id || !orderQualifiesForExternalApi(order)) return;

    const orderNum = formatOrderNumberDisplay(order, {
      isViewerOroDiamante: !isAdmin && isViewerOroDiamante,
    });

    import('../../utils/shareProductUtils').then(({ prefetchOrderPdf }) => {
      prefetchOrderPdf(order.id, `pedido-${orderNum}.pdf`);
    });
  }, [isOpen, order, isAdmin, isViewerOroDiamante]);

  const handleShareOrder = useCallback(async () => {
    if (!order?.id || isSharingOrder) return;
    const orderNum = formatOrderNumberDisplay(order, {
      isViewerOroDiamante: !isAdmin && isViewerOroDiamante,
    });
    const total = parseFloat(order.totalAmount) || 0;
    try {
      setIsSharingOrder(true);
      const { shareOrderPdf } = await import('../../utils/shareProductUtils');
      await shareOrderPdf({
        orderId: order.id,
        pdf_name: `pedido-${orderNum}.pdf`,
        orderLabel: orderNum,
        totalFormatted: `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      });
    } catch (error) {
      if (error?.name !== 'AbortError' && window.showToast) {
        window.showToast('No se pudo compartir el pedido.', 'error');
      }
    } finally {
      setIsSharingOrder(false);
    }
  }, [order, isSharingOrder, isAdmin, isViewerOroDiamante]);

  if (!isOpen || !order) return null;

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
  const summarySubtotal =
    Math.abs(linesSubtotalSum + shippingNum - totalNum) > 0.05 ? netMerchandise : linesSubtotalSum;

  const grossMerch =
    order.subtotal != null && order.subtotal !== '' && !Number.isNaN(parseFloat(order.subtotal))
      ? parseFloat(order.subtotal)
      : linesSubtotalSum;
  const netMerchFromOrder =
    order.discounted_total != null && order.discounted_total !== '' && !Number.isNaN(parseFloat(order.discounted_total))
      ? parseFloat(order.discounted_total)
      : null;
  const volBreak = getVolumeBreakdown(
    grossMerch,
    netMerchFromOrder,
    order.descuento1,
    order.descuento2,
    viewerUser
  );
  const netMerchDisplay = netMerchFromOrder != null ? netMerchFromOrder : (volBreak ? Math.max(0, grossMerch - volBreak.total) : summarySubtotal);

  const content = (
    <div className={`order-detail-modal__content ${inlineMode ? 'order-detail-modal__content--inline' : ''}`}>
      <div className="desktop-only">
      <div className="order-info-grid order-info-grid--tight">
            {/* Información del Cliente */}
            {(order.customerName || order.customerEmail || order.customerPhone) && (
              <div className="info-section info-section--compact info-section--tight-title client-section">
                <div className="client-header">
                  <h3>Cliente</h3>
                  <button className="mobile-icon-btn mobile-only"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></button>
                </div>
                <div className="order-detail-info">
                  {order.customerName && (
                    <div className="info-row mobile-client-name-block">
                      <span className="info-label desktop-only">Nombre:</span>
                      <span className="client-name">
                        {order.customerFirstName || ''} 
                        {order.customerMiddleName ? ' ' + order.customerMiddleName : ''} 
                        {order.customerLastName ? ' ' + order.customerLastName : ''}
                        {!order.customerFirstName && !order.customerLastName && order.customerName}
                      </span>
                      <span className="client-orders-count mobile-only">1 pedido</span>
                    </div>
                  )}

                  <div className="desktop-only" style={{display: 'flex', flexDirection: 'column', gap: '0.4rem'}}>
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
                  
                  <div className="mobile-contact-actions mobile-only" style={{ marginTop: '12px' }}>
                    <a href={`mailto:${order.customerEmail || ''}`} className={`mobile-contact-btn ${!order.customerEmail ? 'disabled' : ''}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                      <span>Detalles del correo<br/>electrónico</span>
                    </a>
                    <a href={`tel:${order.customerPhone || ''}`} className={`mobile-contact-btn ${!order.customerPhone ? 'disabled' : ''}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                      <span>Detalles del<br/>teléfono</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Método de entrega (admin / cliente) */}
            <div className="info-section info-section--compact info-section--tight-title desktop-only">
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
            <div className="order-info-grid order-info-grid--delivery-address address-section">
              <div className="info-section info-section--compact info-section--tight-title" style={{ gridColumn: '1 / -1' }}>
                <h3 className="desktop-only">Dirección de envío</h3>
                <h3 className="mobile-only">Dirección predeterminada</h3>
                <div className="order-detail-info mobile-address-block">
                  <div className="address-text-block">
                    {(order.address.street_address || order.address.street_number_ext || order.address.street_number_int) && (
                      <div className="info-row address-row">
                        <span className="info-label desktop-only">Calle y número:</span>
                        <span>{buildStreetWithNumbers(order.address) || order.address.street_address}</span>
                      </div>
                    )}
                    {order.address.colonia && (
                      <div className="info-row address-row">
                        <span className="info-label desktop-only">Colonia:</span>
                        <span>{order.address.colonia}</span>
                      </div>
                    )}
                    {order.address.municipality && (
                      <div className="info-row address-row">
                        <span className="info-label desktop-only">Municipio:</span>
                        <span>{order.address.municipality}</span>
                      </div>
                    )}
                    <div className="address-row-inline">
                      {order.address.postal_code && (
                        <span>{order.address.postal_code} </span>
                      )}
                      {order.address.city && (
                        <span>{order.address.city} </span>
                      )}
                    </div>
                    {order.address.state && (
                      <div className="info-row address-row">
                        <span className="info-label desktop-only">Estado:</span>
                        <span>{order.address.state}</span>
                      </div>
                    )}
                    <div className="info-row address-row mobile-only">
                      <span>México</span>
                    </div>
                  </div>
                  <button className="mobile-icon-btn mobile-only" aria-label="Copiar dirección">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isPickup && !order.address && (
            <div className="order-detail-modal__no-delivery-address">
              Envío a domicilio: no hay dirección registrada en esta orden.
            </div>
          )}

          {/* Nota */}
          {(order.note || order.order_notes || order.customerNote) && (
            <div className="info-section info-section--compact info-section--tight-title mobile-only">
              <h3 style={{ fontSize: '16px', color: '#111', fontWeight: 'bold' }}>Nota</h3>
              <div className="order-detail-info" style={{ marginTop: '8px', fontSize: '15px', color: '#333' }}>
                {order.note || order.order_notes || order.customerNote}
              </div>
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
          <div className="order-info-grid order-info-grid--tight">
            {/* Estado y Total */}
            <div className="info-section info-section--compact info-section--tight-title">
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
                      <div className="info-row" style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #e0e0e0' }}>
                        <span className="info-label">Monto pagado con dinero:</span>
                        <span className="value" style={{ color: '#28a745', fontWeight: '600' }}>
                          ${(parseFloat(order.amount_paid || 0)).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {(order.credit_used > 0 || order.amount_pending > 0) && (
                      <div className="info-row info-row--full-width" style={{ marginTop: order.amount_paid > 0 ? '4px' : '6px', paddingTop: order.amount_paid > 0 ? '0' : '6px', borderTop: order.amount_paid > 0 ? 'none' : '1px solid #e0e0e0' }}>
                        <span className="info-label" style={{ fontWeight: '700', fontSize: '13px' }}>Crédito pendiente:</span>
                        <span className="value" style={{ color: '#d32f2f', fontWeight: '700', fontSize: '16px' }}>
                          ${((parseFloat(order.credit_used || 0)) + (parseFloat(order.amount_pending || 0))).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {showMercadoPagoPayActions &&
                      order.amount_pending > 0 &&
                      order.statusRaw === 'pendiente_pago' && (
                      <div className="info-row" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e0e0e0' }}>
                        <RetryRemainderPaymentButton orderId={order.id} />
                      </div>
                    )}
                  </>
                )}
                {/* Split crédito + MP: la orden del faltante no lleva paid_with_credit pero sí pendiente_pago */}
                {showMercadoPagoPayActions &&
                  !order.paid_with_credit &&
                  order.statusRaw === 'pendiente_pago' &&
                  parseFloat(order.amount_pending ?? order.totalAmount ?? 0) > 0.01 && (
                    <div className="info-row" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e0e0e0' }}>
                      <PayPendingOrderButton orderId={order.id} />
                    </div>
                  )}
              </div>
            </div>

            {/* Información de pago */}
            {(order.paymentMethod || order.paymentId) && (
              <div className="info-section info-section--compact info-section--tight-title">
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

            {/* API externa (solo admin) */}
            {isAdmin && (
              <div className="info-section info-section--compact info-section--tight-title">
                <h3>API externa (almacén)</h3>
                <div className="order-detail-info">
                  <div className="info-row">
                    <span className="info-label">Estado envío:</span>
                    <span
                      className={
                        order.external_api_sent
                          ? 'external-api-badge external-api-badge--sent'
                          : order.should_send_to_external_api
                            ? 'external-api-badge external-api-badge--pending'
                            : 'external-api-badge external-api-badge--na'
                      }
                      style={{ display: 'inline-flex', width: 'auto', height: 'auto', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}
                    >
                      {order.external_api_sent
                        ? 'Enviado'
                        : order.should_send_to_external_api
                          ? 'Pendiente'
                          : 'No aplica'}
                    </span>
                  </div>
                  {order.external_api_sent_at && (
                    <div className="info-row">
                      <span className="info-label">Fecha envío:</span>
                      <span>{new Date(order.external_api_sent_at).toLocaleString('es-MX')}</span>
                    </div>
                  )}
                  {(order.should_send_to_external_api || order.external_api_sent) && (
                  <div className="info-row" style={{ marginTop: '8px' }}>
                    <ResendExternalApiButton
                      orderId={order.id}
                      externalApiSent={!!order.external_api_sent}
                      onSuccess={(updated) => {
                        onOrderUpdated?.({
                          ...order,
                          external_api_sent: updated?.external_api_sent ?? true,
                          external_api_sent_at: updated?.external_api_sent_at ?? new Date().toISOString(),
                          should_send_to_external_api: updated?.should_send_to_external_api ?? false,
                        });
                      }}
                    />
                  </div>
                  )}
                </div>
              </div>
            )}

            {/* Información de surtido (solo admin) */}
            {isAdmin && (
              <div className="info-section info-section--compact info-section--tight-title">
                <h3>Información de Surtido</h3>
                <div className="order-detail-info">
                  <div className="info-row">
                    <span className="info-label">Preparado:</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
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
                        padding: '4px 8px', 
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
            <h2 className="desktop-only">Productos</h2>
            
            <div className="mobile-products-header mobile-only">
              <div className="mobile-products-header-top">
                <span className={`mobile-badge mobile-badge--${order.is_prepared ? 'green' : 'yellow'}`}>{order.is_prepared ? 'Preparado' : 'No preparado'}</span>
                <button className="mobile-icon-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></button>
              </div>
              <div className="mobile-products-subtitle">{shippingMethodLabel} • CHERRY</div>
            </div>

            <div className="order-detail-products">
              {groupedRows.map((row) => {
                const unitKeys = [...new Set(row.variants.map((v) => v.price.toFixed(2)))];
                const singleUnitPrice = unitKeys.length === 1 ? parseFloat(unitKeys[0], 10) : null;
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
                              label === 'NUEVO' ? (
                                <span key={`${row.key}-${label}`} className="catalog-offer-badge catalog-new-badge">
                                  Nuevo
                                </span>
                              ) : (
                                <span key={`${row.key}-${label}`} className={`product-tag product-tag--${label.toLowerCase().replace('ó', 'o').replace('á', 'a')}`}>
                                  {label}
                                </span>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="product-variant-col desktop-only">
                        <span className="product-variant-col__label">Color</span>
                        <div className="product-variant-col__lines">
                          {row.variants.map((v) => (
                            <div key={`${v.key}-c`}>{v.color || '—'}</div>
                          ))}
                        </div>
                      </div>
                      <div className="product-variant-col desktop-only">
                        <span className="product-variant-col__label">Talla</span>
                        <div className="product-variant-col__lines">
                          {row.variants.map((v) => (
                            <div key={`${v.key}-s`}>{v.size || '—'}</div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Variante en móvil */}
                      <div className="mobile-variant-col mobile-only">
                         {row.variants.map((v) => (
                            <div key={`${v.key}-m`} className="mobile-variant-line">
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ textTransform: 'uppercase' }}>{v.color || '—'} / {v.size || '—'}</span>
                                {v.barcode && <span style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>SKU: {v.barcode}</span>}
                                <span style={{ color: '#666', marginTop: '2px' }}>MXN {v.price.toFixed(2)}</span>
                              </div>
                              <span className="mobile-variant-qty" style={{ alignSelf: 'center', fontSize: '16px' }}>× {v.quantity}</span>
                            </div>
                          ))}
                      </div>

                      <div className="product-quantity desktop-only">
                        <span className="product-variant-col__label">Cant.</span>
                        <div className="product-variant-col__lines">
                          {row.variants.map((v) => (
                            <div key={`${v.key}-q`}>{v.quantity}</div>
                          ))}
                        </div>
                      </div>
                      <div className="product-price desktop-only">
                        <span className="product-variant-col__label">Precio U.</span>
                        <div className="product-variant-col__lines">
                          {row.variants.map((v) => (
                            <div key={`${v.key}-p`}>${v.price.toFixed(2)}</div>
                          ))}
                        </div>
                      </div>
                      <div className="product-subtotal desktop-only">
                        <span className="product-variant-col__label">Subtotal</span>
                        <div className="product-variant-col__lines">
                          {row.variants.map((v) => (
                            <div key={`${v.key}-st`}>${v.subtotal.toFixed(2)}</div>
                          ))}
                        </div>
                      </div>
                      <div className="product-quantity">
                        <strong>Total pzas:</strong> {row.totalQuantity}
                      </div>
                      <div className="product-price">
                        {singleUnitPrice != null ? (
                          <span>Precio final: {formatMoney(singleUnitPrice)}</span>
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
                                    {v.discountPercentage > 0
                                      ? `${Math.round(v.discountPercentage)}%`
                                      : '—'}
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
              
              <div className="mobile-only" style={{ marginTop: '16px', width: '100%' }}>
                <button 
                  style={{ width: '100%', background: '#333', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      const response = await fetch(`/api/admin/orders/${order.id}/update-prepared`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ is_prepared: !order.is_prepared })
                      });
                      if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                          order.is_prepared = !order.is_prepared;
                          if (window.showToast) window.showToast('Estado de preparado actualizado', 'success');
                          if (onOrderUpdated) onOrderUpdated({...order, is_prepared: order.is_prepared});
                        }
                      }
                    } catch (error) {
                      if (window.showToast) window.showToast('Error al actualizar estado de preparado', 'error');
                    }
                  }}
                >
                  <span>Marcar como {order.is_prepared ? 'no preparado' : 'preparado'}</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Resumen de precios */}
          <div className="summary-section" style={{ padding: '0', background: 'transparent' }}>
            <div className="mobile-only" style={{ background: '#fff', padding: '14px', borderRadius: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 'bold' }}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  {order.amount_pending > 0 ? 'Pendiente' : 'Pagado'}
                </div>
                <button className="mobile-icon-btn" style={{ background: 'transparent', padding: '0' }}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></button>
              </div>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                {totalPieces} artículo{totalPieces !== 1 ? 's' : ''}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#333', marginBottom: '8px' }}>
                <span>Subtotal</span>
                <span>${summarySubtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#333', marginBottom: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>Envío</span>
                  <span style={{ fontSize: '12px', color: '#666' }}>Standard (0.0 kg)</span>
                </div>
                <span>${(parseFloat(order.shipping_cost || 0)).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', color: '#111', marginBottom: '12px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
                <span>Total</span>
                <span>${(parseFloat(order.totalAmount) || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', color: '#333' }}>
                <span>Pagado</span>
                <span>${(parseFloat(order.amount_paid) || parseFloat(order.totalAmount) || 0).toFixed(2)}</span>
              </div>
            </div>
            
            <div className="desktop-only" style={{ background: '#fff', padding: '14px', borderRadius: '8px' }}>
            {volBreak && (
              <>
                <div className="summary-row">
                  <span className="summary-label">Mercancía (antes de desc. mayoreo):</span>
                  <span>${grossMerch.toFixed(2)}</span>
                </div>
                {volBreak.extra > 0.009 ? (
                  <>
                    <div className="summary-row" style={{ color: '#1b5e20' }}>
                      <span className="summary-label">Descuento mayoreo ({volBreak.d1}%):</span>
                      <span>-${volBreak.main.toFixed(2)}</span>
                    </div>
                    <div className="summary-row" style={{ color: '#1b5e20' }}>
                      <span className="summary-label">Descuento adicional (10%):</span>
                      <span>-${volBreak.extra.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="summary-row" style={{ color: '#1b5e20' }}>
                    <span className="summary-label">Descuento mayoreo{volBreak.d1 ? ` (${volBreak.d1}%)` : ''}:</span>
                    <span>-${volBreak.main.toFixed(2)}</span>
                  </div>
                )}
                <div className="summary-row">
                  <span className="summary-label">Mercancía neta:</span>
                  <span>${netMerchDisplay.toFixed(2)}</span>
                </div>
              </>
            )}
            {!volBreak && (
            <div className="summary-row">
              <span className="summary-label">Subtotal:</span>
              <span>${summarySubtotal.toFixed(2)}</span>
            </div>
            )}
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

          <div className="mobile-extra-sections mobile-only" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
             <div style={{ padding: '14px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '8px', color: '#333', fontSize: '15px' }}>
               <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
               Agregar etiquetas
             </div>
             <div style={{ padding: '14px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', color: '#333', fontSize: '15px' }}>
               <span>Detalles de la conversión</span>
               <span style={{ color: '#666' }}>Pedido 1</span>
             </div>
             <div style={{ padding: '14px', display: 'flex', justifyContent: 'space-between', color: '#333', fontSize: '15px' }}>
               <span>Riesgo del pedido</span>
               <span style={{ color: '#008060' }}>Bajo</span>
             </div>
          </div>

          <div className="mobile-timeline-section mobile-only" style={{ marginTop: '16px', padding: '0 4px', background: 'transparent' }}>
             <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#111' }}>Cronología</h3>
             <p style={{ fontSize: '13px', color: '#666', margin: '0 0 16px 0' }}>Solo tú y el resto del equipo pueden ver los comentarios</p>
             
             <div style={{ position: 'relative', paddingLeft: '20px', borderLeft: '1px solid #ddd', marginLeft: '10px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-25px', top: '2px', width: '9px', height: '9px', borderRadius: '50%', background: '#666' }}></div>
                  <div style={{ fontSize: '14px', color: '#333' }}>Se procesó un pago por ${(parseFloat(order.amount_paid) || parseFloat(order.totalAmount) || 0).toFixed(2)}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{new Date(order.created_at).toLocaleTimeString('es-MX', {hour: 'numeric', minute: '2-digit'})}</div>
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-25px', top: '2px', width: '9px', height: '9px', borderRadius: '50%', background: '#666' }}></div>
                  <div style={{ fontSize: '14px', color: '#333' }}>{order.customerFirstName || 'El cliente'} realizó este pedido en Online Store.</div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{new Date(order.created_at).toLocaleTimeString('es-MX', {hour: 'numeric', minute: '2-digit'})}</div>
                </div>
             </div>
             
             <div style={{ marginTop: '24px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#666" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <div style={{ flex: 1, background: '#fff', borderRadius: '20px', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #ddd' }}>
                  <span style={{ color: '#aaa', fontSize: '14px' }}>Escribe un comentario...</span>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ccc" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </div>
             </div>
          </div>
      </div>

      <div className="shopify-mobile-order-layout mobile-only">
         {inlineMode && (
           <div className="shopify-mobile-card shopify-mobile-header-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#111' }}>{order.orderNumber ? `#${order.orderNumber}` : `#${order.id}`}</h2>
                    <span className={`mobile-badge mobile-badge--${order.is_prepared ? 'green' : 'yellow'}`}>{order.is_prepared ? 'Preparado' : 'No preparado'}</span>
                    <span className="mobile-badge mobile-badge--gray" style={{ background: '#eee', color: '#333' }}>{order.amount_pending > 0 ? 'Pendiente' : 'Pagado'}</span>
                 </div>
                 <button className="mobile-icon-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
              </div>
              <div style={{ fontSize: '13px', color: '#666' }}>
                 el {new Date(order.created_at).toLocaleDateString('es-MX', {day: 'numeric', month: 'short', year: 'numeric'})} a las {new Date(order.created_at).toLocaleTimeString('es-MX', {hour: 'numeric', minute: '2-digit'})} • Tienda online
              </div>
           </div>
         )}

         <div className="shopify-mobile-card">
            <div className="shopify-mobile-card-header">
              <h3>Cliente</h3>
              <button className="mobile-icon-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></button>
            </div>
            <div style={{ fontSize: '15px', color: '#333', marginBottom: '2px' }}>
               {order.customerName || (order.buyer && order.buyer.name) || 'El cliente'}
            </div>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
               1 pedido
            </div>

            <div style={{ paddingTop: '16px', borderTop: '1px solid #eee' }}>
               <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>Dirección predeterminada</div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '15px', color: '#333', lineHeight: '1.4' }}>
                    {order.address ? (
                      <>
                        {order.address.street_address || order.address.street_number_ext ? (order.address.street_address && !order.address.street_number_ext ? order.address.street_address : order.address.street_address) : 'Dirección no disponible'}<br/>
                        {order.address.colonia && <>{order.address.colonia}<br/></>}
                        {order.address.postal_code && order.address.city && <>{order.address.postal_code} {order.address.city}<br/></>}
                        {order.address.country || 'México'}
                      </>
                    ) : (
                      'No hay dirección registrada'
                    )}
                  </div>
                  <button className="mobile-icon-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
               </div>
            </div>
         </div>

         {(order.note || order.order_notes || order.customerNote) && (
           <div className="shopify-mobile-card">
              <div className="shopify-mobile-card-header">
                <h3>Nota</h3>
              </div>
              <div style={{ fontSize: '15px', color: '#333' }}>
                {order.note || order.order_notes || order.customerNote}
              </div>
           </div>
         )}

         <div className="shopify-mobile-card">
            <div className="shopify-mobile-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <span className={`mobile-badge mobile-badge--${order.is_prepared ? 'green' : 'yellow'}`} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                    {order.is_prepared ? 'Preparado' : 'No preparado'}
                 </span>
              </div>
              <button className="mobile-icon-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></button>
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
               {order.shipping_method_label || 'Standard'} • CHERRY
            </div>
            
            {groupedRows.map((row, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '60px', height: '60px', flexShrink: 0, borderRadius: '8px', border: '1px solid #eee', overflow: 'hidden', background: '#f9f9f9' }}>
                  <img src={row.product?.image || '/images/placeholder-catalog.png'} alt={row.product?.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', color: '#111', fontWeight: '500', lineHeight: '1.3', marginBottom: '4px' }}>
                    {row.product?.title || row.title || 'Producto'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                    {(row.product?.variants || row.variants || []).map(v => v.color ? `${v.color} / ${v.size || v.size_name || ''}` : `${v.size || v.size_name || v.id_talla}`).join(', ')}
                  </div>
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
                    SKU: {row.product?.sku || row.sku || 'N/A'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#333' }}>
                    MXN {parseFloat(row.price || row.product?.price || 0).toFixed(2)}
                  </div>
                </div>
                <div style={{ fontSize: '15px', color: '#111', fontWeight: '500', paddingLeft: '8px' }}>
                  × {row.totalQuantity}
                </div>
              </div>
            ))}

            <button className="shopify-black-btn" onClick={() => isAdmin && !order.is_prepared && onOrderUpdated && onOrderUpdated()} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', background: '#202223', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '500', marginTop: '16px', position: 'relative' }}>
              <span style={{ flex: 1, textAlign: 'center' }}>{order.is_prepared ? 'Preparado' : 'Marcar como preparado'}</span>
              <div style={{ position: 'absolute', right: '0', top: '0', bottom: '0', width: '40px', borderLeft: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </button>
         </div>

         <div className="shopify-mobile-card">
            <div className="shopify-mobile-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: 'bold', color: '#111' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    {order.amount_pending > 0 ? 'Pendiente' : 'Pagado'}
                 </span>
              </div>
              <button className="mobile-icon-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></button>
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
               {totalPieces} {totalPieces === 1 ? 'artículo' : 'artículos'}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '15px', color: '#333' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal</span>
                  <span>{(summarySubtotal || parseFloat(order.totalAmount)).toFixed(2)} $</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    Envío<br/>
                    <span style={{ fontSize: '13px', color: '#666' }}>Standard (0.0 kg: artículos 0.0<br/>kg, paquete 0.0 kg)</span>
                  </div>
                  <span style={{ paddingTop: '20px' }}>{parseFloat(order.shipping_cost || 0) === 0 ? '0,00 $' : `${parseFloat(order.shipping_cost || 0).toFixed(2)} $`}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px', color: '#111', paddingTop: '12px', borderTop: '1px solid #eee', marginTop: '4px' }}>
                  <span>Total</span>
                  <span>{(parseFloat(order.totalAmount) || 0).toFixed(2)} $</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                  <span>Pagado</span>
                  <span>{(parseFloat(order.amount_paid) || parseFloat(order.totalAmount) || 0).toFixed(2)} $</span>
               </div>
            </div>
         </div>
      </div>
    </div>
  );

  if (inlineMode) {
    return content;
  }

  return (
    <div className="order-detail-modal-overlay" onClick={handleBackdropClick}>
      <div className="order-detail-modal">
        <div className="order-detail-modal__header desktop-only">
          <div className="print-header">
            <h1>Cherry</h1>
            <div className="order-number">Orden: {formatOrderNumber(order)}</div>
            <div className="order-date">Fecha: {order.date || new Date(order.created_at).toLocaleDateString('es-MX')}</div>
          </div>
          <button 
            className="order-detail-modal__close-btn" 
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* MOBILE HEADER */}
        <div className="order-detail-modal__mobile-header mobile-only">
          <div className="mobile-header-top">
            <button className="mobile-back-btn" onClick={onClose} aria-label="Volver">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            </button>
            <div className="mobile-header-actions">
              <button className="mobile-icon-btn" aria-label="Imprimir">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              </button>
              <button className="mobile-icon-btn" aria-label="Opciones">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
              </button>
            </div>
          </div>
          <div className="mobile-header-title-row">
            <h2 className="mobile-order-id">{formatOrderNumber(order)}</h2>
            <span className={`mobile-badge mobile-badge--${order.is_prepared ? 'green' : 'yellow'}`}>{order.is_prepared ? 'Preparado' : 'No preparado'}</span>
            <span className="mobile-badge mobile-badge--gray" style={{ background: '#eee', color: '#333' }}>{order.amount_pending > 0 ? 'Pendiente' : 'Pagado'}</span>
          </div>
          <div className="mobile-order-date">
            el {new Date(order.created_at).toLocaleDateString('es-MX', {day: 'numeric', month: 'short', year: 'numeric'})} a las {new Date(order.created_at).toLocaleTimeString('es-MX', {hour: 'numeric', minute: '2-digit'})} • Tienda online
          </div>
        </div>

        {content}
        
        <div className="order-detail-modal__footer">
          <CherryButton 
            variant="outline" 
            size="medium" 
            onClick={onClose}
          >
            Cerrar
          </CherryButton>
          {orderQualifiesForExternalApi(order) && (
            <CherryButton
              variant="outline"
              size="medium"
              onClick={handleShareOrder}
              disabled={isSharingOrder}
              title="Compartir"
            >
              <img
                src={getIconPath('Share Alt.svg')}
                alt="Compartir"
                width={18}
                height={18}
              />
            </CherryButton>
          )}
          <CherryButton 
            variant="red" 
            size="medium"
            onClick={() => {
              const token = localStorage.getItem('token');
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
  showReviewButton: PropTypes.bool,
  isAdmin: PropTypes.bool,
  onOrderUpdated: PropTypes.func,
};

export default OrderDetailModal;