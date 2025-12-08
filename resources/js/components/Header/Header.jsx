import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getImagePath, getIconPath } from '../../utils/assetPaths';
import { formatPrice } from '../../utils/formatters';
import useUserStore from '../../store/userStore';
import useCartStore from '../../store/cartStore';
import CartModal from '../CartModal/CartModal';
import AdminNotifications from '../AdminNotifications/AdminNotifications';
import UserNotifications from '../UserNotifications/UserNotifications';
import { adminNotificationService, userNotificationService } from '../../services/api';
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
  const { initCart, isInitialized } = cartStore;

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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const userMenuRef = useRef(null);
  const mobileSearchInputRef = useRef(null);

  // Inicializar carrito al montar el Header o cuando cambia el usuario
  useEffect(() => {
    if (initCart && user) {
      // Si hay usuario, verificar si ya está inicializado antes de recargar
      // Esto evita sobrescribir el carrito que se acaba de sincronizar
      if (!isInitialized) {
        // Solo inicializar si no está inicializado (evita sobrescribir después de sync)
        initCart(true);
      }
    } else if (initCart && !user) {
      // Sin usuario, solo inicializar si no está inicializado
      if (!isInitialized) {
        initCart();
      }
    }
  }, [initCart, user, isInitialized]);

  // Debug: Log del totalPrice cuando cambia
  useEffect(() => {

  }, [cartItems, totalItems, totalPrice]);

  // Log del estado del menú para debugging
  useEffect(() => {
  }, [userMenuOpen]);

  // Cargar notificaciones no leídas para admins y usuarios
  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      if (user) {
        try {
          let response;
          if (isAdmin()) {
            response = await adminNotificationService.getAdminNotifications();
          } else {
            response = await userNotificationService.getUnreadCount();
          }

          if (response.data.success) {
            setUnreadNotifications(response.data.unread_count || 0);
          }
        } catch (error) {
        }
      }
    };

    fetchUnreadNotifications();

    // Actualizar cada 30 segundos
    const interval = setInterval(fetchUnreadNotifications, 30000);

    return () => clearInterval(interval);
  }, [user, isAdmin]);

  // Organizar categorías en grupos para el menú
  const getCategoryGroups = () => {
    // Si estamos en el panel de administración, no mostrar categorías
    if (isAdminPage) {
      return [];
    }

    // Si está cargando las categorías del menú
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

    // Solo mostrar las categorías del menú configuradas
    if (menuCategories && menuCategories.length > 0) {
      // Crear array con "Todos los productos" primero, luego las demás
      const allItems = [
        { name: 'Todos los productos', link: '/buscar#' },
        { name: 'Todas las categorías', link: '/categorias' },
        ...menuCategories.map(cat => ({
          name: cat.name,
          link: `/categoria/${cat.slug}`
        }))
      ];

      // Dividir en columnas de 4 items cada una
      const groups = [];
      const itemsPerColumn = 4;

      for (let i = 0; i < allItems.length; i += itemsPerColumn) {
        const columnItems = allItems.slice(i, i + itemsPerColumn);
        groups.push({
          title: '',
          items: columnItems
        });
      }

      return groups;
    }

    // Si no hay categorías del menú configuradas, solo mostrar "Todas las categorías"
    return [
      {
        title: '',
        items: [
          { name: 'Todas las categorías', link: '/categorias' }
        ]
      }
    ];
  };

  const menuData = {
    destacados: {
      title: 'Más Vendidos',
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

  // Handler for mobile search button
  const handleMobileSearchClick = () => {
    // If menu is closed, open it
    if (!mobileMenuOpen) {
      setMobileMenuOpen(true);
    }

    // Focus on search input after a small delay to ensure menu is rendered
    setTimeout(() => {
      if (mobileSearchInputRef.current) {
        mobileSearchInputRef.current.focus();
      }
    }, 100);
  };

  // Handler for opening/closing mobile submenus
  const toggleSubMenu = (key) => {
    setOpenMobileSubMenu(openMobileSubMenu === key ? null : key);
  };

  // Search functionality
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Enviar el string completo como término de búsqueda general
      const searchParams = new URLSearchParams();
      searchParams.set('q', searchTerm.trim());

      // Cerrar el menú móvil si está abierto
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
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

  // Función para convertir nombre de categoría de plural a singular
  const pluralToSingular = (categoryName) => {
    // Mapeo de plurales a singulares específicos
    const pluralMap = {
      'pantalones': 'pantalón',
      'vestidos': 'vestido',
      'blusas': 'blusa',
      'faldas': 'falda',
      'chaquetas': 'chaqueta',
      'abrigos': 'abrigo',
      'trajes': 'traje',
      'zapatos': 'zapato',
      'bolsos': 'bolso',
      'accesorios': 'accesorio',
      'suéteres': 'suéter',
      'camisas': 'camisa',
      'playeras': 'playera',
      'chamarras': 'chamarra',
      'shorts': 'short',
      'calcetines': 'calcetín',
      'leggins': 'leggin',
      'jeans': 'jean'
    };

    const lowerName = categoryName.toLowerCase().trim();

    // Si existe en el mapeo, retornar el singular
    if (pluralMap[lowerName]) {
      return pluralMap[lowerName];
    }

    // Reglas generales para español
    // Si termina en "ones" (como "pantalones"), cambiar a "ón"
    if (lowerName.endsWith('ones')) {
      return lowerName.slice(0, -4) + 'ón';
    }

    // Si termina en "es" después de consonante, quitar "es"
    if (lowerName.endsWith('es') && lowerName.length > 3) {
      const beforeEs = lowerName[lowerName.length - 3];
      if (!'aeiou'.includes(beforeEs)) {
        return lowerName.slice(0, -2);
      }
    }

    // Si termina en "s" simple, quitarla
    if (lowerName.endsWith('s') && !lowerName.endsWith('ss')) {
      return lowerName.slice(0, -1);
    }

    // Si no se puede convertir, retornar el original
    return categoryName;
  };

  // Función para manejar clic en elementos del menú
  const handleMenuClick = (e, item, activeMenuType) => {
    // Cerrar el menú desplegable
    setActiveMenu(null);

    // Para categorías individuales, prevenir navegación por defecto y hacer búsqueda con nombre en singular
    if (activeMenuType === 'categorias' && item.link.startsWith('/categoria/')) {
      e.preventDefault(); // Prevenir la navegación del Link
      const singularName = pluralToSingular(item.name);
      setSearchTerm(singularName);
      const searchParams = new URLSearchParams();
      searchParams.set('q', singularName);
      navigate(`/buscar?${searchParams.toString()}`);
    }
    // Para otros casos, dejar que el Link navegue normalmente
  };

  // Cargar usuario al montar si hay token
  useEffect(() => {
    if (!user && localStorage.getItem('token')) fetchUser();
  }, [user, fetchUser]);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    if (!userMenuOpen) return; // No agregar el listener si el menú no está abierto

    const handleClickOutside = (event) => {
      // Solo cerrar si el menú está abierto y el click fue fuera del menú
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    // Usar un pequeño delay para evitar que el click que abre el menú lo cierre inmediatamente
    const timerId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

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
      price: item.precio,
      isFreeItem: item.isFreeItem,
      freeItemsCount: item.freeItemsCount,
      freeItemReason: item.freeItemReason
    });

    // Update totals
    groups[key].totalQuantity += item.quantity;

    // Considerar items gratuitos en el cálculo del precio
    if (item.isFreeItem) {
      // Si el item es completamente gratis, no sumar al precio
      groups[key].totalPrice += 0;
    } else if (item.freeItemsCount && item.freeItemsCount > 0) {
      // Si tiene algunos items gratuitos, solo sumar los pagados
      const paidQuantity = item.quantity - item.freeItemsCount;
      groups[key].totalPrice += item.precio * paidQuantity;
    } else {
      // Item normal sin ofertas
      groups[key].totalPrice += item.precio * item.quantity;
    }

    return groups;
  }, {});

  // Convert grouped items to CartItemCard format
  const cartItemCards = Object.values(groupedCartItems).map((groupedItem) => ({
    id: groupedItem.id,
    image: groupedItem.image,
    sku: groupedItem.sku,
    title: groupedItem.title,
    quantity: groupedItem.totalQuantity,
    priceWithDiscount: groupedItem.totalPrice, // Pasar número sin formatear
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
                        onClick={(e) => {
                          setMobileMenuOpen(false);
                          handleMenuClick(e, item, menuKey);
                        }}
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
        <div className="affiliate-bar-header">
          <div className="affiliate-container-header">
            <p className="affiliate-text-header">¡Afiliate ahora mismo y comienza tu propio negocio!</p>
            <Link to="/registro" className="affiliate-button-header">Afiliate aquí</Link>
          </div>
        </div>
      )}

      {/* Main Header */}
      <div className="main-header">
        <div className="header-container">
          {/* Logo */}
          <Link to="/" className="header-logo">
            <img src="/icons/logo-cherry.png" alt="Cherry" />
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
                <button
                  className="user-action user-menu-btn"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const newState = !userMenuOpen;
                    setUserMenuOpen(newState);
                  }}
                >
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
                  <img className="header-user-action-icon" src={getIconPath('User.svg')} alt="Usuario" />
                  <span>Iniciar sesión</span>
                </Link>
                <Link to="/registro" className="user-action">
                  <span>Afíliate aquí</span>
                </Link>
              </>
            )}

            {user && (
              <button
                type="button"
                className="user-action icon-only"
                onClick={() => setNotificationsOpen(true)}
              >
                <div className="icon-badge">
                  <img src={getIconPath('Bell.svg')} alt="Notificaciones" />
                  {unreadNotifications > 0 && (
                    <span className="badge notification-badge">{unreadNotifications}</span>
                  )}
                </div>
              </button>
            )}

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

              <li className="nav-item new-items" onMouseEnter={() => setActiveMenu(null)}>
                <Link to="/nuevos" className="nav-link" data-discover="true">
                  <img src={getIconPath('Cart Plus.svg')} alt="Nuevos" />
                  Nuevos
                </Link>
              </li>
              <li className="nav-item nav-divider"></li>
              <li className="nav-item" onMouseEnter={() => setActiveMenu(null)}>
                <Link to="/destacados" className="nav-link">
                  <img src={getIconPath('Award.svg')} alt="Más Vendidos" />
                  Más Vendidos
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
              <li className="nav-item" onMouseEnter={() => setActiveMenu(null)}>
                <Link to="/promociones" className="nav-link">
                  <img src={getIconPath('Bullhorn.svg')} alt="Rebajas" />
                  Rebajas
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
                                onClick={(e) => handleMenuClick(e, item, activeMenu)}
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

          <button
            id="btn-buscar"
            className="mobile-search-button-trigger"
            onClick={handleMobileSearchClick}
            aria-label="Buscar"
          >
            <img src={getIconPath('Search.svg')} alt="Buscar" />
            <span>Buscar</span>
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
                    id="campo-buscador-menu"
                    ref={mobileSearchInputRef}
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
              <li className="mobile-menu-item">
                <Link to="/nuevos" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                  <img src={getIconPath('Cart Plus.svg')} alt="Nuevos" />
                  <span>Nuevos</span>
                </Link>
              </li>

              <li className="mobile-menu-item">
                <Link to="/destacados" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                  <img src={getIconPath('Award.svg')} alt="Más Vendidos" />
                  <span>Más Vendidos</span>
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

              <li className="mobile-menu-item">
                <Link to="/promociones" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                  <img src={getIconPath('Bullhorn.svg')} alt="Rebajas" />
                  <span>Rebajas</span>
                </Link>
              </li>

              <li className="mobile-menu-item">
                <Link to="/contacto" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                  <img src={getIconPath('Phone.svg')} alt="Contacto" />
                  <span>Contacto</span>
                </Link>
              </li>
            </ul>

            <div
              className="mobile-menu-footer"
              onClick={(e) => {
              }}
            >
              {user ? (
                <div
                  className={`user-menu${userMenuOpen ? ' open' : ''}`}
                  ref={userMenuRef}
                  onClick={(e) => {
                  }}
                >
                  <button
                    className="mobile-user-btn"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const newState = !userMenuOpen;
                      setUserMenuOpen(newState);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const newState = !userMenuOpen;
                      setUserMenuOpen(newState);
                    }}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
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
                      <img
                        src={getIconPath('Red Star.svg')}
                        alt="Favoritos"
                        onError={(e) => {
                          e.target.src = '/icons/Red Star.svg';
                        }}
                      />
                      <span>Favoritos</span>
                    </Link>
                    <Link to="/perfil/direcciones" className="mobile-menu-account" onClick={() => { setMobileMenuOpen(false); setUserMenuOpen(false); }}>
                      <img
                        src={getIconPath('Red Home.svg')}
                        alt="Direcciones"
                        onError={(e) => {
                          e.target.src = '/icons/Red Home.svg';
                        }}
                      />
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
        onClose={() => {
          setCartModalOpen(false);
        }}
        cartItems={cartItemCards}
        subtotal={(() => {
          const formatted = formatPrice(totalPrice);
          return formatted;
        })()}
        onViewCart={() => { setCartModalOpen(false); navigate('/carrito-detalle'); }}
        onCheckout={() => { setCartModalOpen(false); navigate('/carrito-detalle'); }}
      />

      {user && isAdmin() && (
        <AdminNotifications
          isOpen={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
        />
      )}

      {user && !isAdmin() && (
        <UserNotifications
          isOpen={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
        />
      )}
    </header>
  );
};

export default Header; 
