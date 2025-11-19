import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userNotificationService } from '../../services/api';
import { getIconPath } from '../../utils/assetPaths';
import CherryButton from '../CherryButton/CherryButton';
import './UserNotifications.css';

const UserNotifications = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);;
      const response = await userNotificationService.getUserNotifications();;
      
      if (response.data.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unread_count || 0);;
      } else {
        setError(response.data.message || 'Error al cargar notificaciones');
      }
    } catch (err) {
      setError('Error de conexión al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await userNotificationService.markAsRead(notificationId);
      
      if (response.data.success) {
        setNotifications(notifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        ));
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (err) {
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await userNotificationService.markAllAsRead();
      
      if (response.data.success) {
        setNotifications(notifications.map(notification => ({
          ...notification,
          is_read: true
        })));
        setUnreadCount(0);
      }
    } catch (err) {
    }
  };

  const handleNotificationClick = (notification) => {
    // Marcar como leída si no lo está
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Manejar notificaciones de calificación
    if (notification.type === 'review_request') {
      // Navegar a Mis Pedidos para calificar
      navigate('/perfil/mis-pedidos');
    } else {
      // Navegar a Mis Pedidos para otras notificaciones
      navigate('/perfil/mis-pedidos');
    }
    
    onClose();
  };

  const getStatusIcon = (type, notification) => {
    // Si la notificación tiene información de producto, usar su imagen
    if (notification?.order?.first_product?.image) {
      return notification.order.first_product.image;
    }
    
    // Fallback a íconos por tipo
    switch (type) {
      case 'order_status_changed':
        return getIconPath('Package.svg');
      case 'payment_received':
        return getIconPath('CreditCard.svg');
      case 'review_request':
        return getIconPath('Star.svg'); // Usar ícono de estrella SVG en lugar de emoji
      default:
        return getIconPath('Bell.svg');
    }
  };

  const getStatusColor = (type) => {
    switch (type) {
      case 'order_status_changed':
        return '#2196F3';
      case 'payment_received':
        return '#4CAF50';
      case 'review_request':
        return '#FF6B6B'; // Color rojo para calificaciones
      default:
        return '#FF9800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="user-notifications-overlay" onClick={onClose}>
      <div className="user-notifications-modal" onClick={(e) => e.stopPropagation()}>
        <div className="user-notifications-header">
          <h3>Notificaciones</h3>
          <div className="user-notifications-actions">
            {unreadCount > 0 && (
              <CherryButton
                variant="outline"
                size="small"
                onClick={markAllAsRead}
              >
                Marcar todas como leídas
              </CherryButton>
            )}
            <button className="user-notifications-close" onClick={onClose}>
              <img src={getIconPath('Close.svg')} alt="Cerrar" />
            </button>
          </div>
        </div>

        <div className="user-notifications-content">
          {loading ? (
            <div className="user-notifications-loading">
              <div className="loading-spinner"></div>
              <p>Cargando notificaciones...</p>
            </div>
          ) : error ? (
            <div className="user-notifications-error">
              <p>{error}</p>
              <CherryButton onClick={fetchNotifications}>
                Reintentar
              </CherryButton>
            </div>
          ) : notifications.length === 0 ? (
            <div className="user-notifications-empty">
              <img src={getIconPath('Bell.svg')} alt="Sin notificaciones" />
              <p>No tienes notificaciones</p>
            </div>
          ) : (
            <div className="user-notifications-list">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`user-notification-item ${!notification.is_read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="user-notification-icon">
                    <img 
                      src={getStatusIcon(notification.type, notification)} 
                      alt={notification?.order?.first_product?.name || "Notificación"}
                      style={{ 
                        filter: notification?.order?.first_product?.image ? 'none' : `hue-rotate(${getStatusColor(notification.type)}deg)`,
                        borderRadius: notification?.order?.first_product?.image ? '4px' : 'none',
                        objectFit: 'cover',
                        width: '40px',
                        height: '40px'
                      }}
                      onError={(e) => {
                        // Si la imagen del producto falla, usar el ícono por defecto
                        e.target.src = getStatusIcon(notification.type);
                        e.target.style.filter = `hue-rotate(${getStatusColor(notification.type)}deg)`;
                        e.target.style.borderRadius = 'none';
                      }}
                    />
                  </div>
                  <div className="user-notification-content">
                    <div className="user-notification-header">
                      <h4>{notification.title}</h4>
                      <span className="user-notification-time">
                        {notification.created_at}
                      </span>
                    </div>
                    <p className="user-notification-message">
                      {notification.message}
                    </p>
                    {notification.order && (
                      <div className="user-notification-order">
                        <span className="order-number">
                          Orden #{notification.order.number}
                        </span>
                        {notification.data?.new_status && (
                          <span className="order-status">
                            Estado: {notification.data.new_status}
                          </span>
                        )}
                        {notification.data?.can_rate && (
                          <div className="rating-alert">
                            <span className="rating-alert-text">
                              ⭐ ¡Puedes calificar y comentar sobre los productos!
                            </span>
                            <CherryButton
                              variant="red"
                              size="small"
                              onClick={() => {
                                navigate('/mis-ordenes');
                                onClose();
                              }}
                            >
                              Ver pedido
                            </CherryButton>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {!notification.is_read && (
                    <div className="user-notification-dot"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserNotifications;
