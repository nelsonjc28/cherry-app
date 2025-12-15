import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CherryButton from '../../components/CherryButton/CherryButton';
import OrderDetailModal from '../../components/OrderDetailModal/OrderDetailModal';
import { orderService } from '../../services/api';
import './MyOrders.css';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [highlightedOrderId, setHighlightedOrderId] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
    const matchesStatus = statusFilter === 'all' || order.status.toLowerCase() === statusFilter.toLowerCase();
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const handleViewOrderDetails = (order) => {
    setSelectedOrderForDetail(order);
    setShowOrderDetailModal(true);
  };

  const handleCloseOrderDetailModal = () => {
    setShowOrderDetailModal(false);
    setSelectedOrderForDetail(null);
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
        <div className="filter-group">
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
          </select>
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
          <table className="my-orders__table">
            <thead>
              <tr>
                <th>No. de pedido</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Cant. de piezas</th>
                <th>Total</th>
                <th>Estatus</th>
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
                
                return (
                  <tr 
                    key={order.id} 
                    className={highlightedOrderId === order.id ? 'highlighted' : ''}
                  >
                    <td className="order-number-cell">#{order.orderNumber}</td>
                    <td className="order-date-cell">{dateStr}</td>
                    <td className="order-time-cell">{timeStr}</td>
                    <td className="order-pieces-cell">{totalPieces}</td>
                    <td className="order-total-cell">{formatCurrency(order.totalAmount)}</td>
                    <td className="order-status-cell">
                      <div className="status-cell-content">
                        <span className={`status-badge status-badge--${getStatusColor(order.status)}`}>
                          {order.statusDisplay || order.status}
                        </span>
                      </div>
                    </td>
                    <td className="order-actions-cell">
                      <CherryButton
                        variant="outline"
                        size="small"
                        onClick={() => handleViewOrderDetails(order)}
                      >
                        Ver Detalle
                      </CherryButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
            statusColor: getStatusColor(selectedOrderForDetail.status),
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
