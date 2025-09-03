import React from 'react';
import useAuthGuard from '../../hooks/useAuthGuard';
import './AdminExample.css';

/**
 * Componente de ejemplo que muestra cómo usar el hook useAuthGuard
 * Este componente se redirigirá automáticamente al login si el token expiró
 */
const AdminExample = () => {
  // Usar el hook de autenticación
  const { isAuthenticated, logout, extendSession } = useAuthGuard();

  // Si no está autenticado, no se renderizará (será redirigido)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="admin-example">
      <div className="admin-example__header">
        <h2>Panel de Administración</h2>
        <p>Bienvenido al panel de administración</p>
      </div>

      <div className="admin-example__content">
        <div className="admin-example__card">
          <h3>Estado de la Sesión</h3>
          <p>Tu sesión está activa y funcionando correctamente.</p>
          <div className="admin-example__actions">
            <button 
              onClick={extendSession}
              className="admin-example__btn admin-example__btn--primary"
            >
              Extender Sesión
            </button>
            <button 
              onClick={logout}
              className="admin-example__btn admin-example__btn--danger"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        <div className="admin-example__card">
          <h3>Funcionalidades Disponibles</h3>
          <ul>
            <li>✅ Gestión de Secciones de Bienvenida</li>
            <li>✅ Gestión de Catálogos</li>
            <li>✅ Gestión de Categorías</li>
            <li>✅ Gestión de Ofertas</li>
            <li>✅ Gestión de Usuarios</li>
          </ul>
        </div>

        <div className="admin-example__card">
          <h3>Información de Seguridad</h3>
          <p>Este componente está protegido por el hook <code>useAuthGuard</code>.</p>
          <p>Si tu token expira, serás redirigido automáticamente al login.</p>
          <p>La autenticación se verifica cada 5 minutos.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminExample;
