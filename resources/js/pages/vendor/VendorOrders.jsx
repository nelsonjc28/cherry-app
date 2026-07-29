import React, { useState, useEffect } from 'react';
import { listMyOrders, getMyOrder } from '../../api/vendorApi';
import OrderDetailModal from '../../components/OrderDetailModal/OrderDetailModal';
import './VendorPages.css';
import '../admin/mobile_orders_list.css';

const VendorOrders = () => {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [expandedOrdersDetails, setExpandedOrdersDetails] = useState({});
  const [loadingExpandedOrder, setLoadingExpandedOrder] = useState(false);

  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, per_page: pagination.per_page };
      if (statusFilter) params.status = statusFilter;
      const data = await listMyOrders(params);
      setOrders(data.orders || []);
      setPagination(
        data.pagination || {
          current_page: page,
          last_page: 1,
          per_page: pagination.per_page,
          total: (data.orders || []).length,
        },
      );
    } catch (err) {
      if (window.showToast) {
        window.showToast('Error al cargar pedidos: ' + err.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.last_page) {
      fetchOrders(newPage);
    }
  };

  const handleViewDetail = async (order) => {
    setLoadingExpandedOrder(true);
    try {
      const data = await getMyOrder(order.id);
      const detailedOrder = data.order || data;
      setSelectedOrder(detailedOrder);
      setExpandedOrdersDetails((prev) => ({ ...prev, [order.id]: detailedOrder }));
    } catch (err) {
      if (window.showToast) {
        window.showToast('No se pudieron cargar los detalles completos de la orden', 'warning');
      }
      setSelectedOrder(order);
    } finally {
      setLoadingExpandedOrder(false);
      setShowModal(true);
    }
  };

  const formatStatus = (status) => {
    const map = {
      pendiente_pago: 'Pendiente de pago',
      pagado: 'Pagado',
      enviado: 'Enviado',
      cancelado: 'Cancelado',
      pending: 'Pendiente',
    };
    return map[status] || status;
  };

  return (
    <div className="vendor-page">
      <header className="vendor-page__header">
        <h1>Pedidos de tus clientes</h1>
        <p>Listado de pedidos registrados para compradores asociados.</p>
      </header>

      <div className="vendor-orders__toolbar">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="vendor-orders__filter desktop-only"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente_pago">Pendiente de pago</option>
          <option value="pagado">Pagado</option>
          <option value="enviado">Enviado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        
        {/* MOBILE TABS FILTER */}
        <div className="mobile-tabs-container mobile-only">
          <button 
            className={`mobile-tab ${statusFilter === '' ? 'active' : ''}`}
            onClick={() => setStatusFilter('')}
          >Todos</button>
          <button 
            className={`mobile-tab ${statusFilter === 'pendiente_pago' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pendiente_pago')}
          >Por pagar</button>
          <button 
            className={`mobile-tab ${statusFilter === 'pagado' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pagado')}
          >Pagados</button>
          <button 
            className={`mobile-tab ${statusFilter === 'enviado' ? 'active' : ''}`}
            onClick={() => setStatusFilter('enviado')}
          >Enviados</button>
          <button 
            className={`mobile-tab ${statusFilter === 'cancelado' ? 'active' : ''}`}
            onClick={() => setStatusFilter('cancelado')}
          >Cancelados</button>
        </div>
      </div>

      {loading ? (
        <div className="vendor-page__loading">Cargando pedidos...</div>
      ) : orders.length === 0 ? (
        <div className="vendor-page__empty">
          <h3>No hay pedidos registrados</h3>
          <p>
            Cuando crees un pedido en el checkout para uno de tus clientes,
            aparecerá aquí.
          </p>
        </div>
      ) : (
        <>
          <div className="vendor-orders__table-wrapper desktop-only">
            <div className="table-scroll-wrapper">
              <table className="vendor-orders__table">
                <thead>
                  <tr>
                    <th>No. de pedido</th>
                    <th>Productos</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Entrega</th>
                    <th>Piezas</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const orderDate = new Date(order.created_at);
                    const dateStr = orderDate.toLocaleDateString('es-MX', { 
                      year: 'numeric', 
                      month: '2-digit', 
                      day: '2-digit' 
                    });
                    const totalPieces = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
                    const deliveryLabel =
                      order.shipping_method_label
                      || (order.address ? 'Envío a Domicilio' : 'Retiro en Tienda');
                    const productImages = order.items?.slice(0, 3).map(item => item.image).filter(Boolean) || [];

                    return (
                      <tr 
                        key={order.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleViewDetail(order)}
                      >
                        <td>
                          <span className="vendor-orders__link">#{order.orderNumber}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            {productImages.length > 0 ? (
                              productImages.map((img, idx) => (
                                <img 
                                  key={idx}
                                  src={img} 
                                  alt={`Producto ${idx + 1}`}
                                  style={{ width: '30px', height: '30px', objectFit: 'cover', borderRadius: '3px', border: '1px solid #ddd' }}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              ))
                            ) : (
                              <span style={{ fontSize: '12px', color: '#999' }}>—</span>
                            )}
                            {order.items && order.items.length > 3 && (
                              <span style={{ fontSize: '11px', color: '#666', marginLeft: '4px' }}>+{order.items.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td>{dateStr}</td>
                        <td>
                          <div className="vendor-orders__buyer">
                            <strong>{order.buyer?.name || '—'}</strong>
                            <span
                              className={`vendor-category-badge vendor-category-badge--${order.buyer?.seller_category || 'none'}`}
                            >
                              {order.buyer?.seller_category || '—'}
                            </span>
                          </div>
                        </td>
                        <td>{deliveryLabel}</td>
                        <td>{totalPieces}</td>
                        <td>${parseFloat(order.total_amount || 0).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* MOBILE LIST */}
          <div className="mobile-orders-list mobile-only">
            {orders.map((order) => {
              const orderDate = new Date(order.created_at);
              const timeStr = orderDate.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
              const totalPieces = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
              const deliveryLabel = order.shipping_method_label || (order.address ? 'Envío a Domicilio' : 'Retiro en Tienda');
              const formatCurrency = (val) => `$${parseFloat(val || 0).toFixed(2)}`;
               
              const getStatusColor = (status) => {
                const colorMap = {
                  'pending': 'yellow',
                  'pagado': 'green',
                  'en_espera_envio': 'blue',
                  'enviado': 'green',
                  'cancelled': 'red',
                  'cancelado': 'red',
                  'failed': 'red',
                  'pendiente_pago': 'yellow',
                  'pago_rechazado': 'red'
                };
                return colorMap[status] || 'gray';
              };
               
              const isExpanded = expandedOrderId === order.id;

              const toggleExpand = async () => {
                if (isExpanded) {
                  setExpandedOrderId(null);
                  return;
                }
                setExpandedOrderId(order.id);
                // Fetch details if not present
                if (!expandedOrdersDetails[order.id]) {
                  try {
                    setLoadingExpandedOrder(true);
                    const data = await getMyOrder(order.id);
                    setExpandedOrdersDetails(prev => ({ ...prev, [order.id]: data.order || data }));
                  } catch (err) {
                    // fallback: keep using original order
                    if (window.showToast) window.showToast('No se pudieron cargar los detalles de la orden', 'warning');
                  } finally {
                    setLoadingExpandedOrder(false);
                  }
                }
              };
               
              return (
                <div key={order.id} className="mobile-order-card-container">
                  <div className="mobile-order-card" onClick={toggleExpand}>
                    <div className="mobile-order-card-header">
                      <span className="mobile-order-number">#{order.orderNumber}</span>
                      <span className="mobile-order-price">{formatCurrency(order.total_amount || 0)}</span>
                    </div>
                    <div className="mobile-order-subtitle">
                      {order.buyer?.name || '—'} • {totalPieces} {totalPieces === 1 ? 'artículo' : 'artículos'} • {timeStr}
                    </div>
                    <div className="mobile-order-badges">
                      <span className={`mobile-badge mobile-badge--${getStatusColor(order.status)}`}>{formatStatus(order.status)}</span>
                      <span className={`vendor-category-badge vendor-category-badge--${order.buyer?.seller_category || 'none'}`} style={{fontSize: '11px', padding: '2px 6px', margin: 0}}>
                        {order.buyer?.seller_category || '—'}
                      </span>
                    </div>
                    <div className="mobile-order-footer">
                      {deliveryLabel}
                    </div>
                  </div>
                   
                  {isExpanded && (
                    <div className="mobile-order-expanded-content">
                      {(() => {
                        const detail = expandedOrdersDetails[order.id] || order;
                        const items = detail.items || detail.order_items || detail.lines || order.items || [];
                        
                        return (
                          <div style={{ padding: 10 }}>
                            {/* Info general */}
                            <div style={{ marginBottom: 10, fontSize: 13, color: '#555' }}>
                              <div><strong>Fecha:</strong> {new Date(order.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' })}</div>
                              <div><strong>Total:</strong> ${parseFloat(order.total_amount || 0).toFixed(2)}</div>
                            </div>
                            
                            {/* Productos */}
                            {items && items.length > 0 ? (
                              items.map((item, idx) => {
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
                                      <div style={{ fontSize: 12, color: '#666' }}>SKU: {productId}</div>
                                      <div style={{ fontSize: 12, color: '#666' }}>
                                        Color: {color} | Talla: {size}
                                      </div>
                                      <div style={{ fontSize: 13, color: '#333', marginTop: 4 }}>
                                        <strong>{qty}</strong> x ${price} = ${subtotal}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : loadingExpandedOrder ? (
                              <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>Cargando productos…</div>
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

          {pagination.last_page > 1 && (
            <div className="vendor-orders__pagination">
              <button
                onClick={() => handlePageChange(pagination.current_page - 1)}
                disabled={pagination.current_page === 1}
              >
                ← Anterior
              </button>
              <span>
                Página {pagination.current_page} de {pagination.last_page} (
                {pagination.total} pedidos)
              </span>
              <button
                onClick={() => handlePageChange(pagination.current_page + 1)}
                disabled={pagination.current_page === pagination.last_page}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}

      {showModal && selectedOrder && (
        <OrderDetailModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          order={selectedOrder}
          isAdmin={true}
        />
      )}
    </div>
  );
};

export default VendorOrders;