import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getIconPath, getImagePath } from '../../utils/assetPaths';
import { formatPrice } from '../../utils/formatters';
import useUserStore from '../../store/userStore';
import useCartStore from '../../store/cartStore';
import CartModal from '../CartModal/CartModal';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, fetchUser, logout } = useUserStore();
  const { items: cartItems, totalItems, totalPrice } = useCartStore();
  const [activeMenu, setActiveMenu] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMobileSubMenu, setOpenMobileSubMenu] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const userMenuRef = useRef(null);

  // Check if we're on the admin page
  const isAdminPage = location.pathname === '/admin';

  // Submenu data for each category
  const menuData = {
    nuevos: {
      title: 'Nuevos',
      columns: [
        {
          title: 'Recién llegados',
          items: [
            { name: 'Colección primavera', link: '/nuevos/primavera' },
            { name: 'Últimas tendencias', link: '/nuevos/tendencias' },
            { name: 'Lo más vendido', link: '/nuevos/mas-vendido' }
          ]
        },
        {
          title: 'Categorías nuevas',
          items: [
            { name: 'Accesorios', link: '/nuevos/accesorios' },
            { name: 'Maquillaje', link: '/nuevos/maquillaje' },
            { name: 'Cuidado personal', link: '/nuevos/cuidado-personal' }
          ]
        },
        {
          title: 'Destacados',
          items: [
            { name: 'Colección limitada', link: '/nuevos/coleccion-limitada' },
            { name: 'Edición especial', link: '/nuevos/edicion-especial' }
          ]
        }
      ]
    },
    destacados: {
      title: 'Destacados',
      columns: [
        {
          title: 'Top ventas',
          items: [
            { name: 'Accesorios populares', link: '/destacados/accesorios-populares' },
            { name: 'Maquillaje favorito', link: '/destacados/maquillaje-favorito' },
            { name: 'Lo más buscado', link: '/destacados/mas-buscado' }
          ]
        },
        {
          title: 'Recomendados',
          items: [
            { name: 'Por estilo', link: '/destacados/por-estilo' },
            { name: 'Por temporada', link: '/destacados/por-temporada' },
            { name: 'Por ocasión', link: '/destacados/por-ocasion' }
          ]
        },
        {
          title: 'Promociones',
          items: [
            { name: 'Descuentos', link: '/destacados/descuentos' },
            { name: 'Packs especiales', link: '/destacados/packs' }
          ]
        }
      ]
    },
    categorias: {
      title: 'Categorías',
      columns: [
        {
          title: 'Accesorios',
          items: [
            { name: 'Collares', link: '/categorias/collares' },
            { name: 'Pulseras', link: '/categorias/pulseras' },
            { name: 'Aretes', link: '/categorias/aretes' },
            { name: 'Anillos', link: '/categorias/anillos' }
          ]
        },
        {
          title: 'Belleza',
          items: [
            { name: 'Labiales', link: '/categorias/labiales' },
            { name: 'Sombras', link: '/categorias/sombras' },
            { name: 'Bases', link: '/categorias/bases' }
          ]
        },
        {
          title: 'Cuidado personal',
          items: [
            { name: 'Cremas', link: '/categorias/cremas' },
            { name: 'Tratamientos', link: '/categorias/tratamientos' },
            { name: 'Mascarillas', link: '/categorias/mascarillas' }
          ]
        },
        {
          title: 'Ver todas',
          items: [
            { name: 'Todas las categorías', link: '/categorias/todas' }
          ]
        }
      ]
    },
    catalogos: {
      title: 'Catálogos',
      columns: [
        {
          title: 'Por temporada',
          items: [
            { name: 'Primavera-Verano', link: '/catalogos/primavera-verano' },
            { name: 'Otoño-Invierno', link: '/catalogos/otono-invierno' }
          ]
        },
        {
          title: 'Por colección',
          items: [
            { name: 'Elegante', link: '/catalogos/elegante' },
            { name: 'Casual', link: '/catalogos/casual' },
            { name: 'Fiesta', link: '/catalogos/fiesta' }
          ]
        },
        {
          title: 'Especiales',
          items: [
            { name: 'Edición limitada', link: '/catalogos/edicion-limitada' },
            { name: 'Colaboraciones', link: '/catalogos/colaboraciones' }
          ]
        }
      ]
    },
    promociones: {
      title: 'Promociones',
      columns: [
        {
          title: 'Ofertas actuales',
          items: [
            { name: 'Descuentos del mes', link: '/promociones/descuentos-mes' },
            { name: 'Ofertas relámpago', link: '/promociones/ofertas-relampago' },
            { name: '2x1 en seleccionados', link: '/promociones/2x1' }
          ]
        },
        {
          title: 'Promociones especiales',
          items: [
            { name: 'Cumpleaños', link: '/promociones/cumpleanos' },
            { name: 'Días festivos', link: '/promociones/festivos' },
            { name: 'Temporada', link: '/promociones/temporada' }
          ]
        },
        {
          title: 'Afiliados',
          items: [
            { name: 'Programa de afiliados', link: '/promociones/afiliados' },
            { name: 'Beneficios exclusivos', link: '/promociones/beneficios' }
          ]
        }
      ]
    }
  };

  // Handles to show/hide submenus
  const handleMouseEnter = (menu) => {
    setActiveMenu(menu);
  };

  const handleMouseLeave = () => {
    setActiveMenu(null);
  };

  // Handler to show/hide the mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    // Close any open submenu when closing the main menu
    if (mobileMenuOpen) {
      setOpenMobileSubMenu(null);
    }
  };

  // Handler for opening/closing mobile submenus
  const toggleSubMenu = (key) => {
    setOpenMobileSubMenu(openMobileSubMenu === key ? null : key);
  };

  // Search functionality
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Parse search term for different types of filters
      const searchParts = searchTerm.trim().split(' ');
      const colorFilters = [];
      const skuFilters = [];
      const generalTerms = [];
      
      searchParts.forEach(term => {
        const lowerTerm = term.toLowerCase();
        // Check if it's a color (common color names in Spanish)
        if (['rojo', 'azul', 'verde', 'amarillo', 'negro', 'blanco', 'rosa', 'morado', 'naranja', 'gris', 'beige', 'cafe', 'marron', 'violeta', 'celeste', 'turquesa', 'coral', 'dorado', 'plateado', 'bronce'].includes(lowerTerm)) {
          colorFilters.push(term);
        }
        // Check if it's a SKU (usually alphanumeric codes, 6+ characters)
        else if (/^[A-Z0-9]{6,}$/.test(term.toUpperCase())) {
          skuFilters.push(term);
        }
        // Otherwise it's a general search term (product name, description, etc.)
        else {
          generalTerms.push(term);
        }
      });
      
      // Build search query with filters
      const searchParams = new URLSearchParams();
      if (generalTerms.length > 0) {
        searchParams.set('q', generalTerms.join(' '));
      }
      if (colorFilters.length > 0) {
        searchParams.set('color', colorFilters.join(','));
      }
      if (skuFilters.length > 0) {
        searchParams.set('sku', skuFilters.join(','));
      }
      
      navigate(`/buscar?${searchParams.toString()}`);
      setSearchTerm('');
    }
  };

  const handleSearchInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  // Adapt the data for CartItemCard
  const cartItemCards = cartItems.map((item) => ({
    id: item.id,
    image: item.image,
    sku: item.productId || item.sku || '',
    title: item.name,
    isDiscount: true, // Adjust if there is discount logic
    quantity: item.quantity,
    priceWithoutDiscount: formatPrice(item.price * item.quantity),
    priceWithDiscount: formatPrice(item.price * item.quantity) // Adjust if there is a discount
  }));

  // Component for a mobile menu item
  const MobileMenuItem = ({ menuKey, title, icon }) => {
    const isOpen = openMobileSubMenu === menuKey;
    const navigate = useNavigate();
    const handleClick = () => {
      toggleSubMenu(menuKey);
      if (menuKey === 'catalogos') {
        setMobileMenuOpen(false);
        navigate('/catalogo');
      }
    };
    return (
      <li className="mobile-menu-item">
        <div className="mobile-menu-header" onClick={handleClick}>
          <div className="mobile-menu-title">
            {icon}
            <span>{title}</span>
          </div>
          <img 
            src={getIconPath('Chevron Down.svg')} 
            alt="Expandir" 
            className={`mobile-menu-arrow ${isOpen ? 'open' : ''}`}
          />
        </div>
        {isOpen && (
          <div className="mobile-submenu">
            {menuData[menuKey]?.columns.map((column, columnIndex) => (
              <div className="mobile-submenu-section" key={columnIndex}>
                <h3 className="mobile-submenu-title">{column.title}</h3>
                <ul className="mobile-submenu-items">
                  {column.items.map((item, itemIndex) => (
                    <li key={itemIndex}>
                      <Link 
                        to={item.link} 
                        className="mobile-submenu-link"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </li>
    );
  };

  // Cargar usuario al montar si hay token
  useEffect(() => { if (!user && localStorage.getItem('token')) fetchUser(); }, [user, fetchUser]);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="site-header">
      {/* Top Affiliate Bar */}
      {!user && (
        <div className="affiliate-bar">
          <div className="affiliate-container">
            <p className="affiliate-text">¡Afiliate ahora mismo y comienza tu propio negocio!</p>
            <Link to="/afiliate" className="affiliate-button">Afiliate aquí</Link>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="main-header">
        <div className="header-container">
          {/* Logo */}
          <Link to="/" className="header-logo">
            <img src={getImagePath('logo.svg')} alt="Cherry" />
          </Link>

          {/* Search Bar */}
          {!isAdminPage && (
            <form className="search-container" onSubmit={handleSearch}>
              <input 
                type="text" 
                placeholder="Buscar producto" 
                className="search-input"
                value={searchTerm}
                onChange={handleSearchInputChange}
                onKeyPress={handleSearchKeyPress}
              />
              <button type="submit" className="search-button">
                <img src={getIconPath('Search.svg')} alt="Buscar" />
              </button>
            </form>
          )}

          {/* User Actions */}
          <div className="user-actions">
            {user ? (
              <div className="user-menu" ref={userMenuRef}>
                <button className="user-action user-menu-btn" onClick={() => setUserMenuOpen(!userMenuOpen)}>
                  <img src={user.image || getIconPath('User.svg')} alt="Usuario" />
                  <span className="user-name">{user.first_name}</span>
                  <img src={getIconPath('Chevron Down.svg')} alt="Menú" className="dropdown-icon" />
                </button>
                {userMenuOpen && (
                  <div className="user-dropdown">
                    <div className="user-dropdown-header">
                      <div className="user-info">
                        <img src={user.image || getIconPath('User.svg')} alt="Usuario" className="user-avatar" />
                        <div className="user-details">
                          <span className="user-full-name">{user.first_name} {user.last_name}</span>
                          <span className="user-email">{user.email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="user-dropdown-divider"></div>
                    <Link to="/admin" className="user-dropdown-item">
                      <img src={getIconPath('File Alt.svg')} alt="Dashboard" />
                      Dashboard
                    </Link>
                    <div className="user-dropdown-divider"></div>
                    {/* <Link to="/perfil" className="user-dropdown-item">
                      <img src={getIconPath('User.svg')} alt="Perfil" />
                      Mi Perfil
                    </Link>
                    <Link to="/ordenes" className="user-dropdown-item">
                      <img src={getIconPath('Package.svg')} alt="Órdenes" />
                      Mis Órdenes
                    </Link>
                    <Link to="/direcciones" className="user-dropdown-item">
                      <img src={getIconPath('Map Pin.svg')} alt="Direcciones" />
                      Mis Direcciones
                    </Link>
                    <Link to="/metodos-pago" className="user-dropdown-item">
                      <img src={getIconPath('Credit Card.svg')} alt="Métodos de Pago" />
                      Métodos de Pago
                    </Link>
                    <Link to="/notificaciones" className="user-dropdown-item">
                      <img src={getIconPath('Bell.svg')} alt="Notificaciones" />
                      Notificaciones
                    </Link>
                    <Link to="/carrito" className="user-dropdown-item">
                      <img src={getIconPath('Shopping Cart.svg')} alt="Carrito" />
                      Mi Carrito
                    </Link>
                    <div className="user-dropdown-divider"></div> */}
                    <button className="user-dropdown-item logout-item" onClick={logout}>
                      <img src={getIconPath('Log Out.svg')} alt="Cerrar Sesión" />
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="user-action">
                  <img src={getIconPath('User.svg')} alt="Usuario" />
                  <span>Iniciar sesión</span>
                </Link>
                <Link to="/registro" className="user-action">
                  <img src={getIconPath('User Plus.svg')} alt="Registrarse" />
                  <span>Registrarse</span>
                </Link>
              </>
            )}
            
            <Link to="/notificaciones" className="user-action icon-only">
              <div className="icon-badge">
                <img src={getIconPath('Bell.svg')} alt="Notificaciones" />
                <span className="badge notification-badge">1</span>
              </div>
            </Link>
            
            {!isAdminPage && (
              <button type="button" className="user-action icon-only" onClick={() => setCartModalOpen(true)}>
                <div className="icon-badge">
                  <img src={getIconPath('Shopping Cart.svg')} alt="Carrito" />
                  {totalItems > 0 && <span className="badge cart-badge">{totalItems}</span>}
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      {!isAdminPage && (
        <nav className="main-navigation" onMouseLeave={handleMouseLeave}>
          <div className="nav-container">
            <ul className="nav-menu">
              <li className={`nav-item new-items ${activeMenu === 'nuevos' ? 'active' : ''}`} onMouseEnter={() => handleMouseEnter('nuevos')}>
                <Link to="/nuevos" className="nav-link">
                  <img src={getIconPath('Cart Plus.svg')} alt="Nuevos" />
                  Nuevos
                  <img src={getIconPath('Chevron Down.svg')} alt="Expandir" className="dropdown-icon" />
                </Link>
              </li>
              <li className="nav-item nav-divider"></li>
              <li className="nav-item" onMouseEnter={() => setActiveMenu(null)}>
                <Link to="/destacados" className="nav-link">
                  <img src={getIconPath('Award.svg')} alt="Destacados" />
                  Destacados
                </Link>
              </li>
              <li className="nav-item nav-divider"></li>
              <li className={`nav-item ${activeMenu === 'categorias' ? 'active' : ''}`} onMouseEnter={() => handleMouseEnter('categorias')}>
                <Link to="/categorias" className="nav-link">
                  <img src={getIconPath('File Alt.svg')} alt="Categorías" />
                  Categorías
                  <img src={getIconPath('Chevron Down.svg')} alt="Expandir" className="dropdown-icon" />
                </Link>
              </li>
              <li className="nav-item nav-divider"></li>
              <li className={`nav-item ${activeMenu === 'catalogos' ? 'active' : ''}`} onMouseEnter={() => handleMouseEnter('catalogos')}>
                <Link to="/catalogo" className="nav-link">
                  <img src={getIconPath('File Alt.svg')} alt="Catálogos" />
                  Catálogos
                  <img src={getIconPath('Chevron Down.svg')} alt="Expandir" className="dropdown-icon" />
                </Link>
              </li>
              <li className="nav-item nav-divider"></li>
              <li className={`nav-item ${activeMenu === 'promociones' ? 'active' : ''}`} onMouseEnter={() => handleMouseEnter('promociones')}>
                <Link to="/promociones" className="nav-link">
                  <img src={getIconPath('Bullhorn.svg')} alt="Promociones" />
                  Promociones
                  <img src={getIconPath('Chevron Down.svg')} alt="Expandir" className="dropdown-icon" />
                </Link>
              </li>
              <li className="nav-item nav-divider"></li>
              <li className="nav-item contact-item" onMouseEnter={() => setActiveMenu(null)}>
                <Link to="/contacto" className="nav-link">
                  <img src={getIconPath('Phone.svg')} alt="Contacto" />
                  Contacto
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Mega Menu Dropdown */}
          {activeMenu && (
            <div className="mega-menu">
              <div className="mega-menu-content">
                <div className="mega-menu-header">
                  <h2 className="mega-menu-title">{menuData[activeMenu].title}</h2>
                </div>
                <div className="mega-menu-body">
                  <div className="mega-menu-columns">
                    {menuData[activeMenu].columns.map((column, index) => (
                      <div className="mega-menu-column" key={index}>
                        <h3 className="column-title">{column.title}</h3>
                        <ul className="column-items">
                          {column.items.map((item, itemIndex) => (
                            <li key={itemIndex}>
                              <Link to={item.link}>{item.name}</Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
                {activeMenu === 'destacados' && (
                  <div className="mega-menu-featured">
                    <div className="featured-product">
                      <img src={`${window.location.origin}/images/featured-product.jpg`} alt="Producto destacado" />
                      <h4>Oferta Especial</h4>
                      <p>Hasta 30% de descuento en productos seleccionados</p>
                      <Link to="/destacados/ofertas" className="featured-link">Ver ahora</Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </nav>
      )}

      {/* Mobile Menu Button */}
      {!isAdminPage && (
        <div className="mobile-navigation">
          <button className="menu-button" onClick={toggleMobileMenu}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            <span>Menú</span>
          </button>
          
          <Link to="/contacto" className="mobile-contact">
            <img src={getIconPath('Phone.svg')} alt="Contacto" />
            <span>Contacto</span>
          </Link>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && !isAdminPage && (
        <div className="mobile-menu-overlay">
          <div className="mobile-menu">
            <div className="mobile-menu-header-bar">
              <h2>Menú</h2>
              <button className="mobile-menu-close" onClick={() => setMobileMenuOpen(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="mobile-search">
              {!isAdminPage && (
                <form onSubmit={handleSearch}>
                  <input 
                    type="text" 
                    placeholder="Buscar producto" 
                    className="mobile-search-input"
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    onKeyPress={handleSearchKeyPress}
                  />
                  <button type="submit" className="mobile-search-button">
                    <img src={getIconPath('Search.svg')} alt="Buscar" />
                  </button>
                </form>
              )}
            </div>

            <ul className="mobile-menu-list">
              <MobileMenuItem 
                menuKey="nuevos" 
                title="Nuevos" 
                icon={<img src={getIconPath('Cart Plus.svg')} alt="Nuevos" />}
              />
              
              <li className="mobile-menu-item">
                <Link to="/destacados" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                  <img src={getIconPath('Award.svg')} alt="Destacados" />
                  <span>Destacados</span>
                </Link>
              </li>
              
              <MobileMenuItem 
                menuKey="categorias" 
                title="Categorías" 
                icon={<img src={getIconPath('File Alt.svg')} alt="Categorías" />}
              />
              
              <MobileMenuItem 
                menuKey="catalogos" 
                title="Catálogos" 
                icon={<img src={getIconPath('File Alt.svg')} alt="Catálogos" />}
              />
              
              <MobileMenuItem 
                menuKey="promociones" 
                title="Promociones" 
                icon={<img src={getIconPath('Bullhorn.svg')} alt="Promociones" />}
              />
              
              <li className="mobile-menu-item">
                <Link to="/contacto" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                  <img src={getIconPath('Phone.svg')} alt="Contacto" />
                  <span>Contacto</span>
                </Link>
              </li>
            </ul>
            
            <div className="mobile-menu-footer">
              {user ? (
                <div className="user-menu" ref={userMenuRef}>
                  <div className="mobile-user-info">
                    <img src={user.image || getIconPath('User.svg')} alt="Usuario" className="mobile-user-avatar" />
                    <div className="mobile-user-details">
                      <span className="mobile-user-name">{user.first_name} {user.last_name}</span>
                      <span className="mobile-user-email">{user.email}</span>
                    </div>
                  </div>
                  <div className="mobile-user-actions">
                    {/* <Link to="/perfil" className="mobile-menu-account" onClick={() => setMobileMenuOpen(false)}>
                      <img src={getIconPath('User.svg')} alt="Perfil" />
                      <span>Mi Perfil</span>
                    </Link>
                    <Link to="/ordenes" className="mobile-menu-account" onClick={() => setMobileMenuOpen(false)}>
                      <img src={getIconPath('Package.svg')} alt="Órdenes" />
                      <span>Mis Órdenes</span>
                    </Link>
                    <Link to="/direcciones" className="mobile-menu-account" onClick={() => setMobileMenuOpen(false)}>
                      <img src={getIconPath('Map Pin.svg')} alt="Direcciones" />
                      <span>Mis Direcciones</span>
                    </Link>
                    <Link to="/metodos-pago" className="mobile-menu-account" onClick={() => setMobileMenuOpen(false)}>
                      <img src={getIconPath('Credit Card.svg')} alt="Métodos de Pago" />
                      <span>Métodos de Pago</span>
                    </Link>
                    <Link to="/notificaciones" className="mobile-menu-account" onClick={() => setMobileMenuOpen(false)}>
                      <img src={getIconPath('Bell.svg')} alt="Notificaciones" />
                      <span>Notificaciones</span>
                    </Link>
                    <Link to="/carrito" className="mobile-menu-account" onClick={() => setMobileMenuOpen(false)}>
                      <img src={getIconPath('Shopping Cart.svg')} alt="Carrito" />
                      <span>Mi Carrito</span>
                    </Link> */}
                    <button className="mobile-menu-account mobile-logout-btn" onClick={() => { logout(); setMobileMenuOpen(false); }}>
                      <img src={getIconPath('Log Out.svg')} alt="Cerrar Sesión" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Link to="/login" className="mobile-menu-account" onClick={() => setMobileMenuOpen(false)}>
                    <img src={getIconPath('User.svg')} alt="Usuario" />
                    <span>Iniciar sesión</span>
                  </Link>
                  <Link to="/registro" className="mobile-menu-account" onClick={() => setMobileMenuOpen(false)}>
                    <img src={getIconPath('User Plus.svg')} alt="Registrarse" />
                    <span>Registrarse</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <CartModal
        open={cartModalOpen}
        onClose={() => setCartModalOpen(false)}
        cartItems={cartItemCards}
        subtotal={formatPrice(totalPrice)}
        onViewCart={() => { setCartModalOpen(false); navigate('/carrito-detalle'); }}
        onCheckout={() => { setCartModalOpen(false); navigate('/compra-exitosa'); }}
      />
    </header>
  );
};

export default Header; 