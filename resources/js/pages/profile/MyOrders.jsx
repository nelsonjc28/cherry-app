import { useState } from 'react';
import './ProfileSection.css';
import './MyOrders.css';
import CherryButton from '../../components/CherryButton/CherryButton';
import Pagination from '../../components/Pagination/Pagination';
import { getIconPath } from '../../utils/assetPaths';

const MyOrders = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('recent');

  // Mock data para los pedidos
  const mockOrders = [
    {
      id: 1,
      date: '30 de junio 2024',
      orderNumber: '39732-8039',
      status: 'Entregado',
      statusColor: 'green',
      image: '/images/catalogProductImages/Rectangle 4922.png',
      title: 'Chamarra de mezclilla con detalles bordados',
      quantity: 4,
      totalWithoutDiscount: 1899.00,
      totalWithDiscount: 1329.30
    },
    {
      id: 2,
      date: '30 de junio 2024',
      orderNumber: '39732-8039',
      status: 'En vía',
      statusColor: 'orange',
      image: '/images/catalogProductImages/Rectangle 4922 (1).png',
      title: 'Chamarra de mezclilla con detalles bordados',
      quantity: 4,
      totalWithoutDiscount: 1899.00,
      totalWithDiscount: 1329.30
    },
    {
      id: 3,
      date: '30 de junio 2024',
      orderNumber: '39732-8039',
      status: 'En vía',
      statusColor: 'orange',
      image: '/images/catalogProductImages/Rectangle 4922.png',
      title: 'Chamarra de mezclilla con detalles bordados',
      quantity: 4,
      totalWithoutDiscount: 1899.00,
      totalWithDiscount: 1329.30
    },
    {
      id: 4,
      date: '30 de junio 2024',
      orderNumber: '39732-8039',
      status: 'Entregado',
      statusColor: 'green',
      image: '/images/catalogProductImages/Rectangle 4922 (1).png',
      title: 'Chamarra de mezclilla con detalles bordados',
      quantity: 4,
      totalWithoutDiscount: 1899.00,
      totalWithDiscount: 1329.30
    },
    {
      id: 5,
      date: '30 de junio 2024',
      orderNumber: '39732-8039',
      status: 'Entregado',
      statusColor: 'green',
      image: '/images/catalogProductImages/Rectangle 4922.png',
      title: 'Chamarra de mezclilla con detalles bordados',
      quantity: 4,
      totalWithoutDiscount: 1899.00,
      totalWithDiscount: 1329.30
    }
  ];

  const totalPages = 12;

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
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
          {mockOrders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-card__header">
                <div className="order-card__date">{order.date}</div>
                <div className="order-card__number">{order.orderNumber}</div>
              </div>

              <div className="order-card__content">
                <div className="order-card__main-content">
                  <div className="order-card__image">
                    <img src={order.image} alt={order.title} />
                  </div>

                  <div className="order-card__details">
                    <div className="order-card__status">
                      <span className={`status-badge status-badge--${order.statusColor}`}>
                        {order.status}
                      </span>
                    </div>

                    <h3 className="order-card__title">{order.title}</h3>

                    <div className="order-card__info">
                      <div className="order-card__quantity">
                        Cantidad de piezas: <span>{order.quantity}</span>
                      </div>
                      <div className="order-card__price-line">
                        Total sin descuento: <span>${order.totalWithoutDiscount.toFixed(2)}</span>
                      </div>
                      <div className="order-card__price-line">
                        Total con descuento: <span>${order.totalWithDiscount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="order-card__actions">
                  <CherryButton
                    variant="outline"
                    size="small"
                    className="order-card__btn"
                    icon={
                      <img src={getIconPath('Document.svg')} alt="Ver compra" style={{ width: 14, height: 14 }} />
                    }
                    iconPosition="left"
                  >
                    Ver compra
                  </CherryButton>
                  <CherryButton
                    variant="red"
                    size="small"
                    className="order-card__btn"
                  >
                    Volver a comprar
                  </CherryButton>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="my-orders__pagination">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </div>
  );
};

export default MyOrders;
