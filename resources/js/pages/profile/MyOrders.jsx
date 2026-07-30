import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CherryButton from '../../components/CherryButton/CherryButton';
import OrderDetailModal from '../../components/OrderDetailModal/OrderDetailModal';
import { orderService } from '../../services/api';
import api from '../../config/axios';
import useUserStore from '../../store/userStore';
import './MyOrders.css';
import '../admin/mobile_orders_list.css';
import { formatOrderNumberDisplay } from '../../utils/orderDisplayNumber';
import { getProductImageUrl } from '../../utils/productImageUtils';
import { getIconPath } from '../../utils/assetPaths';
import { getOrderDisplayTotal } from '../../utils/checkoutOrderDisplay';
import { orderQualifiesForExternalApi } from '../../utils/orderExternalApi';

const ORDER_THUMB_PLACEHOLDER = '/images/placeholder-catalog.png';

const getOrderThumbnailUrl = (order) => {
  const items = order?.items || [];
  for (const item of items) {
    if (item?.image) {
      return item.image;
    }
    if (item?.product_id != null && item.product_id !== '') {
      return getProductImageUrl(String(item.product_id));
    }
  }
  return ORDER_THUMB_PLACEHOLDER;
};

const showOrderActionTooltip = (e) => {
  const button = e.currentTarget;
  const tooltipText = button.getAttribute('data-tooltip');
  if (!tooltipText) return;
  let tooltip = document.querySelector('.order-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'order-tooltip';
    document.body.appendChild(tooltip);
  }
  tooltip.textContent = tooltipText;
  tooltip.style.display = 'block';
  const rect = button.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
  tooltip.style.top = `${rect.top - tooltipRect.height - 10}px`;
};

const hideOrderActionTooltip = () => {
  const tooltip = document.querySelector('.order-tooltip');
  if (tooltip) tooltip.style.display = 'none';
};

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

