import React from 'react';
import useUserStore from '../../store/userStore';
import './HeaderAffiliateBanner.css';

const HeaderAffiliateBanner = () => {
  const { user } = useUserStore();

  // Solo mostrar si no hay usuario logueado
  if (user) {
    return null;
  }

  return (
    
    <div className="affiliate-container">
      <p className="affiliate-text-header">¡Afiliate ahora mismo y comienza tu propio negocio!</p>
      <a className="affiliate-button-header" href="/afiliate" data-discover="true">Afiliate aquí</a>
    </div>
  );
};

export default HeaderAffiliateBanner;
