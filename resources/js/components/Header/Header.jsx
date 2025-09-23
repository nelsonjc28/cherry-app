import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getImagePath, getIconPath } from '../../utils/assetPaths';
import { formatPrice } from '../../utils/formatters';
import useUserStore from '../../store/userStore';
import useCartStore from '../../store/cartStore';
import CartModal from '../CartModal/CartModal';
import useCategories from '../../hooks/useCategories';
import useMenuCategories from '../../hooks/useMenuCategories';
import useHomeCatalogs from '../../hooks/useHomeCatalogs';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, fetchUser, logout, isAdmin } = useUserStore();
  const cartStore = useCartStore();
  const cartItems = cartStore?.items || [];
  const totalItems = cartStore?.totalItems || 0;
  const totalPrice = cartStore?.totalPrice || 0;

  // Check if current page is admin
  const isAdminPage = location.pathname.startsWith('/admin');

  // Solo cargar categorías si no estamos en el panel de administración
  const { categories, loading: categoriesLoading } = useCategories();
  const { menuCategories, loading: menuCategoriesLoading } = useMenuCategories();
  const { catalogs: homeCatalogs, loading: catalogsLoading } = useHomeCatalogs();


  const [activeMenu, setActiveMenu] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMobileSubMenu, setOpenMobileSubMenu] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const userMenuRef = useRef(null);

  // Organizar categorías en grupos para el menú
  const getCategoryGroups = () => {
    // Si estamos en el panel de administración, no mostrar categorías
    if (isAdminPage) {
      return [];
    }

    // Priorizar las categorías del menú si están disponibles
    if (menuCategoriesLoading) {
      return [
        {
          title: 'Cargando...',
          items: [
            { name: 'Cargando categorías...', link: '/categorias' }
          ]
        }
      ];
    }

    // Si hay categorías del menú configuradas, usarlas
    if (menuCategories && menuCategories.length > 0) {
      // Dividir las categorías del menú en grupos de 5 para mejor organización
      const groups = [];
      const itemsPerGroup = 5;

      for (let i = 0; i < menuCategories.length; i += itemsPerGroup) {
        const group = menuCategories.slice(i, i + itemsPerGroup);
        groups.push({
          title: '',
          items: group.map(cat => ({
            name: cat.name,
            link: `/categoria/${cat.slug}`
          }))
        });
      }

      // Agregar grupo "Ver todas" al final
      groups.push({
        title: 'Ver todas',
        items: [
          { name: 'Todas las categorías', link: '/categorias' }
        ]
      });

      return groups;
    }

    // Fallback a categorías generales si no hay categorías del menú
    if (categoriesLoading || !categories.length) {
      return [
        {
          title: 'Cargando...',
          items: [
            { name: 'Cargando categorías...', link: '/categorias' }
          ]
        }
      ];
    }

    // Dividir las categorías generales en grupos de 5 para mejor organización
    const groups = [];
    const itemsPerGroup = 5;

    for (let i = 0; i < categories.length; i += itemsPerGroup) {
      const group = categories.slice(i, i + itemsPerGroup);
      groups.push({
        title: '',
        items: group.map(cat => ({
          name: cat.name,
          link: `/categoria/${cat.slug}`
        }))
      });
    }

    // Agregar grupo "Ver todas" al final
    groups.push({
      title: 'Ver todas',
      items: [
        { name: 'Todas las categorías', link: '/categorias' }
      ]
    });

    return groups;
  };

  const menuData = {
    nuevos: {
      title: 'Nuevos',
      columns: [
        {
          title: 'Lanzamientos',
          items: [
            { name: 'Recién llegados', link: '/nuevos?tipo=recien-llegado' },
            { name: 'Colección primavera', link: '/nuevos?temporada=primavera' },
            { name: 'Últimas tendencias', link: '/nuevos?tipo=tendencias' },
            { name: 'Lo más vendido', link: '/nuevos?orden=mas-vendido' }
          ]
        },
        {
          title: 'Categorías',
          items: [
            { name: 'Categorías nuevas', link: '/nuevos?tipo=categorias-nuevas' },
            { name: 'Accesorios', link: '/nuevos?categoria=accesorios' },
            { name: 'Maquillaje', link: '/nuevos?categoria=maquillaje' },
            { name: 'Cuidado personal', link: '/nuevos?categoria=cuidado-personal' }
          ]
        },
        {
          title: 'Colecciones',
          items: [
            { name: 'Destacados', link: '/nuevos?tipo=destacados' },
            { name: 'Colección limitada', link: '/nuevos?tipo=coleccion-limitada' },
            { name: 'Edición especial', link: '/nuevos?tipo=edicion-especial' }
          ]
        }
      ]
    },
    destacados: {
      title: 'Destacados',
      columns: [
        {
          title: 'Productos populares',
          items: [
            { name: 'Más vendidos', link: '/destacados/mas-vendidos' },

            { name: 'Ofertas especiales', link: '/destacados/ofertas' }
          ]
        },
        {
          title: 'Colecciones',
          items: [
            { name: 'Primavera 2024', link: '/destacados/primavera-2024' },
            { name: 'Verano 2024', link: '/destacados/verano-2024' },
            { name: 'Edición limitada', link: '/destacados/edicion-limitada' }
          ]
        },
        {
          title: 'Tendencias',
          items: [
            { name: 'Estilos del momento', link: '/destacados/tendencias' },
            { name: 'Colores de temporada', link: '/destacados/colores' },
            { name: 'Looks completos', link: '/destacados/looks' }
          ]
        }
      ]
    },
    categorias: {
      title: 'Categorías',
      columns: getCategoryGroups()
    },
    catalogos: {
      title: 'Catálogos',
      columns: [
        {
          title: 'Catálogos del Home',
          items: homeCatalogs.length > 0
            ? homeCatalogs.slice(0, 4).map(catalog => ({
              name: catalog.name,
              link: `/catalogo/${catalog.id}`
            }))
            : [
              { name: 'Cargando catálogos...', link: '/catalogos' }
            ]
        },
        {
          title: 'Ver todos',
          items: [
            { name: 'Todos los catálogos', link: '/catalogos' }
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

  // Función para manejar clic en categorías del menú desplegable
  const handleCategoryClick = (categoryName) => {
    // Establecer el término de búsqueda con el nombre de la categoría
    setSearchTerm(categoryName);
    
    // Cerrar el menú desplegable
    setActiveMenu(null);
    
    // Ejecutar la búsqueda automáticamente después de un breve delay
    setTimeout(() => {
      const searchParams = new URLSearchParams();
      searchParams.set('q', categoryName);
      navigate(`/buscar?${searchParams.toString()}`);
    }, 150);
  };

  // Cargar usuario al montar si hay token
  useEffect(() => {
    if (!user && localStorage.getItem('token')) fetchUser();
  }, [user, fetchUser]);

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

  // Group cart items by product ID and color, combining different sizes
  const groupedCartItems = (cartItems || []).reduce((groups, item) => {
    const key = `${item.id_articulo}-${item.selectedColor}`;

    if (!groups[key]) {
      groups[key] = {
        id: item.id_articulo,
        image: item.image,
        sku: item.id_articulo,
        title: item.title || item.name,
        variants: [],
        totalQuantity: 0,
        totalPrice: 0
      };
    }

    // Add size variant
    groups[key].variants.push({
      color: item.selectedColor,
      size: item.selectedSize,
      quantity: item.quantity,
      price: item.precio
    });

    // Update totals
    groups[key].totalQuantity += item.quantity;
    groups[key].totalPrice += item.precio * item.quantity;

    return groups;
  }, {});

  // Convert grouped items to CartItemCard format
  const cartItemCards = Object.values(groupedCartItems).map((groupedItem) => ({
    id: groupedItem.id,
    image: groupedItem.image,
    sku: groupedItem.sku,
    title: groupedItem.title,
    quantity: groupedItem.totalQuantity,
    priceWithDiscount: formatPrice(groupedItem.totalPrice),
    variants: groupedItem.variants
  }));

  // Component for a mobile menu item
  const MobileMenuItem = ({ menuKey, title, icon }) => {
    const isOpen = openMobileSubMenu === menuKey;
    const navigate = useNavigate();
    
    const handleMainClick = () => {
      setMobileMenuOpen(false);
      if (menuKey === 'nuevos') {
        navigate('/nuevos');
      } else if (menuKey === 'catalogos') {
        navigate('/catalogos');
      } else if (menuKey === 'categorias') {
        navigate('/categorias');
      } else if (menuKey === 'promociones') {
        navigate('/promociones');
      }
    };
    
    const handleToggleClick = (e) => {
      e.stopPropagation();
      toggleSubMenu(menuKey);
    };
    
    return (
      <li className="mobile-menu-item">
        <div className="mobile-menu-header">
          <div className="mobile-menu-title" onClick={handleMainClick}>
            {icon}
            <span>{title}</span>
          </div>
          <button
            className="mobile-menu-toggle-btn"
            onClick={handleToggleClick}
          >
            <img
              src={getIconPath('Chevron Down.svg')}
              alt="Expandir"
              className={`mobile-menu-arrow ${isOpen ? 'open' : ''}`}
            />
          </button>
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
      {/* Top Affiliate Bar - Solo mostrar si no hay usuario logueado */}
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
            <div className="search-container">
              <input
                type="text"
                placeholder="Buscar producto"
                className="search-input"
                value={searchTerm}
                onChange={handleSearchInputChange}
                onKeyPress={handleSearchKeyPress}
              />
              <button className="search-button" onClick={handleSearch}>
                <img src={getIconPath('Search.svg')} alt="Buscar" />
              </button>
            </div>
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
                    {isAdmin() && (
                      <>
                        <Link to="/admin" className="user-dropdown-item">
                          <img src={getIconPath('File Alt.svg')} alt="Dashboard" />
                          Dashboard
                        </Link>
                        <div className="user-dropdown-divider"></div>
                      </>
                    )}
                    <Link to="/perfil" className="user-dropdown-item">
                      <img src={getIconPath('Red User.svg')} alt="Perfil" />
                      Mi Perfil
                    </Link>
                    <Link to="/perfil/mis-pedidos" className="user-dropdown-item">
                      <img src={getIconPath('Red Box.svg')} alt="Órdenes" />
                      Mis Órdenes
                    </Link>
                    <Link to="/perfil/favoritos" className="user-dropdown-item">
                      <img src={getIconPath('Red Star.svg')} alt="Favoritos" />
                      Favoritos
                    </Link>
                    <Link to="/perfil/direcciones" className="user-dropdown-item">
                      <img src={getIconPath('Red Home.svg')} alt="Direcciones" />
                      Mis Direcciones
                    </Link>
                    <Link to="/perfil/metodos-pago" className="user-dropdown-item">
                      <img src={getIconPath('Red Bill.svg')} alt="Métodos de Pago" />
                      Métodos de Pago
                    </Link>
                    <div className="user-dropdown-divider"></div>
                    <button className="user-dropdown-item logout-item" onClick={logout}>
                      <img src={getIconPath('Logout.svg')} alt="Cerrar Sesión" />
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
                  <span>Afíliate aquí</span>
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
                <Link to="/nuevos" className="nav-link" data-discover="true">
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
                <Link to="/catalogos" className="nav-link">
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
          {activeMenu && menuData[activeMenu] && (
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
                              <Link 
                                to={item.link}
                                onClick={() => handleCategoryClick(item.name)}
                              >
                                {item.name}
                              </Link>
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
                <>
                  <input
                    type="text"
                    placeholder="Buscar producto"
                    className="mobile-search-input"
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    onKeyPress={handleSearchKeyPress}
                  />
                  <button className="mobile-search-button" onClick={handleSearch}>
                    <img src={getIconPath('Search.svg')} alt="Buscar" />
                  </button>
                </>
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
                <div className={`user-menu${userMenuOpen ? ' open' : ''}`} ref={userMenuRef}>
                  <div className="mobile-user-info">
                    <button
                      className="mobile-user-btn"
                      onClick={() => setUserMenuOpen((open) => !open)}
                    >
                      <div className="mobile-user-btn-content">
                        <img src={user.image || getIconPath('User.svg')} alt="Usuario" className="mobile-user-avatar" />
                        <span className="mobile-user-name">{user.first_name} {user.last_name}</span>
                      </div>
                      <img
                        src={getIconPath('Chevron Down.svg')}
                        alt="Menú"
                        className={`mobile-user-arrow${userMenuOpen ? ' open' : ''}`}
                      />
                    </button>
                  </div>
                  {userMenuOpen && (
                    <div className="mobile-user-dropdown">
                      {isAdmin() && (
                        <>
                          <Link to="/admin" className="user-dropdown-item">
                            <img src={getIconPath('File Alt.svg')} alt="Dashboard" />
                            Dashboard
                          </Link>
                          <div className="user-dropdown-divider"></div>
                        </>
                      )}
                      <Link to="/perfil" className="mobile-menu-account" onClick={() => { setMobileMenuOpen(false); setUserMenuOpen(false); }}>
                        <img src={getIconPath('User.svg')} alt="Perfil" />
                        <span>Mi Perfil</span>
                      </Link>
                      <Link to="/perfil/mis-pedidos" className="mobile-menu-account" onClick={() => { setMobileMenuOpen(false); setUserMenuOpen(false); }}>
                        <img src={getIconPath('Package.svg')} alt="Órdenes" />
                        <span>Mis Órdenes</span>
                      </Link>
                      <Link to="/perfil/favoritos" className="mobile-menu-account" onClick={() => { setMobileMenuOpen(false); setUserMenuOpen(false); }}>
                        <img src={getIconPath('Heart.svg')} alt="Favoritos" />
                        <span>Favoritos</span>
                      </Link>
                      <Link to="/perfil/direcciones" className="mobile-menu-account" onClick={() => { setMobileMenuOpen(false); setUserMenuOpen(false); }}>
                        <img src={getIconPath('Map Pin.svg')} alt="Direcciones" />
                        <span>Mis Direcciones</span>
                      </Link>
                      <Link to="/perfil/metodos-pago" className="mobile-menu-account" onClick={() => { setMobileMenuOpen(false); setUserMenuOpen(false); }}>
                        <img src={getIconPath('Credit Card.svg')} alt="Métodos de Pago" />
                        <span>Métodos de Pago</span>
                      </Link>
                      <button className="mobile-menu-account mobile-logout-btn" onClick={() => { logout(); setMobileMenuOpen(false); setUserMenuOpen(false); }}>
                        <img src={getIconPath('Log Out.svg')} alt="Cerrar Sesión" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link to="/login" className="mobile-menu-account" onClick={() => setMobileMenuOpen(false)}>
                    <img src={getIconPath('User.svg')} alt="Usuario" />
                    <span>Iniciar sesión</span>
                  </Link>
                  <Link to="/registro" className="mobile-menu-account" onClick={() => setMobileMenuOpen(false)}>
                    <span>Afíliate aquí</span>
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