const MyOrders = () => {
  const user = useUserStore((s) => s.user);
  const isViewerOroDiamante = ['oro', 'diamante'].includes(
    String(user?.seller_category || '').toLowerCase()
  );
  const formatOrderNumber = (order) =>
    formatOrderNumberDisplay(order, { isViewerOroDiamante });
  const showMercadoPagoPayActions = !['oro', 'diamante'].includes(
    String(user?.seller_category || '').toLowerCase()
  );

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [highlightedOrderId, setHighlightedOrderId] = useState(null);
  const [sharingOrderId, setSharingOrderId] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const openedOrderFromQueryRef = useRef(false);

  const itemsPerPage = 10;

  // Cargar órdenes del usuario
  useEffect(() => {
    fetchOrders();
  }, []);

  // Manejar parámetro highlight de la URL
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId) {
      setHighlightedOrderId(parseInt(highlightId));
      
      // Limpiar el highlight después de 5 segundos
      const timeout = setTimeout(() => {
        setHighlightedOrderId(null);
        // Limpiar el parámetro de la URL
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('highlight');
        navigate(`/perfil/mis-pedidos?${newSearchParams.toString()}`, { replace: true });
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [searchParams, navigate]);

  /** Enlace del correo: /perfil/mis-pedidos?order={id} — abre el detalle si hay sesión. */
  useEffect(() => {
    if (loading) return;

    const raw = searchParams.get('order');
    if (!raw || openedOrderFromQueryRef.current) return;

    const orderId = parseInt(raw, 10);
    if (!Number.isFinite(orderId) || orderId < 1) return;

    if (!localStorage.getItem('token')) return;

    const order = orders.find((o) => Number(o.id) === orderId);
    if (!order) return;

    openedOrderFromQueryRef.current = true;
    setHighlightedOrderId(orderId);
    setSelectedOrderForDetail(order);
    setShowOrderDetailModal(true);

    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('order');
    const qs = newSearchParams.toString();
    navigate(qs ? `/perfil/mis-pedidos?${qs}` : '/perfil/mis-pedidos', { replace: true });
  }, [loading, orders, searchParams, navigate]);

  const [expandedOrderId, setExpandedOrderId] = useState(null);

    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await orderService.getUserOrders();

        if (response.data.success) {
          setOrders(response.data.orders || []);
        } else {
          setError(response.data.message || 'Error al cargar las órdenes');
        }
      } catch (err) {
        setError('Error de conexión al cargar las órdenes');
      } finally {
        setLoading(false);
      }
    };

  // Filtrar y ordenar órdenes
  const filteredOrders = orders.filter(order => {
    const raw = (order.statusRaw || order.status || '').toString().toLowerCase();
    const matchesStatus = statusFilter === 'all' || raw === statusFilter.toLowerCase();
    const matchesSearch = order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Paginación
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const getStatusColor = (status) => {
    const colorMap = {
      'pending': 'yellow',
      'pagado': 'green',
      'en_espera_envio': 'blue',
      'enviado': 'green',
      'cancelled': 'red',
      'failed': 'red',
      'pendiente_pago': 'yellow',
      'pago_rechazado': 'red'
    };
    return colorMap[status] || 'gray';
  };

  const getStatusBadgeVariant = (order) => {
    const raw = (order.statusRaw || order.status || '').toString().toLowerCase();
    const pm = (order.payment_method || '').toString().toLowerCase();
    if (raw === 'pendiente_pago' && order.paid_with_credit && pm === 'credito') {
      return 'credit-pending';
    }
    return getStatusColor(raw);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const handleViewOrderDetails = (order) => {
    setSelectedOrderForDetail(order);
    setShowOrderDetailModal(true);

    if (order?.id && orderQualifiesForExternalApi(order)) {
      const orderNum = formatOrderNumber(order);
      import('../../utils/shareProductUtils').then(({ prefetchOrderPdf }) => {
        prefetchOrderPdf(order.id, `pedido-${orderNum}.pdf`);
      });
    }
  };

  const handleCloseOrderDetailModal = () => {
    setShowOrderDetailModal(false);
    setSelectedOrderForDetail(null);
  };

  const prefetchSharePdf = (order) => {
    if (!order?.id || !orderQualifiesForExternalApi(order)) return;
    const orderNum = formatOrderNumber(order);
    import('../../utils/shareProductUtils').then(({ prefetchOrderPdf }) => {
      prefetchOrderPdf(order.id, `pedido-${orderNum}.pdf`);
    });
  };

  const handleShareOrder = async (order) => {
    if (!order?.id || sharingOrderId != null) return;
    const orderNum = formatOrderNumber(order);
    const total =
      parseFloat(order.totalAmount) || getOrderDisplayTotal(order);
    try {
      setSharingOrderId(order.id);
      const { shareOrderPdf } = await import('../../utils/shareProductUtils');
      await shareOrderPdf({
        orderId: order.id,
        pdf_name: `pedido-${orderNum}.pdf`,
        orderLabel: orderNum,
        totalFormatted: `$${Number(total).toLocaleString('es-MX', {
          minimumFractionDigits: 2,
        })}`,
      });
    } catch (error) {
      if (error?.name !== 'AbortError' && window.showToast) {
        window.showToast('No se pudo compartir el pedido.', 'error');
      }
    } finally {
      setSharingOrderId(null);
    }
  };

  const handlePayRemainder = async (orderId) => {
    try {
      if (window.showToast) {
        window.showToast('Creando preferencia de pago...', 'info');
      }
      
      const response = await api.post(`/payment/retry-remainder/${orderId}`);
      
      if (response.data.success) {
        const paymentUrl = mercadoPagoUrlFromPayload(response.data.data);
        if (paymentUrl) {
          window.location.href = paymentUrl;
        } else if (window.showToast) {
          window.showToast('No se pudo obtener la URL de pago', 'error');
        }
      } else if (window.showToast) {
        window.showToast(response.data.message || 'Error al crear la preferencia de pago', 'error');
      }
    } catch (err) {
      if (window.showToast) {
        window.showToast(err.response?.data?.message || 'Error al procesar el pago', 'error');
      }
    }
  };

  const handlePayPendingOrder = async (orderId) => {
    try {
      if (window.showToast) {
        window.showToast('Creando preferencia de pago...', 'info');
      }
      
      const response = await api.post(`/payment/pay-pending-order/${orderId}`);
      
      if (response.data.success) {
        const paymentUrl = mercadoPagoUrlFromPayload(response.data.data);
        if (paymentUrl) {
          window.location.href = paymentUrl;
        } else if (window.showToast) {
          window.showToast('No se pudo obtener la URL de pago', 'error');
        }
      } else if (window.showToast) {
        window.showToast(response.data.message || 'Error al crear la preferencia de pago', 'error');
      }
    } catch (err) {
      if (window.showToast) {
        window.showToast(err.response?.data?.message || 'Error al procesar el pago', 'error');
      }
    }
  };

  if (loading) {
  return (
      <div className="my-orders">
        <div className="my-orders__loading">
          <div className="loading-spinner"></div>
          <p>Cargando órdenes...</p>
        </div>
            </div>
    );
  }

  if (error) {
    return (
      <div className="my-orders">
            <div className="my-orders__error">
              <p>Error: {error}</p>
          <CherryButton onClick={fetchOrders} variant="red" size="medium">
                Reintentar
              </CherryButton>
            </div>
            </div>
    );
  }

  return (
    <div className="my-orders">
      <div className="my-orders__header">
        <div className="my-orders__title-section">
          <h1 className="my-orders__title">Mis Pedidos</h1>
                </div>
        <div className="my-orders__stats">
          <div className="stat-card">
            <span className="stat-number">{orders.length}</span>
            <span className="stat-label">Total Órdenes</span>
                    </div>
          <div className="stat-card">
            <span className="stat-number">
              {orders.filter(o => o.status === 'pagado').length}
                        </span>
            <span className="stat-label">Pagadas</span>
                      </div>
          <div className="stat-card">
            <span className="stat-number">
              {orders.filter(o => o.status === 'enviado').length}
            </span>
            <span className="stat-label">Enviadas</span>
                      </div>
                    </div>
                  </div>

      <div className="my-orders__filters">
        <div className="filter-group desktop-only">
          <label htmlFor="status-filter">Estado:</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="pagado">Pagado</option>
            <option value="en_espera_envio">En espera de envío</option>
            <option value="enviado">Enviado</option>
            <option value="cancelled">Cancelado</option>
            <option value="pendiente_pago">Por pagar</option>
          </select>
        </div>

        {/* MOBILE TABS FILTER */}
        <div className="mobile-tabs-container mobile-only">
          <button 
            className={`mobile-tab ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >Todos</button>
          <button 
            className={`mobile-tab ${statusFilter === 'en_espera_envio' ? 'active' : ''}`}
            onClick={() => setStatusFilter('en_espera_envio')}
          >No preparados</button>
          <button 
            className={`mobile-tab ${statusFilter === 'pendiente_pago' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pendiente_pago')}
          >No pagados</button>
          <button 
            className={`mobile-tab ${statusFilter === 'pagado' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pagado')}
          >Pagados</button>
          <button 
            className={`mobile-tab ${statusFilter === 'enviado' ? 'active' : ''}`}
            onClick={() => setStatusFilter('enviado')}
          >Enviados</button>
        </div>
        
        <div className="filter-group">
          <label htmlFor="search-input">Buscar:</label>
          <input
            id="search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Número de orden..."
            className="filter-input"
          />
        </div>
      </div>

      <div className="my-orders__table-container">
        {paginatedOrders.length === 0 ? (
          <div className="my-orders__empty">
            <p>No se encontraron órdenes con los filtros seleccionados.</p>
          </div>
        ) : (
          <>
          <div className="table-scroll-wrapper desktop-only">
            <table className="my-orders__table">
              <thead>
                <tr>
                  <th className="my-orders__thumb-col" aria-label="Producto">
                    <span className="my-orders__thumb-col-label">Producto</span>
                  </th>
                  <th>No. de pedido</th>
                  <th className="my-orders__date-col">Fecha</th>
                  <th className="my-orders__time-col">Hora</th>
                  <th>Piezas</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => {
                  const orderDate = new Date(order.created_at);
                  const dateStr = orderDate.toLocaleDateString('es-MX', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit' 
                  });
                  const timeStr = orderDate.toLocaleTimeString('es-MX', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                  const totalPieces = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
                  const thumbUrl = getOrderThumbnailUrl(order);
                  
                  return (
                    <tr 
                      key={order.id}
                      className={`${highlightedOrderId === order.id ? 'highlighted' : ''}`}
                    >
                      <td className="my-orders__thumb-col">
                        <img
                          src={thumbUrl}
                          alt=""
                          className="my-orders__thumb"
                          loading="lazy"
                          onError={(e) => {
                            if (e.currentTarget.src !== ORDER_THUMB_PLACEHOLDER) {
                              e.currentTarget.src = ORDER_THUMB_PLACEHOLDER;
                            }
                          }}
                        />
                      </td>
                      <td className="order-number-cell">#{formatOrderNumber(order)}</td>
                      <td className="order-date-cell my-orders__date-col">{dateStr}</td>
                      <td className="order-time-cell my-orders__time-col">{timeStr}</td>
                      <td className="order-pieces-cell">{totalPieces}</td>
                      <td className="order-total-cell">{formatCurrency(order.totalAmount)}</td>
                      <td className="order-status-cell">
                        <span className={`status-badge status-badge--${getStatusBadgeVariant(order)}`}>
                          {order.statusDisplay || order.status}
                        </span>
                      </td>
                      <td className="order-actions-cell">
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                          {/* Botón para pagar saldo pendiente (cuando se pagó parcialmente con crédito); no aplica a Oro/Diamante (liquidación admin / pedido directo) */}
                          {showMercadoPagoPayActions &&
                           order.paid_with_credit &&
                           parseFloat(order.amount_pending || 0) > 0 &&
                           order.statusRaw === 'pendiente_pago' && (
                            <button
                              type="button"
                              className="order-action-btn order-action-btn--pay"
                              onClick={() => handlePayRemainder(order.id)}
                              data-tooltip={`Pagar ${formatCurrency(order.amount_pending)}`}
                              onMouseEnter={showOrderActionTooltip}
                              onMouseLeave={hideOrderActionTooltip}
                            >
                              💳
                            </button>
                          )}
                          {/* Botón para pagar orden pendiente completa; no aplica a Oro/Diamante */}
                          {showMercadoPagoPayActions &&
                           (order.statusRaw === 'pending' || order.statusRaw === 'pendiente_pago') &&
                           !order.paid_with_credit && (
                            <button
                              type="button"
                              className="order-action-btn order-action-btn--pay"
                              onClick={() => handlePayPendingOrder(order.id)}
                              data-tooltip={`Pagar ${formatCurrency(order.totalAmount)}`}
                              onMouseEnter={showOrderActionTooltip}
                              onMouseLeave={hideOrderActionTooltip}
                            >
                              💳
                            </button>
                          )}
                          {orderQualifiesForExternalApi(order) && (
                            <button
                              type="button"
                              className="order-action-btn order-action-btn--share"
                              onClick={() => handleShareOrder(order)}
                              onTouchStart={() => prefetchSharePdf(order)}
                              onMouseEnter={(event) => {
                                prefetchSharePdf(order);
                                showOrderActionTooltip(event);
                              }}
                              onMouseLeave={hideOrderActionTooltip}
                              disabled={sharingOrderId === order.id}
                              data-tooltip="Compartir"
                              aria-label="Compartir"
                            >
                              <img
                                src={getIconPath('Share Alt.svg')}
                                alt=""
                                width={18}
                                height={18}
                              />
                            </button>
                          )}
                          <button
                            type="button"
                            className="order-action-btn order-action-btn--detail"
                            onClick={() => handleViewOrderDetails(order)}
                            data-tooltip="Ver Detalle"
                            onMouseEnter={showOrderActionTooltip}
                            onMouseLeave={hideOrderActionTooltip}
                          >
                            👁️
                          </button>
                  </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
              </div>
          
          {/* MOBILE LIST */}
          <div className="mobile-orders-list mobile-only">
            {paginatedOrders.map((order) => {
              const orderDate = new Date(order.created_at);
              const timeStr = orderDate.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
              const totalPieces = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
              const deliveryLabel = order.shipping_method_label || (order.address ? 'Envío a Domicilio' : 'Retiro en Tienda');
              
              const isExpanded = expandedOrderId === order.id;
              
              return (
                <div key={order.id} className="mobile-order-card-container">
                  <div className="mobile-order-card" onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}>
                    <div className="mobile-order-card-header">
                      <span className="mobile-order-number">#{formatOrderNumber(order)}</span>
                      <span className="mobile-order-price">{formatCurrency(order.totalAmount)}</span>
                    </div>
                    <div className="mobile-order-subtitle">
                      {order.customerName || 'N/A'} • {totalPieces} {totalPieces === 1 ? 'artículo' : 'artículos'} • {timeStr}
                    </div>
                    <div className="mobile-order-badges">
                      <span className={`mobile-badge mobile-badge--${getStatusBadgeVariant(order)}`}>{order.statusDisplay || order.status}</span>
                    </div>
                    <div className="mobile-order-footer">
                      {deliveryLabel}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="mobile-order-expanded-content">
                      {(() => {
                        const allItems = order.items || order.order_items || order.lines || [];
                        return (
                          <div style={{ padding: 10 }}>
                            {allItems.length > 0 ? (
                              allItems.map((item, idx) => {
                                const productName = item.name || item.title || item.product_name || 'Producto';
                                const productId = item.product_id || item.sku || item.barcode || '—';
                                const qty = item.quantity || 0;
                                const price = parseFloat(item.price || 0).toFixed(2);
                                const subtotal = parseFloat(item.subtotal || (price * qty) || 0).toFixed(2);
                                const size = item.size || item.selectedSize || '—';
                                const color = item.color || item.selectedColor || '—';
                                return (
                                  <div key={idx} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #eee' }}>
                                    {item.image && (
                                      <img src={item.image} alt="" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd', flexShrink: 0 }}
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                      />
                                    )}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>{productName}</div>
                                      <div style={{ fontSize: 12, color: '#666' }}>SKU/ID: {productId}</div>
                                      <div style={{ fontSize: 12, color: '#666' }}>
                                        Color: {color} | Talla: {size}
                                      </div>
                                      <div style={{ fontSize: 13, color: '#333', marginTop: 4 }}>
                                        <strong>{qty}</strong> x ${price} = <strong>${subtotal}</strong>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
                                No se encontraron productos en esta orden.
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </>
          )}
        </div>

        {totalPages > 1 && (
          <div className="my-orders__pagination">
            <div className="pagination-controls">
              <button
              onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-button"
              >
                Anterior
              </button>
              <span className="pagination-info">
                Página {currentPage} de {totalPages}
              </span>
              <button
              onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-button"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

      {/* Modal de detalles de orden */}
      {selectedOrderForDetail && (
      <OrderDetailModal
          order={{
            ...selectedOrderForDetail,
            statusColor: getStatusBadgeVariant(selectedOrderForDetail),
            status: selectedOrderForDetail.statusDisplay || selectedOrderForDetail.status
          }}
          isOpen={showOrderDetailModal}
          onClose={handleCloseOrderDetailModal}
        />
      )}
    </div>
  );
};

export default MyOrders;
