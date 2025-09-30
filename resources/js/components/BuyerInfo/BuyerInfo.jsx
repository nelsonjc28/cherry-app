import React from 'react';
import useUserStore from '../../store/userStore';
import './BuyerInfo.css';

const BuyerInfo = ({ className = '' }) => {
  const { user } = useUserStore();

  if (!user) {
    return (
      <div className={`buyer-info ${className}`}>
        <div className="buyer-info__error">
          <p>No se pudo cargar la información del usuario</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`cart-order-summary__section ${className}`}>
      <div className="cart-order-summary__section-title">Datos del comprador</div>
      <div className="cart-order-summary__section-content">
        <div className="cart-order-summary__responsable-name">
          {user.first_name} {user.middle_name} {user.last_name}
        </div>
        <div className="cart-order-summary__row">
          <span>Email</span>
          <span>{user.email}</span>
        </div>
        {user.phone && (
          <div className="cart-order-summary__row">
            <span>Teléfono</span>
            <span>{user.phone}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerInfo;