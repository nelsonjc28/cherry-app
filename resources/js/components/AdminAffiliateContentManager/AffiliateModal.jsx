import './AdminAffiliateContentManager.css';

/**
 * Modal con la misma apariencia que el formulario del módulo de Gestión de Clientes.
 * Importa el CSS directamente para garantizar que los estilos del overlay y
 * la tarjeta (position: fixed, fondo oscuro, z-index) siempre se apliquen.
 */
const AffiliateModal = ({ isOpen, onClose, title, children, footer = null }) => {
  if (!isOpen) return null;

  return (
    <div className="affiliate-manager__form-overlay" onClick={onClose}>
      <div className="affiliate-manager__form" onClick={(e) => e.stopPropagation()}>
        <div className="affiliate-manager__form-header">
          <h3>{title}</h3>
          <button className="affiliate-manager__form-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        {children}
        {footer && <div className="affiliate-manager__form-actions">{footer}</div>}
      </div>
    </div>
  );
};

export default AffiliateModal;