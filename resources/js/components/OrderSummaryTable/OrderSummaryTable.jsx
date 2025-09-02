import PropTypes from 'prop-types';
import './OrderSummaryTable.css';

const OrderSummaryTable = ({ quantity, priceWithoutDiscount, priceWithDiscount }) => (
  <div className="order-summary-table">
    <div className="order-summary-header">Resumen del pedido</div>
    <div className="order-summary-row">
      <span className="order-summary-label">Cantidad de piezas:</span>
      <span className="order-summary-value">{quantity}</span>
    </div>
    <div className="order-summary-row">
      <span className="order-summary-label">Total:</span>
      <span className="order-summary-value">{priceWithDiscount}</span>
    </div>
  </div>
);

OrderSummaryTable.propTypes = {
  quantity: PropTypes.number.isRequired,
  priceWithDiscount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

export default OrderSummaryTable; 