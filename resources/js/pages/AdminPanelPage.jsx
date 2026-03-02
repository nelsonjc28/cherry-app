import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CherryButton from '../components/CherryButton/CherryButton';
import AdminUserManager from '../components/AdminUserManager/AdminUserManager';
import OperatorManager from '../components/OperatorManager/OperatorManager';
import ClientManager from '../components/ClientManager/ClientManager';
import AdminReviews from '../components/AdminReviews/AdminReviews';

import CategoryOrderManager from '../components/CategoryOrderManager/CategoryOrderManager';
import AdminWelcomeSectionManager from '../components/AdminWelcomeSectionManager/AdminWelcomeSectionManager';
import AdminContactManager from '../components/AdminContactManager/AdminContactManager';
import AdminPrivacyPolicyManager from '../components/AdminPrivacyPolicyManager/AdminPrivacyPolicyManager';
import AdminCatalogManager from '../components/AdminCatalogManager/AdminCatalogManager';
import CatalogOffersModule from '../components/AdminCatalogManager/CatalogOffersModule';
import AdminCategoryManager from '../components/AdminCategoryManager/AdminCategoryManager';
import AdminMenuCategoryOrderManager from '../components/AdminMenuCategoryOrderManager/AdminMenuCategoryOrderManager';
import AdminHomeCatalogManager from '../components/AdminHomeCatalogManager/AdminHomeCatalogManager';
import AdminCatalogOrderManager from '../components/AdminCatalogOrderManager/AdminCatalogOrderManager';
import AdminOrders from './admin/AdminOrders';
import AdminDashboard from './admin/AdminDashboard';
import AdminHistorial from './admin/AdminHistorial';

import useUserStore from '../store/userStore';
import '../index.css';
import './AdminPanelPage.css';

const dummyHomeData = [
  { id: 1, title: 'Banner principal', status: 'Activo' },
  { id: 2, title: 'Sección más vendidos', status: 'Activo' },
  { id: 3, title: 'Testimonios', status: 'Inactivo' },
];

