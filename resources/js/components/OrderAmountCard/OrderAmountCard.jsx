import React from 'react';
import PropTypes from 'prop-types';

const formatMoney = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value || 0);
  return num.toFixed(2);
};

const OrderAmountCard = ({
  pieces = 0,
  subtotal = 0,
  discount = 0,
  discountThirtyAmount = 0,
  discountAdditionalTenAmount = 0,
  shipping = 0,
  isFreeShipping = false,
  total = 0
}) => {
  return (
    <div className="address-selector">
      <div className="cart-order-summary__section-title">Monto del pedido</div>
      <div className="cart-details__address-content">
        <div className="cart-order-summary__row">
          <span>Cantidad de piezas</span>
          <span>{pieces}</span>
        </div>
        <div className="cart-order-summary__row">
          <span>Sub-Total</span>
          <span>${formatMoney(subtotal)}</span>
        </div>
        {discountThirtyAmount > 0 || discountAdditionalTenAmount > 0 ? (
          <>
            {discountThirtyAmount > 0 && (
              <div className="cart-order-summary__row">
                <span>Descuento (30%)</span>
                <span>-${formatMoney(discountThirtyAmount)}</span>
              </div>
            )}
            {discountAdditionalTenAmount > 0 && (
              <div className="cart-order-summary__row">
                <span>Adicional (10%)</span>
                <span>-${formatMoney(discountAdditionalTenAmount)}</span>
              </div>
            )}
            <div className="cart-order-summary__row">
              <span>Total descuento</span>
              <span>-${formatMoney(discount)}</span>
            </div>
          </>
        ) : (
          <div className="cart-order-summary__row">
            <span>Descuento:</span>
            <span>${formatMoney(discount)}</span>
          </div>
        )}
        <div className="cart-order-summary__row">
          <span>Envio:</span>
          <span>{(isFreeShipping && Number(shipping) === 0) ? 'Envío gratis' : `$${formatMoney(shipping)}`}</span>
        </div>
        <div className="cart-order-summary__total-row" style={{ marginTop: 8 }}>
          <span>Total:</span>
          <span className="cart-order-summary__total-value">${formatMoney(total)}</span>
        </div>
      </div>
    </div>
  );
};

OrderAmountCard.propTypes = {
  pieces: PropTypes.number,
  subtotal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  discount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  discountThirtyAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  discountAdditionalTenAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  shipping: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isFreeShipping: PropTypes.bool,
  total: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default OrderAmountCard;


