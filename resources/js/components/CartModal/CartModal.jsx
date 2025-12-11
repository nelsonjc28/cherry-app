import PropTypes from 'prop-types';
import CartItemCard from '../CartItemCard';
import CherryButton from '../CherryButton';
import CustomButton from '../CustomButton';
import './CartModal.css';
import { getIconPath } from '../../utils/assetPaths';
import { useEffect, useMemo } from 'react';
import useUserStore from '../../store/userStore';

const CartModal = ({ open, onClose, cartItems, subtotal, onViewCart, onCheckout }) => {   
  const { user } = useUserStore();
  
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

  // Detectar si hay productos con rebaja
  const hasProductsWithDiscount = useMemo(() => {
    if (!cartItems || cartItems.length === 0) {
      return false;
    }
    
    return cartItems.some(item => {
      const hasPromo = item.desc_promo && item.desc_promo > 0;
      const hasUserOffer = item.userOffer && item.userOffer.discount_category !== null;
      return hasPromo || hasUserOffer;
    });
  }, [cartItems]);

  // Calcular beneficios disponibles
  const benefits = useMemo(() => {
    if (!cartItems || cartItems.length === 0) {
      return { discount30: false, discount40: false, freeShipping: false };
    }

    // Calcular total elegible (solo productos con desc_promo = 0 y sin userOffer)
    const eligibleItems = cartItems.filter(item => {
      const hasNoPromo = item.desc_promo === 0 || item.desc_promo === null || item.desc_promo === undefined;
      const hasNoUserOffer = !item.userOffer || item.userOffer.discount_category === null;
      return hasNoPromo && hasNoUserOffer;
    });

    const eligibleTotal = eligibleItems.reduce((sum, item) => {
      const itemPrice = item.precio || item.price || 0;
      const itemQuantity = item.quantity || 0;
      return sum + (itemPrice * itemQuantity);
    }, 0);

    // Calcular total después de descuentos para envío gratis
    let discountAmount = 0;
    if (eligibleTotal >= 7000) {
      if (eligibleTotal >= 15000) {
        const discount30 = eligibleTotal * 0.30;
        const totalAfter30 = eligibleTotal - discount30;
        const discount10 = totalAfter30 * 0.10;
        discountAmount = discount30 + discount10;
      } else {
        discountAmount = eligibleTotal * 0.30;
      }
    }

    const totalAfterDiscount = eligibleTotal - discountAmount;
    const freeShippingMin = user?.free_shipping_min_amount || 3000;
    const hasFreeShipping = user?.free_shipping 
      ? totalAfterDiscount >= (user.free_shipping_min_amount || 3000)
      : totalAfterDiscount >= 3000;

    return {
      discount30: eligibleTotal >= 7000,
      discount40: eligibleTotal >= 15000,
      freeShipping: hasFreeShipping,
      eligibleTotal,
      remainingForDiscount30: eligibleTotal < 7000 ? 7000 - eligibleTotal : 0,
      remainingForDiscount40: eligibleTotal >= 7000 && eligibleTotal < 15000 ? 15000 - eligibleTotal : 0,
      remainingForFreeShipping: !hasFreeShipping ? Math.max(0, freeShippingMin - totalAfterDiscount) : 0
    };
  }, [cartItems, user]);

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
        {/* Área scrolleable: productos + información de descuentos */}
        <div className="cart-modal__scrollable-content">
          <div className="cart-modal__items-list">
            {cartItems.length === 0 ? (
              <div className="cart-modal__empty">Tu carrito está vacío.</div>
            ) : (
              cartItems.map((item) => (
                <CartItemCard key={item.id} {...item} />
              ))
            )}
          </div>
          
          {/* Mensaje sobre productos con rebaja */}
          {hasProductsWithDiscount && (
            <div className="cart-modal__discount-warning">
              <span className="cart-modal__discount-warning-icon">ℹ️</span>
              <span className="cart-modal__discount-warning-text">
                Recuerda que en productos con rebaja no se aplica el descuento del 30%+10% adicional
              </span>
            </div>
          )}
          
          {/* Sección de beneficios */}
          {cartItems.length > 0 && (
            <div className="cart-modal__benefits">
              <div className="cart-modal__benefits-title">Beneficios disponibles</div>
              
              {/* Descuento del 30% */}
              {benefits.discount30 ? (
                <div className="cart-modal__benefit-item cart-modal__benefit-item--active">
                  <span className="cart-modal__benefit-icon">✓</span>
                  <span className="cart-modal__benefit-text">
                    <strong>30% de descuento</strong> aplicado en compras mayores a $7,000
                  </span>
                </div>
              ) : (
                <div className="cart-modal__benefit-item">
                  <span className="cart-modal__benefit-icon">🎁</span>
                  <span className="cart-modal__benefit-text">
                    Obtén <strong>30% de descuento</strong> en compras mayores a $7,000
                    {benefits.remainingForDiscount30 > 0 && (
                      <span className="cart-modal__benefit-remaining">
                        {' '}(Te faltan ${benefits.remainingForDiscount30.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Descuento adicional del 10% */}
              {benefits.discount40 ? (
                <div className="cart-modal__benefit-item cart-modal__benefit-item--active">
                  <span className="cart-modal__benefit-icon">✓</span>
                  <span className="cart-modal__benefit-text">
                    <strong>10% adicional</strong> aplicado en compras mayores a $15,000
                  </span>
                </div>
              ) : (
                benefits.discount30 && (
                  <div className="cart-modal__benefit-item">
                    <span className="cart-modal__benefit-icon">🎉</span>
                    <span className="cart-modal__benefit-text">
                      Obtén <strong>10% adicional</strong> en compras mayores a $15,000
                      {benefits.remainingForDiscount40 > 0 && (
                        <span className="cart-modal__benefit-remaining">
                          {' '}(Te faltan ${benefits.remainingForDiscount40.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                        </span>
                      )}
                    </span>
                  </div>
                )
              )}

              {/* Envío gratis */}
              {benefits.freeShipping ? (
                <div className="cart-modal__benefit-item cart-modal__benefit-item--active">
                  <span className="cart-modal__benefit-icon">✓</span>
                  <span className="cart-modal__benefit-text">
                    <strong>Envío gratis</strong> aplicado
                  </span>
                </div>
              ) : (
                <div className="cart-modal__benefit-item">
                  <span className="cart-modal__benefit-icon">🚚</span>
                  <span className="cart-modal__benefit-text">
                    Obtén <strong>envío gratis</strong> en compras mayores a ${(user?.free_shipping_min_amount || 3000).toLocaleString('es-MX')}
                    {benefits.remainingForFreeShipping > 0 && (
                      <span className="cart-modal__benefit-remaining">
                        {' '}(Te faltan ${benefits.remainingForFreeShipping.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer fijo: Total y botones */}
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
              className="cart-modal__action-btn cherry-button--red"
            >
              Ver detalle del carrito
            </CustomButton>
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