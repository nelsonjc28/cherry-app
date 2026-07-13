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
            <table className="vendor-orders__table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Método</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.orderNumber}</td>
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
                    <td>{order.date}</td>
                    <td>
                      <span
                        className={`vendor-orders__status vendor-orders__status--${order.status}`}
                      >
                        {formatStatus(order.status)}
                      </span>
                    </td>
                    <td>{order.payment_method}</td>
                    <td>${order.total_amount.toFixed(2)}</td>
                    <td>
                      <button
                        className="vendor-orders__detail-btn"
                        onClick={() => handleViewDetail(order)}
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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