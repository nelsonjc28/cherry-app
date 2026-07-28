import React, { useState, useEffect } from 'react';
import { listMyOrders } from '../../api/vendorApi';
import OrderDetailModal from '../../components/OrderDetailModal/OrderDetailModal';
import './VendorPages.css';

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

  const handleViewDetail = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
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
          className="vendor-orders__filter"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente_pago">Pendiente de pago</option>
          <option value="pagado">Pagado</option>
          <option value="enviado">Enviado</option>
          <option value="cancelado">Cancelado</option>
        </select>
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
          <div className="vendor-orders__table-wrapper">
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
        />
      )}
    </div>
  );
};

export default VendorOrders;