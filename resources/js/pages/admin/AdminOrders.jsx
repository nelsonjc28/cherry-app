import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CherryButton from '../../components/CherryButton/CherryButton';
import AdminNotifications from '../../components/AdminNotifications/AdminNotifications';
import OrderDetailModal from '../../components/OrderDetailModal/OrderDetailModal';
import { adminOrderService, adminNotificationService } from '../../services/api';
import { getIconPath } from '../../utils/assetPaths';
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

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const itemsPerPage = 10;

  const toggleRowExpansion = (orderId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Cargar órdenes y notificaciones
  useEffect(() => {
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
            placeholder="Número de orden, email o nombre..."
            className="filter-input"
          />
        </div>
      </div>

      <div className="admin-orders__table-container">
        {paginatedOrders.length === 0 ? (
          <div className="admin-orders__empty">
            <p>No se encontraron órdenes con los filtros seleccionados.</p>
          </div>
        ) : (
          <table className="admin-orders__table">
            <thead>
              <tr>
                <th>No. de pedido</th>
                <th>Total</th>
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
                
                const isExpanded = expandedRows.has(order.id);
                
                return (
                  <React.Fragment key={order.id}>
                    <tr 
                      className={`${highlightedOrderId === order.id ? 'highlighted' : ''} ${isExpanded ? 'expanded' : ''}`}
                    >
                      <td className="order-number-cell">#{order.orderNumber}</td>
                      <td className="order-total-cell">{formatCurrency(order.totalAmount)}</td>
                      <td className="order-actions-cell">
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <button
                            className="order-expand-btn mobile-only"
                            onClick={() => toggleRowExpansion(order.id)}
                            aria-label={isExpanded ? 'Ocultar detalles' : 'Ver más detalles'}
                            data-tooltip={isExpanded ? 'Ocultar detalles' : 'Ver más detalles'}
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
                            {isExpanded ? '▼' : '▶'}
                          </button>
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
                    {isExpanded && (
                      <tr className="order-details-row mobile-only">
                        <td colSpan="3" className="order-details-cell">
                          <div className="order-details-content">
                            <div className="order-detail-item">
                              <span className="order-detail-label">Fecha:</span>
                              <span className="order-detail-value">{dateStr}</span>
                            </div>
                            <div className="order-detail-item">
                              <span className="order-detail-label">Hora:</span>
                              <span className="order-detail-value">{timeStr}</span>
                            </div>
                            <div className="order-detail-item">
                              <span className="order-detail-label">Cliente:</span>
                              <span className="order-detail-value">{order.customerName}</span>
                            </div>
                            <div className="order-detail-item">
                              <span className="order-detail-label">Cant. de piezas:</span>
                              <span className="order-detail-value">{totalPieces}</span>
                            </div>
                            <div className="order-detail-item">
                              <span className="order-detail-label">Estatus:</span>
                              <span className={`status-badge status-badge--${getStatusColor(order.status)}`}>
                                {order.statusDisplay || order.status}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="admin-orders__pagination">
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

export default AdminOrders;
