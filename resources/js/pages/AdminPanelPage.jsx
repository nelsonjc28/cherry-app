import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CherryButton from '../components/CherryButton/CherryButton';
import AdminUserManager from '../components/AdminUserManager/AdminUserManager';
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
  const { user, isAdmin } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Mapeo de URLs a secciones del menú
  const urlToMenuMap = {
    '/admin': 'home',
    '/admin/': 'home',
    '/admin/dashboard': 'home',
    '/admin/usuarios': 'users',
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
    '/admin/descuentos': 'discounts'
  };

  // Mapeo de secciones a URLs
  const menuToUrlMap = {
    'home': '/admin',
    'users': '/admin/usuarios',
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
    'discounts': '/admin/descuentos'
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

  // Sincronizar URL con menú seleccionado
  useEffect(() => {
    const currentMenu = urlToMenuMap[location.pathname] || 'home';
    setSelectedMenu(currentMenu);
  }, [location.pathname, urlToMenuMap]);

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
            <span className="admin-panel__user-role">{user?.role?.name === 'admin' ? 'Administrador' : 'Cliente'}</span>
          </div>
          <button className={`admin-panel__sidebar-link${selectedMenu==='home'?' active':''}`} onClick={()=>handleMenuChange('home')}>Dashboard</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='users'?' active':''}`} onClick={()=>handleMenuChange('users')}>Gestionar Administradores</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='clients'?' active':''}`} onClick={()=>handleMenuChange('clients')}>Gestionar Clientes</button>

          <button className={`admin-panel__sidebar-link${selectedMenu==='category-products'?' active':''}`} onClick={()=>handleMenuChange('category-products')}>Gestionar Categorías</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='category-order'?' active':''}`} onClick={()=>handleMenuChange('category-order')}>Ordenar Categorías</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='menu-category-order'?' active':''}`} onClick={()=>handleMenuChange('menu-category-order')}>Ordenar Categorías del Menú</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='welcome-sections'?' active':''}`} onClick={()=>handleMenuChange('welcome-sections')}>Secciones de Bienvenida</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='home-catalogs'?' active':''}`} onClick={()=>handleMenuChange('home-catalogs')}>Catálogos del Home</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='catalogs'?' active':''}`} onClick={()=>handleMenuChange('catalogs')}>Catálogos</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='catalog-order'?' active':''}`} onClick={()=>handleMenuChange('catalog-order')}>Ordenar Catálogos</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='orders'?' active':''}`} onClick={()=>handleMenuChange('orders')}>Gestión de Órdenes</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='reviews'?' active':''}`} onClick={()=>handleMenuChange('reviews')}>Gestión de Reseñas</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='contact-info'?' active':''}`} onClick={()=>handleMenuChange('contact-info')}>Información de Contacto</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='privacy-policy'?' active':''}`} onClick={()=>handleMenuChange('privacy-policy')}>Políticas de Privacidad</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='discounts'?' active':''}`} onClick={()=>handleMenuChange('discounts')}>Descuentos</button>
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
                  <p>Rol: {user?.role?.name === 'admin' ? 'Administrador' : 'Cliente'}</p>
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
        
        {selectedMenu === 'users' && isAdmin() && (
          <section>
            <AdminUserManager />
          </section>
        )}
        
        {selectedMenu === 'clients' && isAdmin() && (
          <section>
            <ClientManager />
          </section>
        )}

        {selectedMenu === 'category-products' && isAdmin() && (
          <section>
            <AdminCategoryManager />
          </section>
        )}
        
        {selectedMenu === 'category-order' && isAdmin() && (
          <section>
            <CategoryOrderManager />
          </section>
        )}
        
        {selectedMenu === 'menu-category-order' && isAdmin() && (
          <section>
            <AdminMenuCategoryOrderManager />
          </section>
        )}
        
        {selectedMenu === 'welcome-sections' && isAdmin() && (
          <section>
            <AdminWelcomeSectionManager />
          </section>
        )}

        {selectedMenu === 'home-catalogs' && isAdmin() && (
          <section>
            <AdminHomeCatalogManager />
          </section>
        )}

        {selectedMenu === 'catalogs' && isAdmin() && (
          <section>
            <AdminCatalogManager />
          </section>
        )}

        {selectedMenu === 'catalog-order' && isAdmin() && (
          <section>
            <AdminCatalogOrderManager />
          </section>
        )}

        {selectedMenu === 'orders' && isAdmin() && (
          <section>
            <AdminOrders />
          </section>
        )}

        {selectedMenu === 'reviews' && isAdmin() && (
          <section>
            <AdminReviews />
          </section>
        )}

        {selectedMenu === 'contact-info' && isAdmin() && (
          <section>
            <AdminContactManager />
          </section>
        )}

        {selectedMenu === 'privacy-policy' && isAdmin() && (
          <section>
            <AdminPrivacyPolicyManager />
          </section>
        )}

        {selectedMenu === 'discounts' && isAdmin() && (
          <section>
            <CatalogOffersModule onBack={() => setSelectedMenu('home')} />
          </section>
        )}
      </main>
    </div>
  );
}

export default AdminPanelPage; 
