import PropTypes from 'prop-types';
import './CartItemCard.css';
import OrderSummaryTable from '../OrderSummaryTable/OrderSummaryTable';

const CartItemCard = ({
  image,
  sku,
  title,
  quantity,
  priceWithDiscount,
  originalPrice,
  discount,
  savings,
  variants = []
}) => {
  return (
    <div className="cart-item-card">
      <div className="cart-item-card__main-grid">
        {/* Image - Solo mostrar si existe y no es el placeholder */}
        {image && 
         image !== '/images/catalogProductImages/Rectangle 4922.png' && 
         image !== '/images/placeholder.jpg' && (
        <div className="cart-item-card__image-col">
            <img 
              src={image} 
              alt={title} 
              className="cart-item-card__image" 
              loading="lazy"
              onError={(e) => {
                e.target.parentElement.style.display = 'none';
              }}
            />
        </div>
        )}
        {/* Main Info */}
        <div className="cart-item-card__info-col">
          <div className="cart-item-card__info-row">
            <span className="cart-item-card__sku">{sku}</span>
          </div>
          <div className="cart-item-card__title-row">
            <span className="cart-item-card__title">{title}</span>
            {variants && variants.length > 0 && (
              <div className="cart-item-card__variants">
                <div className="cart-item-card__content-variants">
                  <div className="cart-item-card__variants-header">Variantes:</div>
                  <div className="cart-item-card__variants-list">
                    {variants.map((variant, index) => (
                      <span key={index} className="cart-item-card__variant">
                        <span className="cart-item-card__variant-color">{variant.color}</span>
                        <span className="cart-item-card__variant-size">{variant.size}</span>
                        <span className="cart-item-card__variant-qty">×{variant.quantity}</span>
                        {variant.freeItemsCount && variant.freeItemsCount > 0 && (
                          <span className="cart-item-card__free-items">
                            🎁 {variant.freeItemsCount} gratis
                          </span>
                        )}
                        {variant.isFreeItem && (
                          <span className="cart-item-card__free-item">
                            🎁 Gratis
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Resume Table */}
        <div className="cart-item-card__order-summary-wrapper">
          <OrderSummaryTable
            quantity={quantity}
            priceWithDiscount={priceWithDiscount}
            priceWithoutDiscount={originalPrice}
            discount={discount}
            savings={savings}
          />
        </div>
      </div>
    </div>
  );
};

CartItemCard.propTypes = {
  image: PropTypes.string.isRequired,
  sku: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  quantity: PropTypes.number.isRequired,
  priceWithDiscount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  originalPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  discount: PropTypes.number,
  savings: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  variants: PropTypes.arrayOf(PropTypes.shape({
    size: PropTypes.string.isRequired,
    quantity: PropTypes.number.isRequired,
    price: PropTypes.number.isRequired
  }))
};

export default CartItemCard; 
