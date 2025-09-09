import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { getIconPath } from '../../utils/assetPaths';
import './ProfileSidebar.css';

const ProfileSidebar = () => {
  const location = useLocation();

  const menuItems = [
    {
      path: '/perfil/datos-personales',
      label: 'Datos Personales',
      icon: 'User.svg'
    },
    {
      path: '/perfil/mis-pedidos',
      label: 'Mis Pedidos',
      icon: 'Package.svg'
    },
    {
      path: '/perfil/favoritos',
      label: 'Favoritos',
      icon: 'Heart.svg'
    },
    {
      path: '/perfil/direcciones',
      label: 'Direcciones',
      icon: 'Map Marker.svg'
    },
    {
      path: '/perfil/metodos-pago',
      label: 'Métodos de Pago',
      icon: 'Credit Card.svg'
    },
    {
      path: '/perfil/privacidad-seguridad',
      label: 'Privacidad y Seguridad',
      icon: 'Shield.svg'
    }
  ];

  return (
    <aside className="profile-sidebar">
      <div className="profile-sidebar__header">
        <h2 className="profile-sidebar__title">Mi Perfil</h2>
        <p className="profile-sidebar__subtitle">Gestiona tu cuenta</p>
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
    </aside>
  );
};

export default ProfileSidebar; 
