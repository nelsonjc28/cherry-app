import React from 'react';
import useUserStore from '../../store/userStore';
import './BuyerInfo.css';

const BuyerInfo = ({ className = '' }) => {
  const { user } = useUserStore();

  if (!user) {
    return (
      <div className={`buyer-info ${className}`}>
        <div className="buyer-info__error">
          <span className="buyer-info__error-icon">⚠️</span>
          <span>No se pudo cargar la información del comprador</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`buyer-info ${className}`}>
      <div className="buyer-info__header">
        <h3 className="buyer-info__title">Datos del Comprador</h3>
      </div>
      
      <div className="buyer-info__content">
        <div className="buyer-info__field">
          <label className="buyer-info__label">Nombre completo</label>
          <div className="buyer-info__value">
            {user.first_name} {user.middle_name && `${user.middle_name} `}{user.last_name}
          </div>
        </div>
        
        <div className="buyer-info__field">
          <label className="buyer-info__label">Correo electrónico</label>
          <div className="buyer-info__value">{user.email}</div>
        </div>
        
        {user.phone && (
          <div className="buyer-info__field">
            <label className="buyer-info__label">Teléfono</label>
            <div className="buyer-info__value">{user.phone}</div>
          </div>
        )}
        
        <div className="buyer-info__field">
          <label className="buyer-info__label">Tipo de usuario</label>
          <div className="buyer-info__value">
            <span className={`buyer-info__role buyer-info__role--${user.role_id === 1 ? 'admin' : 'client'}`}>
              {user.role_id === 1 ? 'Administrador' : 'Cliente'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyerInfo;
