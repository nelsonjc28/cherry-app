import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminNotificationService } from '../../services/api';
import { getIconPath } from '../../utils/assetPaths';
import CherryButton from '../CherryButton/CherryButton';
import './AdminNotifications.css';

const AdminNotifications = ({ isOpen, onClose }) => {
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
      setError(null);
      
      const response = await adminNotificationService.getAdminNotifications();
      
      if (response.data.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unread_count || 0);
      } else {
        setError(response.data.message || 'Error al cargar notificaciones');
      }
    } catch (err) {
      setError('Error de conexión al cargar notificaciones');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await adminNotificationService.markAsRead(notificationId);
      
      if (response.data.success) {
        setNotifications(notifications.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      if (window.showToast) {
        window.showToast('Error al marcar notificación como leída', 'error');
      }
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await adminNotificationService.markAllAsRead();
      
      if (response.data.success) {
        setNotifications(notifications.map(notification => 
          ({ ...notification, is_read: true })
        ));
        setUnreadCount(0);
        
        if (window.showToast) {
          window.showToast('Todas las notificaciones marcadas como leídas', 'success');
        }
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      if (window.showToast) {
        window.showToast('Error al marcar todas las notificaciones', 'error');
      }
    }
  };

  const getNotificationIcon = (type, notification) => {
    // Si la notificación tiene información de producto, usar su imagen
    if (notification?.order?.first_product?.image) {
      return notification.order.first_product.image;
    }
    
    // Fallback a íconos por tipo
    const iconMap = {
      'payment_received': 'Money.svg',
      'order_status_changed': 'Package.svg',
      'default': 'Bell.svg'
    };
    
    return getIconPath(iconMap[type] || iconMap.default);
  };

  const formatTimeAgo = (timeString) => {
    return timeString; // Ya viene formateado desde el backend con diffForHumans()
  };

  const handleNotificationClick = async (notification) => {
    // Marcar como leída si no está leída
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Si tiene orden asociada, navegar a la página de órdenes con filtro
    if (notification.order && notification.order.id) {
      onClose(); // Cerrar el panel de notificaciones
      navigate(`/admin/ordenes?highlight=${notification.order.id}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="admin-notifications-overlay" onClick={onClose}>
      <div className="admin-notifications-panel" onClick={e => e.stopPropagation()}>
        <div className="admin-notifications-header">
          <div className="notifications-title">
            <h3>Notificaciones</h3>
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount}</span>
            )}
          </div>
          <div className="notifications-actions">
            {unreadCount > 0 && (
              <CherryButton
                variant="outline"
                size="small"
                onClick={markAllAsRead}
              >
                Marcar todas como leídas
              </CherryButton>
            )}
            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <div className="admin-notifications-content">
          {loading ? (
            <div className="notifications-loading">
              <div className="loading-spinner"></div>
              <p>Cargando notificaciones...</p>
            </div>
          ) : error ? (
            <div className="notifications-error">
              <p>Error: {error}</p>
              <CherryButton onClick={fetchNotifications} variant="red" size="small">
                Reintentar
              </CherryButton>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notifications-empty">
              <img src={getIconPath('Bell.svg')} alt="Sin notificaciones" />
              <p>No hay notificaciones</p>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.is_read ? 'read' : 'unread'} ${notification.order ? 'clickable' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    <img 
                      src={getNotificationIcon(notification.type, notification)} 
                      alt={notification?.order?.first_product?.name || notification.type}
                      style={{
                        borderRadius: notification?.order?.first_product?.image ? '4px' : 'none',
                        objectFit: 'cover',
                        width: '40px',
                        height: '40px'
                      }}
                      onError={(e) => {
                        // Si la imagen del producto falla, usar el ícono por defecto
                        e.target.src = getNotificationIcon(notification.type);
                        e.target.style.borderRadius = 'none';
                      }}
                    />
                  </div>
                  
                  <div className="notification-content">
                    <div className="notification-header">
                      <h4 className="notification-title">{notification.title}</h4>
                      <span className="notification-time">
                        {formatTimeAgo(notification.created_at)}
                      </span>
                    </div>
                    
                    <p className="notification-message">{notification.message}</p>
                    
                    {notification.order && (
                      <div className="notification-order-info">
                        <span className="order-number">Orden #{notification.order.number}</span>
                        <span className="customer-name">{notification.order.customer_name}</span>
                      </div>
                    )}
                  </div>
                  
                  {!notification.is_read && (
                    <div className="unread-indicator"></div>
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

export default AdminNotifications;








