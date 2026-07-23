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
  isBronzeSeller,
  canApplyMainDiscount,
  bronzeMainDiscountPiecesThreshold,
  shouldApplyBronzeSecondTier,
  hasCompletedFirstPurchase,
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

    // Piezas elegibles (sin desc_promo y sin userOffer) — para bronce
    const eligiblePieces = eligibleItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

    const isBronze = isBronzeSeller(user);
    const { mainRate: volMainRate } = getVolumeDiscountMainTier(user);
    const extraRate = getVolumeDiscountExtraPercent(user, eligiblePieces) / 100;
    const hasApiMain = hasApiVolumeMainPercent(user);

    const mainApplies = canApplyMainDiscount(user, eligibleTotal, eligiblePieces);
    // 10% adicional:
    //  - Bronce: a partir de 12 piezas sin rebaja (cálculo intacto).
    //  - Oro/Diamante: API trae descuento2 → siempre; si no, ≥ $15,000 elegibles.
    const secondTierApplies = isBronze
      ? shouldApplyBronzeSecondTier(user, eligiblePieces)
      : (hasApiMain || eligibleTotal >= 15000);

    let discountAmount = 0;
    if (mainApplies) {
      const discountMain = eligibleTotal * volMainRate;
      const totalAfterMain = eligibleTotal - discountMain;
      if (secondTierApplies) {
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

    // Cálculo de "remaining" según categoría del vendedor.
    let remainingForDiscount30 = 0;
    let remainingForDiscount40 = 0;
    if (isBronze) {
      const mainThreshold = bronzeMainDiscountPiecesThreshold(user); // 12 (1ª) / 1 (repetida)
      remainingForDiscount30 = !mainApplies
        ? Math.max(0, mainThreshold - eligiblePieces)
        : 0;
      remainingForDiscount40 = (mainApplies && !secondTierApplies)
        ? Math.max(0, 12 - eligiblePieces)
        : 0;
    } else {
      remainingForDiscount30 = (!mainApplies && eligibleTotal < 7000)
        ? Math.max(0, 7000 - eligibleTotal)
        : 0;
      remainingForDiscount40 = hasApiMain
        ? 0
        : (mainApplies && eligibleTotal < 15000
          ? 15000 - eligibleTotal
          : 0);
    }

    return {
      discount30: mainApplies,
      discount40: mainApplies && secondTierApplies,
      freeShipping: hasFreeShipping,
      isBronze,
      eligibleTotal,
      eligiblePieces,
      hasCompletedFirst: hasCompletedFirstPurchase(user),
      remainingForDiscount30,
      remainingForDiscount40,
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
              
              {/* Descuento por volumen (bronce por piezas / oro-diamante por monto) */}
              {benefits.discount30 ? (
                <div className="cart-modal__benefit-item cart-modal__benefit-item--active">
                  <span className="cart-modal__benefit-icon">✓</span>
                  <span className="cart-modal__benefit-text">
                    {benefits.isBronze ? (
                      <>Tienes <strong>30% de descuento</strong> en tus productos elegibles</>
                    ) : isDiamanteUser ? (
                      <><strong>Descuento por volumen</strong> aplicado en compras mayores a $7,000</>
                    ) : (
                      <><strong>{modalVolMainPercent}% de descuento</strong> aplicado en compras mayores a $7,000</>
                    )}
                  </span>
                </div>
              ) : (
                <div className="cart-modal__benefit-item">
                  <span className="cart-modal__benefit-icon">🎁</span>
                  <span className="cart-modal__benefit-text">
                    {benefits.isBronze ? (
                      benefits.eligiblePieces > 0
                        ? <>Te faltan <strong>{benefits.remainingForDiscount30}</strong> pieza{benefits.remainingForDiscount30 > 1 ? 's' : ''} para tu <strong>30% de descuento</strong></>
                        : <>Agrega <strong>{bronzeMainDiscountPiecesThreshold(user)}</strong> pieza{bronzeMainDiscountPiecesThreshold(user) > 1 ? 's' : ''}{benefits.hasCompletedFirst ? '' : ' en tu primera compra'} para tu <strong>30% de descuento</strong></>
                    ) : isDiamanteUser ? (
                      <>Activa tu <strong>descuento por volumen</strong> en compras mayores a $7,000</>
                    ) : (
                      <>Obtén <strong>{modalVolMainPercent}% de descuento</strong> en compras mayores a $7,000</>
                    )}
                    {!benefits.isBronze && benefits.remainingForDiscount30 > 0 && (
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
                    {benefits.isBronze ? (
                      <><strong>30% + 10% adicional</strong> aplicados por tus 12 piezas</>
                    ) : (
                      <><strong>10% adicional</strong> aplicado en compras mayores a $15,000</>
                    )}
                  </span>
                </div>
              ) : (
                benefits.discount30 && (
                  <div className="cart-modal__benefit-item">
                    <span className="cart-modal__benefit-icon">🎉</span>
                    <span className="cart-modal__benefit-text">
                      {benefits.isBronze ? (
                        <>Obtén <strong>10% adicional</strong> con {benefits.remainingForDiscount40} pieza{benefits.remainingForDiscount40 > 1 ? 's' : ''} más (12 en total)</>
                      ) : (
                        <>Obtén <strong>10% adicional</strong> en compras mayores a $15,000</>
                      )}
                      {!benefits.isBronze && benefits.remainingForDiscount40 > 0 && (
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