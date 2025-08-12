import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CherryButton from '../components/CherryButton/CherryButton';
import AdminUserManager from '../components/AdminUserManager/AdminUserManager';
import ClientManager from '../components/ClientManager/ClientManager';
import CategoryManager from '../components/CategoryManager/CategoryManager';
import CategoryOrderManager from '../components/CategoryOrderManager/CategoryOrderManager';
import AdminWelcomeSectionManager from '../components/AdminWelcomeSectionManager/AdminWelcomeSectionManager';
import AdminContactManager from '../components/AdminContactManager/AdminContactManager';
import AdminPrivacyPolicyManager from '../components/AdminPrivacyPolicyManager/AdminPrivacyPolicyManager';
import AuthTest from '../components/AuthTest';
import useUserStore from '../store/userStore';
import '../index.css';
import './AdminPanelPage.css';

const dummyHomeData = [
  { id: 1, title: 'Banner principal', status: 'Activo' },
  { id: 2, title: 'Sección destacados', status: 'Activo' },
  { id: 3, title: 'Testimonios', status: 'Inactivo' },
];

function AdminPanelPage() {
  const [homeData, setHomeData] = useState(dummyHomeData);
  const [selectedMenu, setSelectedMenu] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAdmin } = useUserStore();
  const navigate = useNavigate();

  // CRUD dummy actions
  const handleDelete = (id) => {
    setHomeData(homeData.filter(item => item.id !== id));
  };

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
          <button className={`admin-panel__sidebar-link${selectedMenu==='home'?' active':''}`} onClick={()=>{setSelectedMenu('home'); setSidebarOpen(false);}}>Dashboard</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='users'?' active':''}`} onClick={()=>{setSelectedMenu('users'); setSidebarOpen(false);}}>Gestionar Administradores</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='clients'?' active':''}`} onClick={()=>{setSelectedMenu('clients'); setSidebarOpen(false);}}>Gestionar Clientes</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='categories'?' active':''}`} onClick={()=>{setSelectedMenu('categories'); setSidebarOpen(false);}}>Gestionar Categorías</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='category-order'?' active':''}`} onClick={()=>{setSelectedMenu('category-order'); setSidebarOpen(false);}}>Ordenar Categorías</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='welcome-sections'?' active':''}`} onClick={()=>{setSelectedMenu('welcome-sections'); setSidebarOpen(false);}}>Secciones de Bienvenida</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='contact-info'?' active':''}`} onClick={()=>{setSelectedMenu('contact-info'); setSidebarOpen(false);}}>Información de Contacto</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='privacy-policy'?' active':''}`} onClick={()=>{setSelectedMenu('privacy-policy'); setSidebarOpen(false);}}>Políticas de Privacidad</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='auth-test'?' active':''}`} onClick={()=>{setSelectedMenu('auth-test'); setSidebarOpen(false);}}>Test Auth</button>
          <button className={`admin-panel__sidebar-link${selectedMenu==='other'?' active':''}`} onClick={()=>{setSelectedMenu('other'); setSidebarOpen(false);}}>Otra sección</button>
          <button className="admin-panel__sidebar-link" onClick={handleLogout}>Volver al sitio</button>
        </nav>
      </aside>
      <main className="admin-panel__main-content">
        {selectedMenu === 'home' && (
          <section>
            <h2 className="section-title mb-3">
              {isAdmin() ? 'Panel de Administración' : 'Dashboard de Usuario'}
            </h2>
            <div className="admin-panel__welcome mb-4">
              <h3>Bienvenido, {user?.first_name}!</h3>
              <p>Rol: {user?.role?.name === 'admin' ? 'Administrador' : 'Cliente'}</p>
              <p>Email: {user?.email}</p>
            </div>
            
            {isAdmin() ? (
              // Contenido para administradores
              <>
                <div className="admin-panel__crud-list">
                  {homeData.map(item => (
                    <div key={item.id} className="admin-panel__crud-item d-flex justify-content-between align-items-center mb-2 p-2">
                      <div>
                        <div className="fw-bold">{item.title}</div>
                        <div className="fs-sm text-secondary">Estado: {item.status}</div>
                      </div>
                      <div className="d-flex align-items-center">
                        <CherryButton size="small" variant="outline" onClick={()=>{
                          if (window.showToast) {
                            window.showToast('Función de editar no implementada', 'warning');
                          }
                        }}>Editar</CherryButton>
                        <CherryButton size="small" variant="red" onClick={()=>handleDelete(item.id)}>Eliminar</CherryButton>
                      </div>
                    </div>
                  ))}
                  {homeData.length === 0 && <div className="text-center text-secondary py-3">No hay elementos.</div>}
                </div>
                <div className="mt-3">
                  <CherryButton size="medium" variant="red" onClick={()=>{
                    if (window.showToast) {
                      window.showToast('Función de crear nueva sección no implementada', 'warning');
                    }
                  }}>Agregar sección</CherryButton>
                </div>
              </>
            ) : (
              // Contenido para clientes
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
        
        {selectedMenu === 'categories' && isAdmin() && (
          <section>
            <CategoryManager />
          </section>
        )}
        
        {selectedMenu === 'category-order' && isAdmin() && (
          <section>
            <CategoryOrderManager />
          </section>
        )}
        
        {selectedMenu === 'welcome-sections' && isAdmin() && (
          <section>
            <AdminWelcomeSectionManager />
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

        {selectedMenu === 'auth-test' && (
          <section>
            <AuthTest />
          </section>
        )}
        
        {selectedMenu === 'other' && (
          <section>
            <h2 className="section-title mb-3">Otra sección</h2>
            <div className="text-secondary">Contenido de ejemplo para otra sección del panel.</div>
          </section>
        )}
      </main>
    </div>
  );
}

export default AdminPanelPage; 