import PropTypes from 'prop-types';
import './OrderSummaryTable.css';

const formatNumber = (value) => {
  if (value === null || value === undefined) return '0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const OrderSummaryTable = ({ quantity, priceWithoutDiscount, priceWithDiscount, discount, savings }) => {
  return (
    <div className="order-summary-table order-summary-table--inline">
      <span className="order-summary-label">Total del producto:</span>
      <span className="order-summary-value order-summary-total-value">${formatNumber(priceWithDiscount)}</span>
    </div>
  );
};

OrderSummaryTable.propTypes = {
  quantity: PropTypes.number.isRequired,
  priceWithDiscount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  priceWithoutDiscount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  discount: PropTypes.number,
  savings: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default OrderSummaryTable; 
