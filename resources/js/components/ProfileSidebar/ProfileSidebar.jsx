import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { getIconPath } from '../../utils/assetPaths';
import { userNotificationService } from '../../services/api';
import UserNotifications from '../UserNotifications/UserNotifications';
import './ProfileSidebar.css';

const ProfileSidebar = () => {
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Cargar contador de notificaciones no leídas
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await userNotificationService.getUnreadCount();
        if (response.data.success) {
          setUnreadCount(response.data.unread_count || 0);
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();
  }, []);

  const menuItems = [
    {
      path: '/perfil/datos-personales',
      label: 'Datos Personales',
      icon: 'Red User.svg'
    },
    {
      path: '/perfil/mis-pedidos',
      label: 'Mis Pedidos',
      icon: 'Red Box.svg'
    },
    {
      path: '/perfil/favoritos',
      label: 'Favoritos',
      icon: 'Red Star.svg'
    },
    {
      path: '/perfil/direcciones',
      label: 'Direcciones',
      icon: 'Red Home.svg'
    },
    {
      path: '/perfil/metodos-pago',
      label: 'Métodos de Pago',
      icon: 'Red Bill.svg'
    },
    /* {
      path: '/perfil/privacidad-seguridad',
      label: 'Privacidad y Seguridad',
      icon: 'Shield.svg'
    },
    {
      path: '/terminos',
      label: 'Términos y Condiciones',
      icon: 'File Alt.svg'
    } */
  ];

  return (
    <aside className="profile-sidebar">
      <div className="profile-sidebar__header">
        <div className="profile-sidebar__title-section">
          <h2 className="profile-sidebar__title">Mi Perfil</h2>
          <p className="profile-sidebar__subtitle">Gestiona tu cuenta</p>
        </div>
        <button 
          className="profile-sidebar__notifications-btn"
          onClick={() => setShowNotifications(true)}
          title="Notificaciones"
        >
          <img src={getIconPath('Bell.svg')} alt="Notificaciones" />
          {unreadCount > 0 && (
            <span className="profile-sidebar__notification-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      <nav className="profile-sidebar__nav">
        <ul className="profile-sidebar__menu">
          {menuItems.map((item) => (
            <li key={item.path} className="profile-sidebar__menu-item">
              <NavLink
                to={item.path}
                className={({ isActive }) => 
                  `profile-sidebar__link ${isActive ? 'active' : ''}`
                }
              >
                <img 
                  src={getIconPath(item.icon)} 
                  alt={item.label}
                  className="profile-sidebar__icon"
                />
                <span className="profile-sidebar__label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <UserNotifications 
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </aside>
  );
};

export default ProfileSidebar; 
