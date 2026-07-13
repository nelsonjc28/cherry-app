import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import useUserStore from '../../store/userStore';
import './VendorLayout.css';

/**
 * Layout simple para el módulo vendor (/vendor/*).
 * Sidebar con navegación entre Dashboard, Pedidos, Catálogo y Checkout.
 * Replica la estética básica del AdminPanel pero minimalista.
 */
const VendorLayout = () => {
  const { user, logout } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="vendor-layout">
      <aside className={`vendor-layout__sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="vendor-layout__sidebar-header">
          <span className="vendor-layout__sidebar-title">Panel Vendedor</span>
          <button
            className="vendor-layout__sidebar-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Abrir/cerrar menú"
          >
            <span>{sidebarOpen ? '✕' : '☰'}</span>
          </button>
        </div>

        <div className="vendor-layout__user-info">
          <div className="vendor-layout__user-name">
            {user?.first_name} {user?.last_name}
          </div>
          <div className="vendor-layout__user-role">Vendedor</div>
        </div>

        <nav className="vendor-layout__nav">
          <button
            className={`vendor-layout__nav-link${isActive('/vendor') && location.pathname === '/vendor' ? ' active' : ''}`}
            onClick={() => {
              navigate('/vendor');
              setSidebarOpen(false);
            }}
          >
            🏠 Dashboard
          </button>
          <button
            className={`vendor-layout__nav-link${isActive('/vendor/orders') ? ' active' : ''}`}
            onClick={() => {
              navigate('/vendor/orders');
              setSidebarOpen(false);
            }}
          >
            📦 Pedidos
          </button>
          <button
            className={`vendor-layout__nav-link${isActive('/vendor/checkout') ? ' active' : ''}`}
            onClick={() => {
              navigate('/vendor/checkout');
              setSidebarOpen(false);
            }}
          >
            🛒 Checkout
          </button>

          <div className="vendor-layout__nav-divider" />

          <Link
            to="/"
            className="vendor-layout__nav-link"
            onClick={() => setSidebarOpen(false)}
          >
            🛍️ Ir a la tienda
          </Link>
          <button className="vendor-layout__nav-link" onClick={handleLogout}>
            🚪 Cerrar sesión
          </button>
        </nav>
      </aside>

      <main className="vendor-layout__main">
        <Outlet />
      </main>
    </div>
  );
};

export default VendorLayout;