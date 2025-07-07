import PropTypes from 'prop-types';
import CartItemCard from '../CartItemCard';
import CherryButton from '../CherryButton';
import CustomButton from '../CustomButton';
import './CartModal.css';

const CartModal = ({ open, onClose, cartItems, subtotal, onViewCart, onCheckout }) => {
  if (!open) return null;

  return (
    <div className="cart-modal__overlay">
      <div className="cart-modal__container">
        <div className="cart-modal__header">
          <h2 className="cart-modal__title">Artículos en tu carrito</h2>
          <button className="cart-modal__close-btn" onClick={onClose} aria-label="Cerrar">
            <span className="cart-modal__close-icon">×</span>
          </button>
        </div>
        <div className="cart-modal__divider" />
        <div className="cart-modal__items-list">
          {cartItems.length === 0 ? (
            <div className="cart-modal__empty">Tu carrito está vacío.</div>
          ) : (
            cartItems.map((item) => (
              <CartItemCard key={item.id} {...item} />
            ))
          )}
        </div>
        <div className="cart-modal__footer">
          <div className="cart-modal__subtotal-row">
            <span className="cart-modal__subtotal-label">Total parcial:</span>
            <span className="cart-modal__subtotal-value">${subtotal}</span>
          </div>
          <div className="cart-modal__actions">
            <CustomButton
              variant="outlined"
              size="large"
              onClick={onViewCart}
              className="cart-modal__action-btn"
            >
              <span role="img" aria-label="carrito">🛒</span> Ver detalle del carrito
            </CustomButton>
            <CherryButton
              variant="red"
              size="large"
              onClick={onCheckout}
              className="cart-modal__action-btn"
            >
              Generar pedido
            </CherryButton>
          </div>
        </div>
      </div>
    </div>
  );
};

CartModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  cartItems: PropTypes.arrayOf(PropTypes.object).isRequired,
  subtotal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onViewCart: PropTypes.func.isRequired,
  onCheckout: PropTypes.func.isRequired
};

export default CartModal; 