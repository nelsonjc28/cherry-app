import PropTypes from 'prop-types';
import CartItemCard from '../CartItemCard';
import CherryButton from '../CherryButton';
import CustomButton from '../CustomButton';
import './CartModal.css';
import { getIconPath } from '../../utils/assetPaths';
import { useEffect } from 'react';

const CartModal = ({ open, onClose, cartItems, subtotal, onViewCart, onCheckout }) => {   
  
  
  useEffect(() => {
    if (open) {
      // This blocks the movement of the body
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, subtotal]);

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
            <span className="cart-modal__subtotal-label">Total:</span>
            <span className="cart-modal__subtotal-value">{subtotal}</span>
          </div>
          <div className="cart-modal__actions">
            <CustomButton
              variant="outlined"
              size="large"
              onClick={onViewCart}
              iconLeft={<img className="cart-modal__cart-icon" src={getIconPath('Shopping Cart.svg')} alt="Cart" />}
              className="cart-modal__action-btn"
            >
              Ver detalle del carrito
            </CustomButton>
            <CherryButton
              variant="red"
              size="large"
              onClick={onCheckout}
              className="cart-modal__action-btn order-letter-btn"
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