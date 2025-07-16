import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import CherryButton from '../components/CherryButton/CherryButton';
import { getIconPath } from '../utils/assetPaths';
import './NotificacionesPage.css';

const NotificacionesPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read

  // Simular carga de notificaciones
  useEffect(() => {
    const loadNotifications = () => {
      setLoading(true);
      
      // Simular datos de notificaciones
      const mockNotifications = [
        {
          id: 1,
          type: 'product',
          title: 'Nuevo producto disponible',
          message: 'La blusa Cherry Style ya está disponible en tu talla',
          date: '2025-01-15T10:30:00',
          read: false,
          image: '/images/placeholder.jpg'
        },
        {
          id: 2,
          type: 'promo',
          title: 'Oferta especial',
          message: '20% de descuento en toda la colección de verano',
          date: '2025-01-14T15:45:00',
          read: true,
          image: '/images/placeholder.jpg'
        },
        {
          id: 3,
          type: 'catalog',
          title: 'Nuevo catálogo',
          message: 'El catálogo Cherry 2025-2026 ya está disponible',
          date: '2025-01-13T09:20:00',
          read: false,
          image: '/images/placeholder.jpg'
        },
        {
          id: 4,
          type: 'order',
          title: 'Pedido enviado',
          message: 'Tu pedido #12345 ha sido enviado y está en camino',
          date: '2025-01-12T14:15:00',
          read: true,
          image: '/images/placeholder.jpg'
        }
      ];

      setTimeout(() => {
        setNotifications(mockNotifications);
        setLoading(false);
      }, 1000);
    };

    loadNotifications();
  }, []);

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const deleteNotification = (notificationId) => {
    setNotifications(prev => 
      prev.filter(notif => notif.id !== notificationId)
    );
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(notif => !notif.read);
      case 'read':
        return notifications.filter(notif => notif.read);
      default:
        return notifications;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'product':
        return getIconPath('Shopping Cart.svg');
      case 'promo':
        return getIconPath('Bullhorn.svg');
      case 'catalog':
        return getIconPath('File Alt.svg');
      case 'order':
        return getIconPath('Bell.svg');
      default:
        return getIconPath('Bell.svg');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Hace unos minutos';
    } else if (diffInHours < 24) {
      return `Hace ${Math.floor(diffInHours)} horas`;
    } else {
      return date.toLocaleDateString('es-ES');
    }
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Notificaciones - Cherry Central</title>
        </Helmet>
        
        <main className="notificaciones-page">
          <div className="container">
            <div className="notificaciones-loading">
              <div className="loading-spinner"></div>
              <p>Cargando notificaciones...</p>
            </div>
          </div>
  </main>
      </>
    );
  }

  const filteredNotifications = getFilteredNotifications();

  return (
    <>
      <Helmet>
        <title>Notificaciones - Cherry Central</title>
        <meta name="description" content="Gestiona tus notificaciones de Cherry Central. Mantente al día con las últimas ofertas y novedades." />
      </Helmet>

      <main className="notificaciones-page">
        <div className="container">
          <div className="notificaciones-header">
            <h1>Notificaciones</h1>
            <div className="notificaciones-actions">
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">Todas</option>
                <option value="unread">No leídas</option>
                <option value="read">Leídas</option>
              </select>
              
              {filteredNotifications.length > 0 && (
                <CherryButton 
                  variant="outline" 
                  size="small"
                  onClick={markAllAsRead}
                >
                  Marcar todas como leídas
                </CherryButton>
              )}
            </div>
          </div>

          <div className="notificaciones-content">
            {filteredNotifications.length === 0 ? (
              <div className="notificaciones-empty">
                <div className="empty-icon">
                  <img src={getIconPath('Bell.svg')} alt="Sin notificaciones" />
                </div>
                <h2>No hay notificaciones</h2>
                <p>
                  {filter === 'all' 
                    ? 'No tienes notificaciones por el momento'
                    : filter === 'unread'
                    ? 'No tienes notificaciones sin leer'
                    : 'No tienes notificaciones leídas'
                  }
                </p>
              </div>
            ) : (
              <div className="notificaciones-list">
                {filteredNotifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`notificacion-item ${!notification.read ? 'unread' : ''}`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="notificacion-icon">
                      <img 
                        src={getNotificationIcon(notification.type)} 
                        alt={notification.type}
                      />
                    </div>
                    
                    <div className="notificacion-content">
                      <div className="notificacion-header">
                        <h3>{notification.title}</h3>
                        <span className="notificacion-date">
                          {formatDate(notification.date)}
                        </span>
                      </div>
                      <p>{notification.message}</p>
                    </div>
                    
                    <div className="notificacion-actions">
                      <button 
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="notificaciones-info">
            <div className="info-card">
              <h3>Tipos de notificaciones</h3>
              <ul>
                <li><strong>Productos:</strong> Nuevos productos disponibles</li>
                <li><strong>Promociones:</strong> Ofertas y descuentos especiales</li>
                <li><strong>Catálogos:</strong> Nuevos catálogos disponibles</li>
                <li><strong>Pedidos:</strong> Estado de tus compras</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default NotificacionesPage; 