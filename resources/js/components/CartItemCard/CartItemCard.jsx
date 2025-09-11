import PropTypes from 'prop-types';
import './CartItemCard.css';
import OrderSummaryTable from '../OrderSummaryTable/OrderSummaryTable';

const CartItemCard = ({
  image,
  sku,
  title,
  quantity,
  priceWithDiscount,
  variants = []
}) => {
  return (
    <div className="cart-item-card">
      <div className="cart-item-card__main-grid">
        {/* Image */}
        <div className="cart-item-card__image-col">
          <img src={image} alt={title} className="cart-item-card__image" />
        </div>
        {/* Main Info */}
        <div className="cart-item-card__info-col">
          <div className="cart-item-card__info-row">
            <span className="cart-item-card__sku">{sku}</span>
          </div>
          <div className="cart-item-card__title-row">
            <span className="cart-item-card__title">{title}</span>
            {variants && variants.length > 0 && (
              <div className="cart-item-card__variants">
                <div className="cart-item-card__variants-header">Variantes:</div>
                <div className="cart-item-card__variants-list">
                  {variants.map((variant, index) => (
                    <span key={index} className="cart-item-card__variant">
                      <span className="cart-item-card__variant-color">{variant.color}</span>
                      <span className="cart-item-card__variant-size">{variant.size}</span>
                      <span className="cart-item-card__variant-qty">×{variant.quantity}</span>
                    </span>
                  ))}
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
  variants: PropTypes.arrayOf(PropTypes.shape({
    size: PropTypes.string.isRequired,
    quantity: PropTypes.number.isRequired,
    price: PropTypes.number.isRequired
  }))
};

export default CartItemCard; 