function AdminPanelPage() {
  const [homeData, setHomeData] = useState(dummyHomeData);
  const [selectedMenu, setSelectedMenu] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({
    usuarios: false,
    categorias: false,
    catalogos: false
  });
  const { user, isAdmin } = useUserStore();
  
  // Helper para verificar si el usuario es admin o operador
  const isAdminOrOperator = () => {
    if (!user) return false;
    const userRole = user?.role?.name;
    return userRole === 'admin' || userRole === 'operador';
  };
  
  // Helper para verificar si el usuario es solo admin (no operador)
  const isOnlyAdmin = () => {
    if (!user) return false;
    return user?.role?.name === 'admin';
  };
  
  // Variable para verificar si es admin o operador (para uso directo)
  const userRole = user?.role?.name;
  const isAdminOrOperatorRole = userRole === 'admin' || userRole === 'operador';
  const navigate = useNavigate();
  const location = useLocation();

  // Validar que solo administradores y operadores puedan acceder (bloquear clientes)
  useEffect(() => {
    if (user) {
      const userRole = user?.role?.name;
      if (userRole !== 'admin' && userRole !== 'operador') {
        // Si el usuario no es admin ni operador, redirigir al home
        navigate('/', { replace: true });
      }
    }
  }, [user, navigate]);

  // Si no es admin ni operador, no renderizar nada (mientras se redirige)
  if (user) {
    const userRole = user?.role?.name;
    if (userRole !== 'admin' && userRole !== 'operador') {
      return null;
    }
  }

  // Función para toggle de submenús
  const toggleSubmenu = (menuKey) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  // Establecer título de la página según la sección activa
  useEffect(() => {
    const titleMap = {
      'home': 'Dashboard - Admin - Cherry Central',
      'users': 'Administradores - Admin - Cherry Central',
      'operators': 'Operadores - Admin - Cherry Central',
      'clients': 'Clientes - Admin - Cherry Central',
      'category-products': 'Categorías - Admin - Cherry Central',
      'category-order': 'Ordenar Categorías - Admin - Cherry Central',
      'menu-category-order': 'Ordenar Categorías del Menú - Admin - Cherry Central',
      'welcome-sections': 'Secciones de Bienvenida - Admin - Cherry Central',
      'home-catalogs': 'Catálogos Home - Admin - Cherry Central',
      'catalogs': 'Catálogos - Admin - Cherry Central',
      'catalog-order': 'Ordenar Catálogos - Admin - Cherry Central',
      'orders': 'Órdenes - Admin - Cherry Central',
      'reviews': 'Reseñas - Admin - Cherry Central',
      'contact-info': 'Información de Contacto - Admin - Cherry Central',
      'privacy-policy': 'Política de Privacidad - Admin - Cherry Central',
      'discounts': 'Descuentos - Admin - Cherry Central',
      'historial': 'Historial - Admin - Cherry Central'
    };
    
    const title = titleMap[selectedMenu] || 'Admin Panel - Cherry Central';
    document.title = title;
  }, [selectedMenu]);

  // Mapeo de URLs a secciones del menú
  const urlToMenuMap = {
    '/admin': 'home',
    '/admin/': 'home',
    '/admin/dashboard': 'home',
    '/admin/usuarios': 'users',
    '/admin/operadores': 'operators',
    '/admin/clientes': 'clients',
    '/admin/categorias': 'category-products',
    '/admin/ordenar-categorias': 'category-order',
    '/admin/menu-categorias': 'menu-category-order',
    '/admin/secciones-bienvenida': 'welcome-sections',
    '/admin/catalogos-home': 'home-catalogs',
    '/admin/catalogos': 'catalogs',
    '/admin/ordenar-catalogos': 'catalog-order',
    '/admin/ordenes': 'orders',
    '/admin/resenas': 'reviews',
    '/admin/contacto': 'contact-info',
    '/admin/privacidad': 'privacy-policy',
    '/admin/descuentos': 'discounts',
    '/admin/historial': 'historial'
  };

  // Mapeo de secciones a URLs
  const menuToUrlMap = {
    'home': '/admin',
    'users': '/admin/usuarios',
    'operators': '/admin/operadores',
    'clients': '/admin/clientes',
    'category-products': '/admin/categorias',
    'category-order': '/admin/ordenar-categorias',
    'menu-category-order': '/admin/menu-categorias',
    'welcome-sections': '/admin/secciones-bienvenida',
    'home-catalogs': '/admin/catalogos-home',
    'catalogs': '/admin/catalogos',
    'catalog-order': '/admin/ordenar-catalogos',
    'orders': '/admin/ordenes',
    'reviews': '/admin/resenas',
    'contact-info': '/admin/contacto',
    'privacy-policy': '/admin/privacidad',
    'discounts': '/admin/descuentos',
    'historial': '/admin/historial'
  };

  // Función para cambiar de sección y actualizar URL
  const handleMenuChange = (menuKey) => {
    setSelectedMenu(menuKey);
    setSidebarOpen(false);
    const url = menuToUrlMap[menuKey] || '/admin';
    navigate(url, { replace: true });
  };

  // CRUD dummy actions
  const handleDelete = (id) => {
    setHomeData(homeData.filter(item => item.id !== id));
  };

  // Sincronizar URL con menú seleccionado y expandir submenús según el menú activo
  useEffect(() => {
    const currentMenu = urlToMenuMap[location.pathname] || 'home';
    setSelectedMenu(currentMenu);
    
    // Expandir automáticamente el submenú correspondiente
    if (currentMenu === 'users' || currentMenu === 'operators' || currentMenu === 'clients') {
      setExpandedMenus(prev => ({ ...prev, usuarios: true }));
    } else if (currentMenu === 'category-products' || currentMenu === 'category-order' || currentMenu === 'menu-category-order') {
      setExpandedMenus(prev => ({ ...prev, categorias: true }));
    } else if (currentMenu === 'catalogs' || currentMenu === 'catalog-order' || currentMenu === 'home-catalogs') {
      setExpandedMenus(prev => ({ ...prev, catalogos: true }));
    }
  }, [location.pathname]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => document.body.classList.remove('sidebar-open');
  }, [sidebarOpen]);

  const handleLogout = () => {
    // Implementar logout si es necesario
    navigate('/');
  };

  return (
    <div className="admin-panel__layout">
      {/* Botón de menú flotante para móvil */}
      {!sidebarOpen && (
        <button 
          className="admin-panel__mobile-menu-btn" 
          onClick={()=>setSidebarOpen(true)}
          aria-label="Abrir menú"
        >
          ☰
        </button>
      )}
      
      {sidebarOpen && <div className="admin-panel__sidebar-overlay" onClick={()=>setSidebarOpen(false)}></div>}
      <aside className={`admin-panel__sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="admin-panel__sidebar-header">
          <span className="admin-panel__sidebar-title">
            {isAdmin() ? 'Admin Panel' : 'Dashboard'}
          </span>
          <button className="admin-panel__sidebar-toggle" onClick={()=>setSidebarOpen(v=>!v)} aria-label="Abrir/cerrar menú">
            <span>{sidebarOpen ? '✕' : '☰'}</span>
          </button>
        </div>
        <nav className="admin-panel__sidebar-nav">
          <div className="admin-panel__user-info">
            <span className="admin-panel__user-name">{user?.first_name} {user?.last_name}</span>
            <span className="admin-panel__user-role">
              {user?.role?.name === 'admin' ? 'Administrador' : 
               user?.role?.name === 'operador' ? 'Operador' : 
               'Cliente'}
            </span>
          </div>
          <button className={`admin-panel__sidebar-link${selectedMenu==='home'?' active':''}`} onClick={()=>handleMenuChange('home')}>Dashboard</button>
          
          {/* Menú Usuarios */}
          <div className="admin-panel__menu-group">
            <button 
              className={`admin-panel__menu-group-header${expandedMenus.usuarios ? ' expanded' : ''}`}
              onClick={() => toggleSubmenu('usuarios')}
            >
              <span>Usuarios</span>
              <span className="admin-panel__menu-arrow">{expandedMenus.usuarios ? '▼' : '▶'}</span>
            </button>
            {expandedMenus.usuarios && (
              <div className="admin-panel__submenu">
                {/* Solo mostrar estos links si el usuario es admin (no operador) */}
                {isOnlyAdmin() && (
                  <>
                    <button 
                      className={`admin-panel__sidebar-link admin-panel__submenu-link${selectedMenu==='users'?' active':''}`} 
                      onClick={()=>handleMenuChange('users')}
                    >
                      Administradores
                    </button>
                    <button 
                      className={`admin-panel__sidebar-link admin-panel__submenu-link${selectedMenu==='operators'?' active':''}`} 
                      onClick={()=>handleMenuChange('operators')}
                    >
                      Operadores
                    </button>
                  </>
                )}
                <button 
                  className={`admin-panel__sidebar-link admin-panel__submenu-link${selectedMenu==='clients'?' active':''}`} 
                  onClick={()=>handleMenuChange('clients')}
                >
                  Clientes
                </button>
              </div>
            )}
          </div>

          {/* Menú Categorías */}
          <div className="admin-panel__menu-group">
            <button 
              className={`admin-panel__menu-group-header${expandedMenus.categorias ? ' expanded' : ''}`}
              onClick={() => toggleSubmenu('categorias')}
            >
              <span>Categorías</span>
              <span className="admin-panel__menu-arrow">{expandedMenus.categorias ? '▼' : '▶'}</span>
            </button>
            {expandedMenus.categorias && (
              <div className="admin-panel__submenu">
                <button 
                  className={`admin-panel__sidebar-link admin-panel__submenu-link${selectedMenu==='category-products'?' active':''}`} 
                  onClick={()=>handleMenuChange('category-products')}
                >
                  Categorías
                </button>
                <button 
                  className={`admin-panel__sidebar-link admin-panel__submenu-link${selectedMenu==='category-order'?' active':''}`} 
                  onClick={()=>handleMenuChange('category-order')}
                >
                  Ordenar Categorías
                </button>
                <button 
                  className={`admin-panel__sidebar-link admin-panel__submenu-link${selectedMenu==='menu-category-order'?' active':''}`} 
                  onClick={()=>handleMenuChange('menu-category-order')}
                >
                  Ordenar Categorías del Menú
                </button>
              </div>
            )}
          </div>

          {/* Menú Catálogos */}
          <div className="admin-panel__menu-group">
            <button 
              className={`admin-panel__menu-group-header${expandedMenus.catalogos ? ' expanded' : ''}`}
              onClick={() => toggleSubmenu('catalogos')}
            >
              <span>Catálogos</span>
              <span className="admin-panel__menu-arrow">{expandedMenus.catalogos ? '▼' : '▶'}</span>
            </button>
            {expandedMenus.catalogos && (
              <div className="admin-panel__submenu">
                <button 
                  className={`admin-panel__sidebar-link admin-panel__submenu-link${selectedMenu==='catalogs'?' active':''}`} 
                  onClick={()=>handleMenuChange('catalogs')}
                >
                  Catálogos
                </button>
                <button 
                  className={`admin-panel__sidebar-link admin-panel__submenu-link${selectedMenu==='catalog-order'?' active':''}`} 
                  onClick={()=>handleMenuChange('catalog-order')}
                >
                  Ordenar Catálogos
                </button>
                <button 
                  className={`admin-panel__sidebar-link admin-panel__submenu-link${selectedMenu==='home-catalogs'?' active':''}`} 
                  onClick={()=>handleMenuChange('home-catalogs')}
                >
                  Ordenar Catálogos del Menú
                </button>
              </div>
            )}
          </div>

          <button className={`admin-panel__sidebar-link${selectedMenu==='welcome-sections'?' active':''}`} onClick={()=>handleMenuChange('welcome-sections')}>Secciones de Bienvenida</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='orders'?' active':''}`} onClick={()=>handleMenuChange('orders')}>Órdenes</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='reviews'?' active':''}`} onClick={()=>handleMenuChange('reviews')}>Reseñas</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='contact-info'?' active':''}`} onClick={()=>handleMenuChange('contact-info')}>Información de Contacto</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='privacy-policy'?' active':''}`} onClick={()=>handleMenuChange('privacy-policy')}>Terminos y condiciones</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='discounts'?' active':''}`} onClick={()=>handleMenuChange('discounts')}>Descuentos</button>
          {isOnlyAdmin() && (
            <button className={`admin-panel__sidebar-link${selectedMenu==='historial'?' active':''}`} onClick={()=>handleMenuChange('historial')}>Historial</button>
          )}
          <button className="admin-panel__sidebar-link" onClick={handleLogout}>Volver al sitio</button>
        </nav>
      </aside>
      <main className={`admin-panel__main-content ${selectedMenu === 'home' && isAdmin() ? 'admin-panel__main-content--dashboard' : ''}`}>
        {selectedMenu === 'home' && (
          <section>
            {isAdmin() ? (
              // Dashboard con gráficas para administradores
              <AdminDashboard />
            ) : (
              // Contenido para clientes
              <>
                <h2 className="section-title mb-3">Dashboard de Usuario</h2>
                <div className="admin-panel__welcome mb-4">
                  <h3>Bienvenido, {user?.first_name}!</h3>
                  <p>Rol: {user?.role?.name === 'admin' ? 'Administrador' : 
                           user?.role?.name === 'operador' ? 'Operador' : 
                           'Cliente'}</p>
                  <p>Email: {user?.email}</p>
                </div>
                <div className="admin-panel__client-content">
                  <div className="admin-panel__stats-grid">
                    <div className="admin-panel__stat-card">
                      <h4>Mis Pedidos</h4>
                      <p className="stat-number">0</p>
                      <p className="stat-label">Pedidos realizados</p>
                    </div>
                    <div className="admin-panel__stat-card">
                      <h4>Favoritos</h4>
                      <p className="stat-number">0</p>
                      <p className="stat-label">Productos favoritos</p>
                    </div>
                    <div className="admin-panel__stat-card">
                      <h4>Última Visita</h4>
                      <p className="stat-number">Hoy</p>
                      <p className="stat-label">Actividad reciente</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <CherryButton size="medium" variant="red" onClick={() => navigate('/')}>
                      Ir al Catálogo
                    </CherryButton>
                  </div>
                </div>
              </>
            )}
          </section>
        )}
        
        {/* Módulos solo para administradores */}
        {selectedMenu === 'users' && isOnlyAdmin() && (
          <section>
            <AdminUserManager />
          </section>
        )}
        
        {selectedMenu === 'operators' && isOnlyAdmin() && (
          <section>
            <OperatorManager />
          </section>
        )}
        
        {/* Módulos para administradores y operadores */}
        {selectedMenu === 'clients' && isAdminOrOperatorRole && (
          <section>
            <ClientManager />
          </section>
        )}

        {selectedMenu === 'category-products' && isAdminOrOperatorRole && (
          <section>
            <AdminCategoryManager />
          </section>
        )}
        
        {selectedMenu === 'category-order' && isAdminOrOperatorRole && (
          <section>
            <CategoryOrderManager />
          </section>
        )}
        
        {selectedMenu === 'menu-category-order' && isAdminOrOperatorRole && (
          <section>
            <AdminMenuCategoryOrderManager />
          </section>
        )}
        
        {selectedMenu === 'welcome-sections' && isAdminOrOperatorRole && (
          <section>
            <AdminWelcomeSectionManager />
          </section>
        )}

        {selectedMenu === 'home-catalogs' && isAdminOrOperatorRole && (
          <section>
            <AdminHomeCatalogManager />
          </section>
        )}

        {selectedMenu === 'catalogs' && isAdminOrOperatorRole && (
          <section>
            <AdminCatalogManager />
          </section>
        )}

        {selectedMenu === 'catalog-order' && isAdminOrOperatorRole && (
          <section>
            <AdminCatalogOrderManager />
          </section>
        )}

        {selectedMenu === 'orders' && isAdminOrOperatorRole && (
          <section>
            <AdminOrders />
          </section>
        )}

        {selectedMenu === 'reviews' && isAdminOrOperatorRole && (
          <section>
            <AdminReviews />
          </section>
        )}

        {selectedMenu === 'contact-info' && isAdminOrOperatorRole && (
          <section>
            <AdminContactManager />
          </section>
        )}

        {selectedMenu === 'privacy-policy' && isAdminOrOperatorRole && (
          <section>
            <AdminPrivacyPolicyManager />
          </section>
        )}

        {selectedMenu === 'discounts' && isAdminOrOperatorRole && (
          <section>
            <CatalogOffersModule onBack={() => setSelectedMenu('home')} />
          </section>
        )}

        {selectedMenu === 'historial' && isOnlyAdmin() && (
          <section>
            <AdminHistorial />
          </section>
        )}
      </main>
    </div>
  );
}

export default AdminPanelPage; 
