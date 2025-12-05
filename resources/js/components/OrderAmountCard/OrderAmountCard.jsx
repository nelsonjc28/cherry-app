import React from 'react';
import PropTypes from 'prop-types';

const formatMoney = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value || 0);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const OrderAmountCard = ({
  pieces = 0,
  subtotal = 0,
  discount = 0,
  discountThirtyAmount = 0,
  discountAdditionalTenAmount = 0,
  shipping = 0,
  isFreeShipping = false,
  total = 0,
  deliveryType = 'envio' // 'envio' or 'retiro'
}) => {
  // Convertir a número para asegurar comparación correcta
  const discount30 = Number(discountThirtyAmount) || 0;
  const discount10 = Number(discountAdditionalTenAmount) || 0;
  const has30Percent = discount30 > 0;
  const has40Percent = discount30 > 0 && discount10 > 0;

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
        {/* Mostrar descuentos cuando aplique el 30% o el 40% */}
        {has30Percent && (
          <>
            {has40Percent ? (
              // Descuento del 30% + 10% adicional sobre el total después del 30%
              <>
                <div className="cart-order-summary__row">
                  <span>Descuento</span>
                  <span className="cart-order-summary__free-shipping">30%</span>
                </div>
                <div className="cart-order-summary__row">
                  <span>Adicional</span>
                  <span className="cart-order-summary__free-shipping">10%</span>
                </div>
                <div className="cart-order-summary__row">
                  <span>Total descuento</span>
                  <span className="cart-order-summary__free-shipping">-${formatMoney(discount)}</span>
                </div>
              </>
            ) : (
              // Solo descuento del 30%
              <>
                <div className="cart-order-summary__row">
                  <span>Descuento</span>
                  <span className="cart-order-summary__free-shipping">30%</span>
                </div>
                <div className="cart-order-summary__row">
                  <span>Total descuento</span>
                  <span className="cart-order-summary__free-shipping">-${formatMoney(discount30)}</span>
                </div>
              </>
            )}
          </>
        )}
        {deliveryType === 'envio' && (
          <div className="cart-order-summary__row">
            <span>Envío:</span>
            {(isFreeShipping && Number(shipping) === 0) ? (
              <span className="cart-order-summary__free-shipping">Envío gratis</span>
            ) : (
              <span>${formatMoney(shipping)}</span>
            )}
          </div>
        )}
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
  deliveryType: PropTypes.string,
};

export default OrderAmountCard;


