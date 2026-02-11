import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CherryButton from '../../components/CherryButton/CherryButton';
import OrderDetailModal from '../../components/OrderDetailModal/OrderDetailModal';
import { orderService } from '../../services/api';
import api from '../../config/axios';
import './MyOrders.css';

// Función helper para formatear el número de orden igual que en API externa
const formatOrderNumber = (order) => {
  const prefix = (order.is_advance_order ?? false) ? 'PD' : 'CD';
  const orderId = order.id || parseInt(order.orderNumber) || 0;
  return prefix + String(orderId).padStart(4, '0');
};

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

  const handlePayRemainder = async (orderId) => {
    try {
      if (window.showToast) {
        window.showToast('Creando preferencia de pago...', 'info');
      }
      
      const response = await api.post(`/payment/retry-remainder/${orderId}`);
      
      if (response.data.success) {
        // Redirigir a la URL de pago de MercadoPago
        const paymentUrl = response.data.data.payment_url || response.data.data.sandbox_payment_url;
        if (paymentUrl) {
          window.location.href = paymentUrl;
        } else {
          if (window.showToast) {
            window.showToast('No se pudo obtener la URL de pago', 'error');
          }
        }
      } else {
        if (window.showToast) {
          window.showToast(response.data.message || 'Error al crear la preferencia de pago', 'error');
        }
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
        // Redirigir a la URL de pago de MercadoPago
        const paymentUrl = response.data.data.payment_url || response.data.data.sandbox_payment_url;
        if (paymentUrl) {
          window.location.href = paymentUrl;
        } else {
          if (window.showToast) {
            window.showToast('No se pudo obtener la URL de pago', 'error');
          }
        }
      } else {
        if (window.showToast) {
          window.showToast(response.data.message || 'Error al crear la preferencia de pago', 'error');
        }
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
          <div className="table-scroll-wrapper">
            <table className="my-orders__table">
              <thead>
                <tr>
                  <th>No. de pedido</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Cant. piezas</th>
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
                  
                  return (
                    <tr 
                      key={order.id}
                      className={`${highlightedOrderId === order.id ? 'highlighted' : ''}`}
                    >
                      <td className="order-number-cell">#{formatOrderNumber(order)}</td>
                      <td className="order-date-cell">{dateStr}</td>
                      <td className="order-time-cell">{timeStr}</td>
                      <td className="order-pieces-cell">{totalPieces}</td>
                      <td className="order-total-cell">{formatCurrency(order.totalAmount)}</td>
                      <td className="order-status-cell">
                        <span className={`status-badge status-badge--${getStatusColor(order.status)}`}>
                          {order.statusDisplay || order.status}
                        </span>
                      </td>
                      <td className="order-actions-cell">
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                          {/* Botón para pagar saldo pendiente (cuando se pagó parcialmente con crédito) */}
                          {order.paid_with_credit && 
                           parseFloat(order.amount_pending || 0) > 0 && 
                           (order.statusRaw === 'pendiente_pago' || order.status === 'pendiente_pago' || order.statusDisplay === 'Pendiente de Pago') && (
                            <button
                              className="order-action-btn order-action-btn--pay"
                              onClick={() => handlePayRemainder(order.id)}
                              data-tooltip={`Pagar ${formatCurrency(order.amount_pending)}`}
                              onMouseEnter={(e) => {
                                const button = e.currentTarget;
                                const tooltipText = button.getAttribute('data-tooltip');
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
                              }}
                              onMouseLeave={() => {
                                const tooltip = document.querySelector('.order-tooltip');
                                if (tooltip) tooltip.style.display = 'none';
                              }}
                            >
                              💳
                            </button>
                          )}
                          {/* Botón para pagar orden pendiente completa */}
                          {(order.status === 'pending' || order.status === 'pendiente_pago' || order.statusDisplay === 'Pendiente' || order.statusDisplay === 'Pendiente de Pago') && 
                           !order.paid_with_credit && (
                            <button
                              className="order-action-btn order-action-btn--pay"
                              onClick={() => handlePayPendingOrder(order.id)}
                              data-tooltip={`Pagar ${formatCurrency(order.totalAmount)}`}
                              onMouseEnter={(e) => {
                                const button = e.currentTarget;
                                const tooltipText = button.getAttribute('data-tooltip');
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
                              }}
                              onMouseLeave={() => {
                                const tooltip = document.querySelector('.order-tooltip');
                                if (tooltip) tooltip.style.display = 'none';
                              }}
                            >
                              💳
                            </button>
                          )}
                          <button
                            className="order-action-btn order-action-btn--detail"
                            onClick={() => handleViewOrderDetails(order)}
                            data-tooltip="Ver Detalle"
                            onMouseEnter={(e) => {
                              const button = e.currentTarget;
                              const tooltipText = button.getAttribute('data-tooltip');
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
                            }}
                            onMouseLeave={() => {
                              const tooltip = document.querySelector('.order-tooltip');
                              if (tooltip) tooltip.style.display = 'none';
                            }}
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
