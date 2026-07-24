import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useUserStore from '../../store/userStore';
import { listMyBuyers, listMyOrders } from '../../api/vendorApi';
import './VendorPages.css';

const VendorDashboard = () => {
  const { user } = useUserStore();
  const [buyers, setBuyers] = useState([]);
  const [ordersCount, setOrdersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [buyersRes, ordersRes] = await Promise.all([
          listMyBuyers(),
          listMyOrders({ per_page: 1 }),
        ]);
        setBuyers(buyersRes.buyers || []);
        setOrdersCount(ordersRes.pagination?.total ?? 0);
      } catch (err) {
        if (window.showToast) {
          window.showToast('Error al cargar datos: ' + err.message, 'error');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="vendor-page">
      <header className="vendor-page__header">
        <h1>Bienvenido, {user?.first_name}</h1>
        <p>
          Estás autenticado como <strong>Vendedor</strong>. Aquí puedes gestionar
          pedidos para tus clientes asociados.
        </p>
      </header>

      {loading ? (
        <div className="vendor-page__loading">Cargando...</div>
      ) : (
        <div className="vendor-dashboard__cards">
          <div className="vendor-card">
            <div className="vendor-card__icon">👥</div>
            <div className="vendor-card__content">
              <div className="vendor-card__value">{buyers.length}</div>
              <div className="vendor-card__label">Compradores asociados</div>
            </div>
          </div>

          <div className="vendor-card">
            <div className="vendor-card__icon">📦</div>
            <div className="vendor-card__content">
              <div className="vendor-card__value">{ordersCount}</div>
              <div className="vendor-card__label">Pedidos registrados</div>
            </div>
          </div>

          <div className="vendor-card vendor-card--action">
            <Link to="/carrito-detalle" className="vendor-card__link">
              <div className="vendor-card__icon">🛒</div>
              <div className="vendor-card__content">
                <div className="vendor-card__label">Ir al Carrito</div>
                <div className="vendor-card__hint">
                  Crea un pedido para un cliente desde el carrito
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}

      {buyers.length === 0 && !loading && (
        <div className="vendor-page__empty">
          <h3>Aún no tienes compradores asociados</h3>
          <p>
            Un administrador debe asignarte clientes con categoría Oro o Diamante
            para que puedas gestionar pedidos en su nombre.
          </p>
        </div>
      )}

      {buyers.length > 0 && (
        <section className="vendor-page__section">
          <h2>Tus compradores</h2>
          <ul className="vendor-buyer-mini-list">
            {buyers.map((b) => (
              <li key={b.id} className="vendor-buyer-mini-list__item">
                <div>
                  <div className="vendor-buyer-mini-list__name">
                    {b.first_name} {b.last_name}
                  </div>
                  <div className="vendor-buyer-mini-list__email">
                    {b.email || b.phone}
                  </div>
                </div>
                <span
                  className={`vendor-category-badge vendor-category-badge--${b.seller_category}`}
                >
                  {b.seller_category === 'oro' ? 'Oro' : 'Diamante'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default VendorDashboard;