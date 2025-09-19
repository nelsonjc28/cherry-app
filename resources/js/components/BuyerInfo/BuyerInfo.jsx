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
    <div className={`buyer-info ${className}`}>
      <div className="buyer-info__header">
        <h3>Datos del comprador</h3>
      </div>
      
      <div className="buyer-info__content">
        <div className="buyer-info__field">
          <span className="buyer-info__label">Nombre:</span>
          <span className="buyer-info__value">
            {user.first_name} {user.middle_name} {user.last_name}
          </span>
        </div>
        
        <div className="buyer-info__field">
          <span className="buyer-info__label">Email:</span>
          <span className="buyer-info__value">{user.email}</span>
        </div>
        
        {user.phone && (
          <div className="buyer-info__field">
            <span className="buyer-info__label">Teléfono:</span>
            <span className="buyer-info__value">{user.phone}</span>
          </div>
        )}
        
        <div className="buyer-info__field">
          <span className="buyer-info__label">Tipo de usuario:</span>
          <span className="buyer-info__value">
            {user.role?.name === 'admin' ? 'Administrador' : 'Cliente'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BuyerInfo;