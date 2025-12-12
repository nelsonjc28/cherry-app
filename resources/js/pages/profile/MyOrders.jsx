import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ProfileSection.css';
import './MyOrders.css';
import CherryButton from '../../components/CherryButton/CherryButton';
import OrderDetailModal from '../../components/OrderDetailModal/OrderDetailModal';
import { orderService } from '../../services/api';
import api from '../../config/axios';

// Función para determinar el color del texto según el color de fondo
const getContrastColor = (hexColor) => {
  if (!hexColor) return '#333';

  // Si el color no tiene #, agregarlo
  const hex = hexColor.startsWith('#') ? hexColor : `#${hexColor}`;

  // Convertir hex a RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Calcular luminancia
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Retornar blanco o negro según la luminancia
  return luminance > 0.5 ? '#000' : '#fff';
};

const MyOrders = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('recent');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  // Cargar órdenes del usuario
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await orderService.getUserOrders();

        if (response.data.success) {
          setOrders(response.data.orders || []);
        } else {
          setError(response.data.message || 'Error al cargar las órdenes');
        }
      } catch (err) {
        setError('Error de conexión al cargar las órdenes');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Ordenar órdenes según el filtro seleccionado
  const sortedOrders = [...orders].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.date) - new Date(a.date);
      case 'oldest':
        return new Date(a.date) - new Date(b.date);
      case 'status':
        return a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });

  // Paginación
  const itemsPerPage = 5;
  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = sortedOrders.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setCurrentPage(1); // Reset to first page when sorting
  };

  const handleWriteReview = (orderId, productId) => {
    navigate(`/escribir-resena/${orderId}/${productId}`);
  };

  const handleRateProduct = (orderId, productId) => {
    navigate(`/escribir-resena/${orderId}/${productId}`);
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  return (
    <div className="profile-section">
      <div className="my-orders">
        <div className="my-orders__header">
          <h1 className="my-orders__title">Mis pedidos</h1>
          <div className="my-orders__sort">
            <label htmlFor="sort-select">Ordenar por:</label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={handleSortChange}
              className="my-orders__sort-select"
            >
              <option value="recent">más recientes</option>
              <option value="oldest">más antiguos</option>
              <option value="status">estado</option>
            </select>
          </div>
        </div>

        <div className="my-orders__list">
          {loading ? (
            <div className="my-orders__loading">
              <p>Cargando órdenes...</p>
            </div>
          ) : error ? (
            <div className="my-orders__error">
              <p>Error: {error}</p>
              <CherryButton
                variant="outline"
                size="small"
                onClick={() => window.location.reload()}
              >
                Reintentar
              </CherryButton>
            </div>
          ) : paginatedOrders.length === 0 ? (
            <div className="my-orders__empty">
              <p>No tienes órdenes aún.</p>
              <CherryButton
                variant="red"
                size="medium"
                onClick={() => navigate('/')}
              >
                Empezar a comprar
              </CherryButton>
            </div>
          ) : (
            paginatedOrders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-card__header">
                  <div className="order-card__date">{order.date}</div>
                  <div className="order-card__number">{order.orderNumber}</div>
                </div>

                <div className="order-card__content">
                  <div className="order-card__main-content">
                    <div className="order-card__image">
                      {order.items && order.items.length > 0 ? (
                        <>
                      <img
                            src={order.items[0]?.image || '/images/catalogProductImages/Rectangle 4922.png'}
                            alt={order.items[0]?.title || 'Producto'}
                        onError={(e) => {
                          e.target.src = '/images/catalogProductImages/Rectangle 4922.png';
                        }}
                      />
                          {order.items.length > 1 && (
                            <div className="order-card__more-items-badge">
                              +{order.items.length - 1}
                            </div>
                          )}
                        </>
                      ) : (
                        <img
                          src="/images/catalogProductImages/Rectangle 4922.png"
                          alt="Producto"
                        />
                      )}
                    </div>

                    <div className="order-card__details">
                      <div className="order-card__status">
                        <span className={`status-badge status-badge--${order.statusColor}`}>
                          {order.status}
                        </span>
                      </div>

                      <h3 className="order-card__title">
                        {order.items && order.items.length > 0 
                          ? order.items[0]?.title || 'Producto'
                          : 'Producto'}
                        {order.items && order.items.length > 1 && (
                          <span className="order-card__title-more"> y {order.items.length - 1} más</span>
                        )}
                      </h3>

                      <div className="order-card__info">
                        {order.items && order.items.length > 0 ? (
                          <>
                            <div className="order-card__total-line">
                              Cantidad total: <span>{order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}</span>
                            </div>
                            {order.items.length === 1 && (
                              <>
                        <div className="order-card__total-line">
                                  Precio unitario: <span>${(parseFloat(order.items[0]?.price) || 0).toFixed(2)}</span>
                        </div>
                        <div className="order-card__total-line">
                                  Subtotal: <span>${(parseFloat(order.items[0]?.subtotal) || 0).toFixed(2)}</span>
                        </div>
                              </>
                            )}
                        <div className="order-card__total-line">
                              Total: <span>${(parseFloat(order.totalAmount) || 0).toFixed(2)}</span>
                        </div>
                          </>
                        ) : (
                        <div className="order-card__total-line">
                          Total: <span>${(parseFloat(order.totalAmount) || 0).toFixed(2)}</span>
                        </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="order-card__actions">
                    <CherryButton
                      variant="outline"
                      size="small"
                      className="order-card__btn"
                      onClick={() => handleViewOrder(order)}
                      icon={
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M13.3392 5.15096L12.0111 1.19263C11.8548 0.697835 11.3861 0.333252 10.8392 0.333252H2.63607C2.08919 0.333252 1.62044 0.697835 1.46419 1.19263L0.136068 5.15096C0.0839844 5.28117 0.0839844 5.41138 0.0839844 5.54158V12.4166C0.0839844 13.1197 0.630859 13.6666 1.33398 13.6666H12.1673C12.8444 13.6666 13.4173 13.1197 13.4173 12.4166V5.54158C13.4173 5.41138 13.3913 5.28117 13.3392 5.15096ZM12.0892 5.33325H7.37565V1.58325H10.8392L12.0892 5.33325ZM2.63607 1.58325H6.12565V5.33325H1.38607L2.63607 1.58325ZM1.33398 12.4166V6.58325H12.1673V12.4166H1.33398Z" fill="#333333" />
                        </svg>
                      }
                      iconPosition="left"
                    >
                      Ver compra
                    </CherryButton>
                    {(order.statusRaw === 'enviado') && order.items?.[0] && !order.items[0].hasReview && (
                      <CherryButton
                        variant="red"
                        size="small"
                        className="order-card__btn order-card__btn--review"
                        onClick={() => handleWriteReview(order.id, order.items[0].product_id)}
                        icon={
                          <svg width="18" height="17" viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16.7906 6.02192L11.7 5.23442L9.39377 0.396924C9.22502 0.0594238 8.77502 0.0594238 8.60627 0.396924L6.30002 5.26255L1.23752 6.02192C0.871891 6.07817 0.731266 6.5563 1.01252 6.80942L4.69689 10.6063L3.82502 15.9219C3.76877 16.2875 4.13439 16.5969 4.47189 16.3719L9.05627 13.8688L13.6125 16.3719C13.9219 16.5407 14.3156 16.2594 14.2313 15.9219L13.3594 10.6063L17.0438 6.80942C17.2688 6.5563 17.1563 6.07817 16.7906 6.02192Z" fill="#FFC800" />
                          </svg>
                        }
                        iconPosition="left"
                      >
                        Calificar
                      </CherryButton>
                    )}
                    {(order.statusRaw === 'enviado') && order.items?.[0] && order.items[0].hasReview && (
                      <div className="order-card__reviewed">
                        <span className="reviewed-text">✅ Ya calificado</span>
                      </div>
                    )}
                    <CherryButton
                      variant="red"
                      size="small"
                      className="order-card__btn"
                      onClick={() => navigate('/catalogos')}
                    >
                      Volver a comprar
                    </CherryButton>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="my-orders__pagination">
            <div className="pagination-controls">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-button"
              >
                Anterior
              </button>
              <span className="pagination-info">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-button"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalle de orden */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default MyOrders;