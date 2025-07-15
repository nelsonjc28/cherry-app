import PropTypes from 'prop-types';
import './CartItemCard.css';
import OrderSummaryTable from '../OrderSummaryTable/OrderSummaryTable';

const CartItemCard = ({
  image,
  sku,
  title,
  isDiscount,
  quantity,
  priceWithoutDiscount,
  priceWithDiscount
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
            {isDiscount && (
              <span className="cart-item-card__discount-badge">Descuento cliente</span>
            )}
          </div>
          <div className="cart-item-card__title-row">
            <span className="cart-item-card__title">{title}</span>
          </div>
        </div>
        {/* Resume Table */}
        <div className="cart-item-card__order-summary-wrapper">
          <OrderSummaryTable
            quantity={quantity}
            priceWithoutDiscount={priceWithoutDiscount}
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
  isDiscount: PropTypes.bool,
  quantity: PropTypes.number.isRequired,
  priceWithoutDiscount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  priceWithDiscount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

export default CartItemCard; 