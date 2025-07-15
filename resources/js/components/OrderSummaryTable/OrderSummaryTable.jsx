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
      <span className="order-summary-label">Total sin descuento:</span>
      <span className="order-summary-value order-summary-value--strike">${priceWithoutDiscount}</span>
    </div>
    <div className="order-summary-row">
      <span className="order-summary-label">Total con descuento:</span>
      <span className="order-summary-value">${priceWithDiscount}</span>
    </div>
  </div>
);

OrderSummaryTable.propTypes = {
  quantity: PropTypes.number.isRequired,
  priceWithoutDiscount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  priceWithDiscount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

export default OrderSummaryTable; 