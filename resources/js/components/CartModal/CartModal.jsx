import PropTypes from 'prop-types';
import CartItemCard from '../CartItemCard';
import CustomButton from '../CustomButton';
import './CartModal.css';
import { getIconPath } from '../../utils/assetPaths';
import { useEffect, useMemo } from 'react';
import useUserStore from '../../store/userStore';
import {
  getVolumeDiscountMainTier,
  getVolumeDiscountExtraPercent,
  getSellerCategoryFromUser,
  hasApiVolumeMainPercent,
  canApplyMainDiscount,
} from '../../utils/sellerVolumeDiscount';

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

    const { mainRate: volMainRate } = getVolumeDiscountMainTier(user);
    const extraRate = getVolumeDiscountExtraPercent(user) / 100;
    const hasApiMain = hasApiVolumeMainPercent(user);
    const mainApplies = canApplyMainDiscount(user, eligibleTotal);
    const applySecondTier = hasApiMain || eligibleTotal >= 15000;

    let discountAmount = 0;
    if (mainApplies) {
      const discountMain = eligibleTotal * volMainRate;
      const totalAfterMain = eligibleTotal - discountMain;
      if (applySecondTier) {
        discountAmount = discountMain + totalAfterMain * extraRate;
      } else {
        discountAmount = discountMain;
      }
    }

    const totalAfterDiscount = eligibleTotal - discountAmount;
    const freeShippingMin = user?.free_shipping_min_amount || 3000;
    const hasFreeShipping = user?.free_shipping 
      ? totalAfterDiscount >= (user.free_shipping_min_amount || 3000)
      : totalAfterDiscount >= 3000;

    return {
      discount30: mainApplies,
      discount40: mainApplies && applySecondTier,
      freeShipping: hasFreeShipping,
      eligibleTotal,
      remainingForDiscount30: !mainApplies && eligibleTotal < 7000 ? Math.max(0, 7000 - eligibleTotal) : 0,
      remainingForDiscount40: hasApiMain ? 0 : (mainApplies && eligibleTotal < 15000 ? 15000 - eligibleTotal : 0),
      remainingForFreeShipping: !hasFreeShipping ? Math.max(0, freeShippingMin - totalAfterDiscount) : 0
    };
  }, [cartItems, user]);

  const isDiamanteUser = getSellerCategoryFromUser(user) === 'diamante';
  const { mainPercent: modalVolMainPercent } = getVolumeDiscountMainTier(user);

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
        {/* Área scrolleable: información de descuentos + productos */}
        <div className="cart-modal__scrollable-content">
          {/* Mensaje sobre productos con rebaja */}
          {hasProductsWithDiscount && (
            <div className="cart-modal__discount-warning">
              <span className="cart-modal__discount-warning-icon">ℹ️</span>
              <span className="cart-modal__discount-warning-text">
                {`Recuerda que en productos con rebaja no se aplica el descuento por volumen (${modalVolMainPercent}% + 10% adicional cuando aplica)`}
              </span>
            </div>
          )}
          
          {/* Sección de beneficios */}
          {cartItems.length > 0 && (
            <div className="cart-modal__benefits">
              <div className="cart-modal__benefits-title">Beneficios disponibles</div>
              
              {/* Descuento por volumen (30% oro / 33% diamante) */}
              {benefits.discount30 ? (
                <div className="cart-modal__benefit-item cart-modal__benefit-item--active">
                  <span className="cart-modal__benefit-icon">✓</span>
                  <span className="cart-modal__benefit-text">
                    {isDiamanteUser ? (
                      <>
                        <strong>Descuento por volumen</strong> aplicado en compras mayores a $7,000
                      </>
                    ) : (
                      <>
                        <strong>{modalVolMainPercent}% de descuento</strong> aplicado en compras mayores a $7,000
                      </>
                    )}
                  </span>
                </div>
              ) : (
                <div className="cart-modal__benefit-item">
                  <span className="cart-modal__benefit-icon">🎁</span>
                  <span className="cart-modal__benefit-text">
                    {isDiamanteUser ? (
                      <>Activa tu <strong>descuento por volumen</strong> en compras mayores a $7,000</>
                    ) : (
                      <>Obtén <strong>{modalVolMainPercent}% de descuento</strong> en compras mayores a $7,000</>
                    )}
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
          
          <div className="cart-modal__items-list">
            {cartItems.length === 0 ? (
              <div className="cart-modal__empty">Tu carrito está vacío.</div>
            ) : (
              cartItems.map((item) => (
                <CartItemCard key={item.id} {...item} />
              ))
            )}
          </div>
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