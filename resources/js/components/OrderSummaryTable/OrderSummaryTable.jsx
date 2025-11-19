import PropTypes from 'prop-types';
import './OrderSummaryTable.css';

const formatNumber = (value) => {
  if (value === null || value === undefined) return '0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? '0.00' : num.toFixed(2);
};

const OrderSummaryTable = ({ quantity, priceWithoutDiscount, priceWithDiscount, discount, savings }) => {
  
  
  return (
    <div className="order-summary-table">
      <div className="order-summary-header">Resumen del pedido</div>
      <div className="order-summary-row">
        <span className="order-summary-label">Cantidad de piezas:</span>
        <span className="order-summary-value">{quantity}</span>
      </div>
    
    {/* Mostrar descuento si existe */}
    {discount && priceWithoutDiscount && (
      <>
        <div className="order-summary-row">
          <span className="order-summary-label">Precio original:</span>
          <span className="order-summary-value">${formatNumber(priceWithoutDiscount)}</span>
        </div>
        <div className="order-summary-row order-summary-discount">
          <span className="order-summary-label">🏷️ Descuento ({discount}%):</span>
          <span className="order-summary-value order-summary-savings">-${formatNumber(savings)}</span>
        </div>
      </>
    )}
    
    <div className="order-summary-row order-summary-total">
      <span className="order-summary-label">Total:</span>
      <span className="order-summary-value">${formatNumber(priceWithDiscount)}</span>
    </div>
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
