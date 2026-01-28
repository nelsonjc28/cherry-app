import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CherryButton from '../../components/CherryButton/CherryButton';
import AdminNotifications from '../../components/AdminNotifications/AdminNotifications';
import OrderDetailModal from '../../components/OrderDetailModal/OrderDetailModal';
import { adminOrderService, adminNotificationService } from '../../services/api';
import { getIconPath } from '../../utils/assetPaths';
import useUserStore from '../../store/userStore';
import './AdminOrders.css';

// Función para determinar el color del texto según el color de fondo
const getContrastColor = (hexColor) => {
  if (!hexColor) return '#333';
  
  // Si el color no tiene #, agregarlo
  const hex = hexColor.startsWith('#') ? hexColor : `#${hexColor}`;
  
  // Convertir hex a RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  // Calcular luminancia
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Retornar blanco o negro según la luminancia
  return luminance > 0.5 ? '#000' : '#fff';
};

// Función helper para formatear el número de orden igual que en API externa
const formatOrderNumber = (order) => {
  const prefix = (order.is_advance_order ?? false) ? 'PD' : 'CD';
  const orderId = order.id || parseInt(order.orderNumber) || 0;
  return prefix + String(orderId).padStart(4, '0');
};

const AdminOrders = () => {
  const { user } = useUserStore();
  const isOperator = user?.role?.name === 'operador';
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Cargar filtros desde localStorage o URL params
  const getInitialStatusFilter = () => {
    return searchParams.get('status') || localStorage.getItem('adminOrders_statusFilter') || 'all';
  };
  
  const getInitialSearchTerm = () => {
    return searchParams.get('search') || localStorage.getItem('adminOrders_searchTerm') || '';
  };
  
  const getInitialItemsPerPage = () => {
    return parseInt(searchParams.get('itemsPerPage') || localStorage.getItem('adminOrders_itemsPerPage') || '10', 10);
  };
  
  const getInitialCurrentPage = () => {
    return parseInt(searchParams.get('page') || localStorage.getItem('adminOrders_currentPage') || '1', 10);
  };

  const [currentPage, setCurrentPage] = useState(getInitialCurrentPage());
  const [statusFilter, setStatusFilter] = useState(getInitialStatusFilter());
  const [searchTerm, setSearchTerm] = useState(getInitialSearchTerm());
  const [itemsPerPage, setItemsPerPage] = useState(getInitialItemsPerPage());
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [highlightedOrderId, setHighlightedOrderId] = useState(null);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [markingAsPaid, setMarkingAsPaid] = useState(false);
  const [orderToMarkAsPaid, setOrderToMarkAsPaid] = useState(null);
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState(false);

  // Función para actualizar filtros y guardarlos
  const updateStatusFilter = (value) => {
    setStatusFilter(value);
    localStorage.setItem('adminOrders_statusFilter', value);
    const newParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      newParams.delete('status');
    } else {
      newParams.set('status', value);
    }
    newParams.set('page', '1'); // Reset a página 1 cuando cambia el filtro
    setSearchParams(newParams, { replace: true });
    setCurrentPage(1);
    localStorage.setItem('adminOrders_currentPage', '1');
  };

  const updateSearchTerm = (value) => {
    setSearchTerm(value);
    localStorage.setItem('adminOrders_searchTerm', value);
    const newParams = new URLSearchParams(searchParams);
    if (value === '') {
      newParams.delete('search');
    } else {
      newParams.set('search', value);
    }
    newParams.set('page', '1'); // Reset a página 1 cuando cambia la búsqueda
    setSearchParams(newParams, { replace: true });
    setCurrentPage(1);
    localStorage.setItem('adminOrders_currentPage', '1');
  };

  const updateItemsPerPage = (value) => {
    setItemsPerPage(value);
    localStorage.setItem('adminOrders_itemsPerPage', value.toString());
    const newParams = new URLSearchParams(searchParams);
    newParams.set('itemsPerPage', value.toString());
    newParams.set('page', '1'); // Reset a página 1 cuando cambia items por página
    setSearchParams(newParams, { replace: true });
    setCurrentPage(1);
    localStorage.setItem('adminOrders_currentPage', '1');
  };

  const updateCurrentPage = (value) => {
    setCurrentPage(value);
    localStorage.setItem('adminOrders_currentPage', value.toString());
    const newParams = new URLSearchParams(searchParams);
    if (value === 1) {
      newParams.delete('page');
    } else {
      newParams.set('page', value.toString());
    }
    setSearchParams(newParams, { replace: true });
  };

  // Cargar órdenes y notificaciones
  useEffect(() => {
    // Establecer título de la página
    document.title = 'Gestión de Órdenes - Admin - Cherry Central';
    
    fetchOrders();
    fetchUnreadCount();
    
    // Actualizar contador cada 30 segundos
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
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
        navigate(`/admin/ordenes?${newSearchParams.toString()}`, { replace: true });
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [searchParams, navigate]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminOrderService.getAllOrders();
      
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

  const fetchUnreadCount = async () => {
    try {
      const response = await adminNotificationService.getUnreadCount();
      if (response.data.success) {
        setUnreadNotifications(response.data.unread_count || 0);
      }
    } catch (err) {
      // Error silencioso para no interrumpir la experiencia
    }
  };

  // Filtrar y ordenar órdenes
  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // Paginación
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const handleStatusChange = async (orderId, status) => {
    setSelectedOrder(orderId);
    setNewStatus(status);
    setShowStatusModal(true);
  };

  const confirmStatusChange = async () => {
    if (!selectedOrder || !newStatus) return;

    try {
      setUpdatingStatus(true);
      const response = await adminOrderService.updateOrderStatus(selectedOrder, newStatus);
      
      if (response.data.success) {
        // Actualizar la orden en el estado local
        setOrders(orders.map(order => 
          order.id === selectedOrder 
            ? { ...order, status: newStatus, statusDisplay: response.data.statusDisplay }
            : order
        ));
        
        if (window.showToast) {
          window.showToast('Estado de la orden actualizado correctamente', 'success');
        }
      } else {
        if (window.showToast) {
          window.showToast(response.data.message || 'Error al actualizar el estado', 'error');
        }
      }
    } catch (err) {
      if (window.showToast) {
        window.showToast('Error de conexión al actualizar el estado', 'error');
      }
    } finally {
      setUpdatingStatus(false);
      setShowStatusModal(false);
      setSelectedOrder(null);
      setNewStatus('');
    }
  };

  const getStatusColor = (status) => {
    const colorMap = {
      'pending': 'yellow',
      'pagado': 'green',
      'en_espera_envio': 'blue',
      'enviado': 'green',
      'cancelled': 'red',
      'failed': 'red'
    };
    return colorMap[status] || 'gray';
  };

  const getStatusOptions = (currentStatus) => {
    const statusFlow = {
      'pending': ['pagado'],
      'pagado': ['en_espera_envio'],
      'en_espera_envio': ['enviado'],
      'enviado': [], // Estado final - cliente puede calificar
      'cancelled': [],
      'failed': ['pending']
    };
    
    return statusFlow[currentStatus] || [];
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
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

  const handleMarkCreditAsPaid = (order) => {
    setOrderToMarkAsPaid(order);
    setShowMarkAsPaidModal(true);
  };

  const confirmMarkCreditAsPaid = async () => {
    if (!orderToMarkAsPaid) return;

    try {
      setMarkingAsPaid(true);
      const response = await adminOrderService.markCreditOrderAsPaid(orderToMarkAsPaid.id);
      
      if (response.data.success) {
        // Actualizar la orden en el estado local
        setOrders(orders.map(order => 
          order.id === orderToMarkAsPaid.id 
            ? { 
                ...order, 
                status: 'pagado',
                statusDisplay: 'Pagado',
                amount_pending: 0,
                amount_paid: order.total_amount,
                credit_used: 0 // Establecer crédito usado en 0 cuando se marca como pagada
              }
            : order
        ));
        
        // Si el modal de detalles está abierto para esta orden, actualizarlo también
        if (selectedOrderForDetail && selectedOrderForDetail.id === orderToMarkAsPaid.id) {
          setSelectedOrderForDetail({
            ...selectedOrderForDetail,
            amount_pending: 0,
            amount_paid: orderToMarkAsPaid.total_amount,
            status: 'pagado',
            statusDisplay: 'Pagado',
            credit_used: 0 // Establecer crédito usado en 0 cuando se marca como pagada
          });
        }
        
        if (window.showToast) {
          window.showToast(
            `Orden marcada como pagada. Crédito restaurado: ${formatCurrency(response.data.data?.credit_restored || 0)}`,
            'success'
          );
        }
      } else {
        if (window.showToast) {
          window.showToast(response.data.message || 'Error al marcar la orden como pagada', 'error');
        }
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Error de conexión al marcar la orden como pagada';
      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      }
    } finally {
      setMarkingAsPaid(false);
      setShowMarkAsPaidModal(false);
      setOrderToMarkAsPaid(null);
    }
  };

  if (loading) {
    return (
      <div className="admin-orders">
        <div className="admin-orders__loading">
          <div className="loading-spinner"></div>
          <p>Cargando órdenes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-orders">
        <div className="admin-orders__error">
          <p>Error: {error}</p>
          <CherryButton onClick={fetchOrders} variant="red" size="medium">
            Reintentar
          </CherryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-orders">
      <div className="admin-orders__header">
        <div className="admin-orders__title-section">
          <h1 className="admin-orders__title">Gestión de Órdenes</h1>
          <button 
            className="notifications-btn"
            onClick={() => setShowNotifications(true)}
            title="Ver notificaciones"
          >
            <img src={getIconPath('Bell.svg')} alt="Notificaciones" />
            {unreadNotifications > 0 && (
              <span className="notifications-badge">{unreadNotifications}</span>
            )}
          </button>
        </div>
        <div className="admin-orders__stats">
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

      <div className="admin-orders__filters">
        <div className="filter-group">
          <label htmlFor="status-filter">Estado:</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => updateStatusFilter(e.target.value)}
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
            onChange={(e) => updateSearchTerm(e.target.value)}
            placeholder="Número de orden, email o nombre..."
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="items-per-page">Mostrar:</label>
          <select
            id="items-per-page"
            value={itemsPerPage}
            onChange={(e) => {
              updateItemsPerPage(Number(e.target.value));
            }}
            className="filter-select"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="admin-orders__table-container">
        {paginatedOrders.length === 0 ? (
          <div className="admin-orders__empty">
            <p>No se encontraron órdenes con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="table-scroll-wrapper">
            <table className="admin-orders__table">
              <thead>
                <tr>
                  <th>No. de pedido</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Cliente</th>
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
                      <td className="order-customer-cell">{order.customerName || 'N/A'}</td>
                      <td className="order-pieces-cell">{totalPieces}</td>
                      <td className="order-total-cell">{formatCurrency(order.totalAmount)}</td>
                      <td className="order-status-cell">
                        <span className={`status-badge status-badge--${getStatusColor(order.status)}`}>
                          {order.statusDisplay || order.status}
                        </span>
                      </td>
                      <td className="order-actions-cell">
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
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
                          {!isOperator && ((order.paid_with_credit && order.credit_used > 0) || (order.is_advance_order && order.status !== 'pagado')) && (
                            <button
                              className="order-action-btn order-action-btn--mark-paid"
                              onClick={() => handleMarkCreditAsPaid(order)}
                              data-tooltip="Marcar como Pagada"
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
                              💰
                            </button>
                          )}
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
        <div className="admin-orders__pagination">
          <div className="pagination-controls">
            <button
              onClick={() => updateCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-button"
            >
              Anterior
            </button>
            <span className="pagination-info">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => updateCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-button"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmación de cambio de estado */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirmar Cambio de Estado</h3>
              <button 
                className="modal-close"
                onClick={() => setShowStatusModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>¿Estás seguro de que deseas cambiar el estado de la orden a <strong>{newStatus}</strong>?</p>
              <p>Esta acción enviará una notificación al cliente.</p>
            </div>
            <div className="modal-footer">
              <CherryButton
                variant="outline"
                onClick={() => setShowStatusModal(false)}
                disabled={updatingStatus}
              >
                Cancelar
              </CherryButton>
              <CherryButton
                variant="red"
                onClick={confirmStatusChange}
                disabled={updatingStatus}
              >
                {updatingStatus ? 'Actualizando...' : 'Confirmar'}
              </CherryButton>
            </div>
          </div>
        </div>
      )}

      {/* Panel de notificaciones */}
      <AdminNotifications 
        isOpen={showNotifications} 
        onClose={() => {
          setShowNotifications(false);
          fetchUnreadCount(); // Actualizar contador al cerrar
        }}
      />

      {/* Modal de confirmación para marcar orden a crédito como pagada */}
      {showMarkAsPaidModal && orderToMarkAsPaid && (
        <div className="modal-overlay" onClick={() => setShowMarkAsPaidModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Marcar Orden como Pagada</h3>
              <button 
                className="modal-close"
                onClick={() => setShowMarkAsPaidModal(false)}
                disabled={markingAsPaid}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>¿Estás seguro de que deseas marcar la orden <strong>#{formatOrderNumber(orderToMarkAsPaid)}</strong> como pagada?</p>
              <p>Esta acción:</p>
              <ul style={{ textAlign: 'left', marginTop: '10px' }}>
                <li>Marcará la orden como <strong>pagada</strong></li>
                <li>Restaurará <strong>{formatCurrency(orderToMarkAsPaid.credit_used || 0)}</strong> al crédito disponible del cliente</li>
                <li>Enviará una notificación al cliente</li>
              </ul>
            </div>
            <div className="modal-footer">
              <CherryButton
                variant="outline"
                onClick={() => setShowMarkAsPaidModal(false)}
                disabled={markingAsPaid}
              >
                Cancelar
              </CherryButton>
              <CherryButton
                variant="red"
                onClick={confirmMarkCreditAsPaid}
                disabled={markingAsPaid}
              >
                {markingAsPaid ? 'Procesando...' : 'Confirmar Pago'}
              </CherryButton>
            </div>
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
          isAdmin={true}
        />
      )}
    </div>
  );
};

export default AdminOrders;
