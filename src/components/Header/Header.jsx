import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getImagePath, getIconPath } from '../../utils/assetPaths';
import './Header.css';
import { CartModal } from '../';
import useCartStore from '../../store/cartStore';

const Header = () => {
  const [activeMenu, setActiveMenu] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMobileSubMenu, setOpenMobileSubMenu] = useState(null);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const { items: cartItems, totalItems, totalPrice } = useCartStore();
  const navigate = useNavigate();

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

  // Adapt the data for CartItemCard
  const cartItemCards = cartItems.map((item) => ({
    id: item.id,
    image: item.image,
    sku: item.productId || item.sku || '',
    title: item.name,
    isDiscount: true, // Adjust if there is discount logic
    quantity: item.quantity,
    priceWithoutDiscount: (item.price * item.quantity).toFixed(2),
    priceWithDiscount: (item.price * item.quantity).toFixed(2) // Adjust if there is a discount
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

  return (
    <header className="site-header">
      {/* Top Affiliate Bar */}
      <div className="affiliate-bar">
        <div className="affiliate-container">
          <p className="affiliate-text">¡Afiliate ahora mismo y comienza tu propio negocio!</p>
          <Link to="/afiliate" className="affiliate-button">Afiliate aquí</Link>
        </div>
      </div>

      {/* Main Header */}
      <div className="main-header">
        <div className="header-container">
          {/* Logo */}
          <Link to="/" className="header-logo">
            <img src={getImagePath('logo.svg')} alt="Cherry" />
          </Link>

          {/* Search Bar */}
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Buscar producto" 
              className="search-input" 
            />
            <button className="search-button">
              <img src={getIconPath('Search.svg')} alt="Buscar" />
            </button>
          </div>

          {/* User Actions */}
          <div className="user-actions">
            <Link to="/login" className="user-action">
              <img src={getIconPath('User.svg')} alt="Usuario" />
              <span>Iniciar sesión</span>
            </Link>
            
            <Link to="/notificaciones" className="user-action icon-only">
              <div className="icon-badge">
                <img src={getIconPath('Bell.svg')} alt="Notificaciones" />
                <span className="badge notification-badge">1</span>
              </div>
            </Link>
            
            <button type="button" className="user-action icon-only" onClick={() => setCartModalOpen(true)}>
              <div className="icon-badge">
                <img src={getIconPath('Shopping Cart.svg')} alt="Carrito" />
                {totalItems > 0 && <span className="badge cart-badge">{totalItems}</span>}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
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
                    <img src="/images/featured-product.jpg" alt="Producto destacado" />
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

      {/* Mobile Menu Button */}
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

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
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
              <input 
                type="text" 
                placeholder="Buscar producto" 
                className="mobile-search-input" 
              />
              <button className="mobile-search-button">
                <img src={getIconPath('Search.svg')} alt="Buscar" />
              </button>
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
              <Link to="/login" className="mobile-menu-account" onClick={() => setMobileMenuOpen(false)}>
                <img src={getIconPath('User.svg')} alt="Usuario" />
                <span>Iniciar sesión</span>
              </Link>
            </div>
          </div>
        </div>
      )}
      <CartModal
        open={cartModalOpen}
        onClose={() => setCartModalOpen(false)}
        cartItems={cartItemCards}
        subtotal={totalPrice.toFixed(2)}
        onViewCart={() => { setCartModalOpen(false); navigate('/carrito-detalle'); }}
        onCheckout={() => { setCartModalOpen(false); navigate('/compra-exitosa'); }}
      />
    </header>
  );
};

export default Header; 