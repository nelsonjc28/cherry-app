import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CherryButton from '../../components/CherryButton/CherryButton';
import AdminNotifications from '../../components/AdminNotifications/AdminNotifications';
import OrderDetailModal from '../../components/OrderDetailModal/OrderDetailModal';
import { adminOrderService, adminNotificationService } from '../../services/api';
import useUserStore from '../../store/userStore';
import { getIconPath } from '../../utils/assetPaths';
import { formatOrderNumberDisplay } from '../../utils/orderDisplayNumber';
import './AdminOrders.css';
import './mobile_orders_list.css';

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
  const { user } = useUserStore();
  const isOperator = user?.role?.name === 'operador';
  const isVendor = user?.role?.name === 'vendedor';
  const formatOrderNumber = (order) => formatOrderNumberDisplay(order);
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
    return 50;
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
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [markingAsPaid, setMarkingAsPaid] = useState(false);
  const [orderToMarkAsPaid, setOrderToMarkAsPaid] = useState(null);
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState(false);
  const [resendingExternalApiOrderId, setResendingExternalApiOrderId] = useState(null);

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

  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [expandedOrdersDetails, setExpandedOrdersDetails] = useState({});
  const [loadingExpandedOrder, setLoadingExpandedOrder] = useState(false);

  const fetchOrders = async (page = 1) => {
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
    
    if (!searchTerm.trim()) {
      return matchesStatus;
    }
    
    const q = searchTerm.toLowerCase().trim();
    
    // Buscar en campos principales de la orden
    const matchesOrderFields = order.orderNumber.toLowerCase().includes(q) ||
                               order.customerEmail?.toLowerCase().includes(q) ||
                               order.customerName?.toLowerCase().includes(q) ||
                               String(order.customerId || order.user_id || '').includes(q) ||
                               order.customerPhone?.includes(q);
    
    if (matchesOrderFields) return matchesStatus;
    
    // Buscar en productos de la orden
    const orderItems = order.items || [];
    const matchesProduct = orderItems.some(item => {
      const productName = (item.name || item.title || '').toLowerCase();
      const productId = String(item.product_id || item.id || '');
      return productName.includes(q) || productId.includes(q) || item.barcode?.includes(q) || item.sku?.toLowerCase().includes(q);
    });
    
    return matchesStatus && matchesProduct;
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
      'pendiente_pago': 'yellow',
      'pending_payment': 'yellow',
      'pagado': 'green',
      'en_espera_envio': 'blue',
      'enviado': 'green',
      'cancelled': 'red',
      'cancelado': 'red',
      'failed': 'red'
    };
    return colorMap[status] || 'gray';
  };

  const getAdminStatusBadgeVariant = (order) => {
    const st = (order.status || '').toString().toLowerCase();
    const pm = (order.payment_method || '').toString().toLowerCase();
    if (st === 'pendiente_pago' && order.paid_with_credit && pm === 'credito') {
      return 'credit-pending';
    }
    return getStatusColor(st);
  };

  const isPendingPaymentStatus = (order) => {
    const s = (order?.status || '').toString().toLowerCase();
    return s === 'pendiente_pago' || s === 'pending_payment';
  };

  /** Flujo que usa POST mark-credit-paid (anticipo / crédito Oro-Diamante). Resto: PUT status pagado. */
  const shouldUseMarkCreditPaidEndpoint = (order) => {
    if (!order) return false;
    const isAdvance = !!order.is_advance_order;
    const creditUsed = parseFloat(order.credit_used ?? 0);
    const isCredit = !!order.paid_with_credit && creditUsed > 0.0001;
    return isAdvance || isCredit;
  };

  const getStatusOptions = (currentStatus) => {
    const statusFlow = {
      'pending': ['pagado'],
      'pendiente_pago': ['pagado', 'cancelled'],
      'pending_payment': ['pagado', 'cancelled'],
      'pagado': ['en_espera_envio'],
      'en_espera_envio': ['enviado'],
      'enviado': [], // Estado final - cliente puede calificar
      'cancelled': [],
      'cancelado': [],
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

  /** Pedidos MP/crédito sin pagar: no mostrar reenvío. Sí pedido directo, anticipado, pagados o ya enviados. */
  const canResendToExternalApi = (order) =>
    Boolean(order?.should_send_to_external_api || order?.external_api_sent);

  const handleViewOrderDetails = async (order) => {
    try {
      setLoadingOrderDetail(true);
      const response = await adminOrderService.getOrderDetails(order.id);
      const detailedOrder = response?.data?.success ? response.data.order : order;
      setSelectedOrderForDetail(detailedOrder);
      setShowOrderDetailModal(true);
    } catch (err) {
      if (window.showToast) {
        window.showToast('No se pudo cargar el detalle completo de la orden', 'warning');
      }
      setSelectedOrderForDetail(order);
      setShowOrderDetailModal(true);
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  const handleCloseOrderDetailModal = () => {
    setShowOrderDetailModal(false);
    setSelectedOrderForDetail(null);
  };

  const patchOrderExternalApiFlags = (orderId, flags) => {
    const patch = (order) =>
      order.id === orderId
        ? {
            ...order,
            external_api_sent: flags.external_api_sent ?? order.external_api_sent,
            external_api_sent_at: flags.external_api_sent_at ?? order.external_api_sent_at,
            should_send_to_external_api:
              flags.should_send_to_external_api ?? order.should_send_to_external_api,
          }
        : order;

    setOrders((prev) => prev.map(patch));
    setSelectedOrderForDetail((prev) => (prev && prev.id === orderId ? patch(prev) : prev));
  };

  const handleResendExternalApi = async (order, e) => {
    e?.stopPropagation?.();

    if (!canResendToExternalApi(order)) {
      return;
    }

    const confirmMsg = order.external_api_sent
      ? `El pedido #${formatOrderNumber(order)} ya está marcado como enviado. ¿Reenviar a la API externa?`
      : `¿Enviar el pedido #${formatOrderNumber(order)} a la API externa del almacén?`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setResendingExternalApiOrderId(order.id);
      const response = await adminOrderService.resendToExternalApi(order.id);

      if (response.data?.success) {
        const updated = response.data.order || {};
        patchOrderExternalApiFlags(order.id, {
          external_api_sent: updated.external_api_sent ?? true,
          external_api_sent_at: updated.external_api_sent_at ?? new Date().toISOString(),
          should_send_to_external_api: updated.should_send_to_external_api ?? false,
        });
        if (window.showToast) {
          const toastType = response.data.api_confirmation === 'duplicado' ? 'warning' : 'success';
          let msg = response.data.message || 'Pedido enviado a la API externa';
          if (response.data.no_pedido) {
            msg += ` (noPedido: ${response.data.no_pedido})`;
          }
          window.showToast(msg, toastType);
        }
      } else if (window.showToast) {
        window.showToast(response.data?.message || 'No se pudo enviar', 'error');
      }
    } catch (err) {
      if (window.showToast) {
        window.showToast(
          err.response?.data?.message || 'Error al enviar a la API externa',
          'error'
        );
      }
    } finally {
      setResendingExternalApiOrderId(null);
    }
  };

  const handleMarkCreditAsPaid = (order) => {
    setOrderToMarkAsPaid(order);
    setShowMarkAsPaidModal(true);
  };

  const confirmMarkCreditAsPaid = async () => {
    if (!orderToMarkAsPaid) return;

    try {
      setMarkingAsPaid(true);
      const useCreditEndpoint = shouldUseMarkCreditPaidEndpoint(orderToMarkAsPaid);
      const response = useCreditEndpoint
        ? await adminOrderService.markCreditOrderAsPaid(orderToMarkAsPaid.id)
        : await adminOrderService.updateOrderStatus(orderToMarkAsPaid.id, 'pagado');

      if (response.data.success) {
        const statusDisplay = response.data.statusDisplay || 'Pagado';
        setOrders(
          orders.map((order) =>
            order.id === orderToMarkAsPaid.id
              ? {
                  ...order,
                  status: 'pagado',
                  statusDisplay,
                  amount_pending: 0,
                  amount_paid: order.total_amount ?? orderToMarkAsPaid.total_amount,
                  credit_used: useCreditEndpoint ? 0 : order.credit_used,
                }
              : order
          )
        );

        if (selectedOrderForDetail && selectedOrderForDetail.id === orderToMarkAsPaid.id) {
          setSelectedOrderForDetail({
            ...selectedOrderForDetail,
            amount_pending: 0,
            amount_paid: orderToMarkAsPaid.total_amount,
            status: 'pagado',
            statusDisplay,
            statusRaw: 'pagado',
            credit_used: useCreditEndpoint ? 0 : selectedOrderForDetail.credit_used,
          });
        }

        if (window.showToast) {
          if (useCreditEndpoint) {
            window.showToast(
              `Orden marcada como pagada. Crédito restaurado: ${formatCurrency(response.data.data?.credit_restored || 0)}`,
              'success'
            );
          } else {
            window.showToast('Orden marcada como pagada', 'success');
          }
        }
      } else if (window.showToast) {
        window.showToast(response.data.message || 'Error al marcar la orden como pagada', 'error');
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
        <div className="filter-group desktop-only">
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
            <option value="pendiente_pago">Por pagar</option>
          </select>
        </div>

        {/* MOBILE TABS FILTER */}
        <div className="mobile-tabs-container mobile-only">
          <button 
            className={`mobile-tab ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => updateStatusFilter('all')}
          >Todos</button>
          <button 
            className={`mobile-tab ${statusFilter === 'en_espera_envio' ? 'active' : ''}`}
            onClick={() => updateStatusFilter('en_espera_envio')}
          >No preparados</button>
          <button 
            className={`mobile-tab ${statusFilter === 'pendiente_pago' ? 'active' : ''}`}
            onClick={() => updateStatusFilter('pendiente_pago')}
          >No pagados</button>
          <button 
            className={`mobile-tab ${statusFilter === 'pagado' ? 'active' : ''}`}
            onClick={() => updateStatusFilter('pagado')}
          >Pagados</button>
          <button 
            className={`mobile-tab ${statusFilter === 'enviado' ? 'active' : ''}`}
            onClick={() => updateStatusFilter('enviado')}
          >Enviados</button>
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

      </div>

      <div className="admin-orders__table-container">
        {paginatedOrders.length === 0 ? (
          <div className="admin-orders__empty">
            <p>No se encontraron órdenes con los filtros seleccionados.</p>
          </div>
        ) : (
          <>
          <div className="table-scroll-wrapper desktop-only">
            {isVendor ? (
              // Tabla simplificada para vendedores (sin columna Productos)
              <table className="admin-orders__table admin-orders__table--vendor">
                <thead>
                  <tr>
                    <th>No. de pedido</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Entrega</th>
                    <th>Piezas</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order) => {
                    const orderDate = new Date(order.created_at);
                    const dateStr = orderDate.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
                    const totalPieces = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
                    const deliveryLabel = order.shipping_method_label || (order.address ? 'Envío a Domicilio' : 'Retiro en Tienda');
                    return (
                      <tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => handleViewOrderDetails(order)}>
                        <td><span className="vendor-orders__link" style={{ textDecoration: 'underline', color: '#b8002f', cursor: 'pointer' }}>#{formatOrderNumber(order)}</span></td>
                        <td>{dateStr}</td>
                        <td>{order.customerName || 'N/A'}</td>
                        <td>{deliveryLabel}</td>
                        <td>{totalPieces}</td>
                        <td>{formatCurrency(order.totalAmount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              // Tabla completa para admin/operador
              <table className="admin-orders__table">
                <thead>
                  <tr>
                    <th>No. de pedido</th>
                    <th>Productos</th>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Cliente</th>
                    <th>Método de entrega</th>
                    <th>Cant. piezas</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order) => {
                    const orderDate = new Date(order.created_at);
                    const dateStr = orderDate.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
                    const timeStr = orderDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                    const totalPieces = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
                    const deliveryLabel = order.shipping_method_label || (order.address ? 'Envío a Domicilio' : 'Retiro en Tienda');
                    const productImages = order.items?.slice(0, 3).map(item => item.image).filter(Boolean) || [];
                    const isCreditPorPagar = order.status === 'pendiente_pago' && order.paid_with_credit && (order.payment_method || '').toString().toLowerCase() === 'credito';
                    return (
                      <tr key={order.id} className={`${highlightedOrderId === order.id ? 'highlighted' : ''}${isCreditPorPagar ? ' admin-orders__row--credit-pending' : ''}`}>
                        <td className="order-number-cell">#{formatOrderNumber(order)}</td>
                        <td className="order-products-cell">
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'flex-start' }}>
                            {productImages.length > 0 ? productImages.map((img, idx) => (
                              <img key={idx} src={img} alt={`Producto ${idx + 1}`} style={{ width: '30px', height: '30px', objectFit: 'cover', borderRadius: '3px', border: '1px solid #ddd' }} onError={(e) => { e.target.style.display = 'none'; }} />
                            )) : <span style={{ fontSize: '12px', color: '#999' }}>-</span>}
                            {order.items && order.items.length > 3 && <span style={{ fontSize: '11px', color: '#666', marginLeft: '4px' }}>+{order.items.length - 3}</span>}
                          </div>
                        </td>
                        <td className="order-date-cell">{dateStr}</td>
                        <td className="order-time-cell">{timeStr}</td>
                        <td className="order-customer-cell">{order.customerName || 'N/A'}</td>
                        <td className="order-delivery-cell">{deliveryLabel}</td>
                        <td className="order-pieces-cell">{totalPieces}</td>
                        <td className="order-total-cell">{formatCurrency(order.totalAmount)}</td>
                        <td className="order-status-cell">
                          <span className={`status-badge status-badge--${getAdminStatusBadgeVariant(order)}`}>
                            {order.statusDisplay || order.status}
                          </span>
                        </td>
                        <td className="order-actions-cell">
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                            <button className="order-action-btn order-action-btn--detail" onClick={() => handleViewOrderDetails(order)} disabled={loadingOrderDetail} data-tooltip="Ver Detalle"
                              onMouseEnter={(e) => { const b = e.currentTarget; const t = b.getAttribute('data-tooltip'); let tp = document.querySelector('.order-tooltip'); if (!tp) { tp = document.createElement('div'); tp.className = 'order-tooltip'; document.body.appendChild(tp); } tp.textContent = t; tp.style.display = 'block'; const r = b.getBoundingClientRect(); const tr = tp.getBoundingClientRect(); tp.style.left = `${r.left + r.width / 2 - tr.width / 2}px`; tp.style.top = `${r.top - tr.height - 10}px`; }}
                              onMouseLeave={() => { const tp = document.querySelector('.order-tooltip'); if (tp) tp.style.display = 'none'; }}
                            >{loadingOrderDetail ? '⏳' : '👁️'}</button>
                            {!isOperator && isPendingPaymentStatus(order) && (
                              <button className="order-action-btn order-action-btn--mark-paid" onClick={() => handleMarkCreditAsPaid(order)} data-tooltip="Marcar como Pagada"
                                onMouseEnter={(e) => { const b = e.currentTarget; const t = b.getAttribute('data-tooltip'); let tp = document.querySelector('.order-tooltip'); if (!tp) { tp = document.createElement('div'); tp.className = 'order-tooltip'; document.body.appendChild(tp); } tp.textContent = t; tp.style.display = 'block'; const r = b.getBoundingClientRect(); const tr = tp.getBoundingClientRect(); tp.style.left = `${r.left + r.width / 2 - tr.width / 2}px`; tp.style.top = `${r.top - tr.height - 10}px`; }}
                                onMouseLeave={() => { const tp = document.querySelector('.order-tooltip'); if (tp) tp.style.display = 'none'; }}
                              >💰</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          
          {/* MOBILE LIST */}
          <div className="mobile-orders-list mobile-only">
            {paginatedOrders.map((order) => {
              const orderDate = new Date(order.created_at);
              const timeStr = orderDate.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
              const totalPieces = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
              const deliveryLabel = order.shipping_method_label || (order.address ? 'Envío a Domicilio' : 'Retiro en Tienda');
               
              const isExpanded = expandedOrderId === order.id;

              const toggleExpand = async () => {
                if (isExpanded) {
                  setExpandedOrderId(null);
                  return;
                }
                setExpandedOrderId(order.id);
                if (!expandedOrdersDetails[order.id]) {
                  try {
                    setLoadingExpandedOrder(true);
                    const resp = await adminOrderService.getOrderDetails(order.id);
                    const detailed = resp?.data?.order || resp?.data || resp;
                    setExpandedOrdersDetails(prev => ({ ...prev, [order.id]: detailed }));
                  } catch (err) {
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
                      <span className="mobile-order-number">#{formatOrderNumber(order)}</span>
                      <span className="mobile-order-price">{formatCurrency(order.totalAmount)}</span>
                    </div>
                    <div className="mobile-order-subtitle">
                      {order.customerName || 'N/A'} • {totalPieces} {totalPieces === 1 ? 'artículo' : 'artículos'} • {timeStr}
                    </div>
                    <div className="mobile-order-badges">
                      {(!isVendor && order.is_prepared) && <span className="mobile-badge mobile-badge--green">Preparado</span>}
                      {(!isVendor && !order.is_prepared) && <span className="mobile-badge mobile-badge--yellow">No preparado</span>}
                      <span className={`mobile-badge mobile-badge--${getAdminStatusBadgeVariant(order)}`}>{order.statusDisplay || order.status}</span>
                    </div>
                    <div className="mobile-order-footer">
                      {deliveryLabel}
                    </div>
                  </div>
                   
                  {isExpanded && (
                    <div className="mobile-order-expanded-content">
                      {(() => {
                        const detail = expandedOrdersDetails[order.id] || order;
                        const allItems = detail.items || detail.order_items || detail.lines || order.items || [];
                        
                        const address = detail.address || order.address;
                        const addrStr = address ? (address.street_address || '') + (address.street_number_ext ? ' Ext. ' + address.street_number_ext : '') + (address.street_number_int ? ' Int. ' + address.street_number_int : '') + (address.colonia ? ', ' + address.colonia : '') + (address.city ? ', ' + address.city : '') + (address.state ? ', ' + address.state : '') + (address.postal_code ? ' CP: ' + address.postal_code : '') : null;
                        
                        return (
                          <div style={{ padding: 10 }}>
                            {/* Dirección de envío */}
                            {deliveryLabel !== 'Retiro en Tienda' && addrStr && (
                              <div style={{ marginBottom: 12, fontSize: 13, color: '#555' }}>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>📍 Dirección de envío:</div>
                                <div style={{ lineHeight: 1.5 }}>{addrStr}</div>
                              </div>
                            )}
                            {deliveryLabel === 'Retiro en Tienda' && (
                              <div style={{ marginBottom: 12, fontSize: 13, color: '#555' }}>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>📍 Retiro en tienda</div>
                              </div>
                            )}
                            {/* Productos */}
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
                            ) : loadingExpandedOrder ? (
                              <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>Cargando productos…</div>
                            ) : (
                              <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
                                No se encontraron productos en esta orden.
                                <div style={{ marginTop: 10 }}>
                                  <button className="mobile-contact-btn" onClick={async (e) => { e.stopPropagation(); try { setLoadingExpandedOrder(true); const resp = await adminOrderService.getOrderDetails(order.id); const detailed = resp?.data?.order || resp?.data || resp; setExpandedOrdersDetails(prev => ({ ...prev, [order.id]: detailed })); } catch (err) { if (window.showToast) window.showToast('Error recargando detalle', 'error'); } finally { setLoadingExpandedOrder(false); } }}>
                                    Recargar
                                  </button>
                                </div>
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
                {shouldUseMarkCreditPaidEndpoint(orderToMarkAsPaid) ? (
                  <li>
                    Restaurará <strong>{formatCurrency(orderToMarkAsPaid.credit_used || 0)}</strong> al crédito disponible del cliente (cuando aplique)
                  </li>
                ) : null}
                <li>Notificará al cliente el cambio de estado</li>
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
            statusColor: getAdminStatusBadgeVariant(selectedOrderForDetail),
            statusRaw: selectedOrderForDetail.statusRaw || selectedOrderForDetail.status,
            status: selectedOrderForDetail.statusDisplay || selectedOrderForDetail.status
          }}
          isOpen={showOrderDetailModal}
          onClose={handleCloseOrderDetailModal}
          isAdmin={true}
          onOrderUpdated={(updatedOrder) => {
            patchOrderExternalApiFlags(updatedOrder.id, {
              external_api_sent: updatedOrder.external_api_sent,
              external_api_sent_at: updatedOrder.external_api_sent_at,
              should_send_to_external_api: updatedOrder.should_send_to_external_api,
            });
          }}
        />
      )}
    </div>
  );
};

export default AdminOrders;
