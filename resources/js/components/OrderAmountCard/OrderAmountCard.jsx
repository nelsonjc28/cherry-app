import React from 'react';
import PropTypes from 'prop-types';

const formatMoney = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value || 0);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const OrderAmountCard = ({
  pieces = 0,
  subtotal = 0,
  subtotalBase = 0,
  /** Ahorro lista→precio en líneas sin rebaja (opcional; suele ser 0 si precio1 = price) */
  discountLineMayoreo = 0,
  discountRebaja = 0,
  /** Mercancía a precio carrito antes del descuento por volumen (30%/+10%) */
  subtotalMerchandise = 0,
  /** Descuento por volumen (PriceService / summarizeVolumeFromCartItems) */
  discountVolumeTotal = 0,
  discountVolumeMain = 0,
  discountVolumeExtra = 0,
  /** Porcentaje del primer tramo de volumen (30 oro / 33 diamante) */
  volumeMainPercent = null,
  shipping = 0,
  isFreeShipping = false,
  total = 0,
  deliveryType = 'envio' // 'envio' or 'retiro'
}) => {
  const discount30 = Number(discountVolumeMain) || 0;
  const discount10 = Number(discountVolumeExtra) || 0;
  const baseSubtotalNum = Number(subtotalBase) || 0;
  const lineMayoreoNum = Number(discountLineMayoreo) || 0;
  const rebajaDiscountNum = Number(discountRebaja) || 0;
  const merchandiseNum = Number(subtotalMerchandise) || 0;
  const volumeTotalNum = Number(discountVolumeTotal) || 0;
  const hasRebajaDiscount = Math.abs(rebajaDiscountNum) > 0.0001;
  const hasVolumeDiscount = volumeTotalNum > 0.0001;
  const has40Percent = discount30 > 0 && discount10 > 0;
  const mainPercentLabel = volumeMainPercent != null ? volumeMainPercent : 30;

  return (
    <div className="address-selector">
      <div className="cart-order-summary__section-title">Monto del pedido</div>
      <div className="cart-details__address-content">
        <div className="cart-order-summary__row">
          <span>Cantidad de piezas</span>
          <span>{pieces}</span>
        </div>
        <div className="cart-order-summary__row">
          <span>Subtotal Base</span>
          <span>${formatMoney(baseSubtotalNum)}</span>
        </div>
        {lineMayoreoNum > 0.0001 && (
          <div className="cart-order-summary__row cart-order-summary__discount-line">
            <span>Descuento precio lista / mayoreo (línea)</span>
            <span className="cart-order-summary__free-shipping">-{formatMoney(lineMayoreoNum)}</span>
          </div>
        )}
        {hasRebajaDiscount && (
          <div className="cart-order-summary__row cart-order-summary__discount-line">
            <span>Descuento por Rebaja</span>
            <span className="cart-order-summary__free-shipping">-{formatMoney(rebajaDiscountNum)}</span>
          </div>
        )}
        <div className="cart-order-summary__row">
          <span>Subtotal con rebaja</span>
          <span>${formatMoney(merchandiseNum)}</span>
        </div>
        {/* Descuento por volumen (mismo cálculo que el backend / CartOrderSummary) */}
        {hasVolumeDiscount && (
          <>
            {has40Percent ? (
              <>
                <div className="cart-order-summary__row">
                  <span>Descuento Mayoreo</span>
                  <span className="cart-order-summary__free-shipping">{mainPercentLabel}%</span>
                </div>
                <div className="cart-order-summary__row">
                  <span>Adicional</span>
                  <span className="cart-order-summary__free-shipping">10%</span>
                </div>
                <div className="cart-order-summary__row">
                  <span>Total descuento por volumen</span>
                  <span className="cart-order-summary__free-shipping">-${formatMoney(volumeTotalNum)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="cart-order-summary__row">
                  <span>Descuento Mayoreo</span>
                  <span className="cart-order-summary__free-shipping">{mainPercentLabel}%</span>
                </div>
                <div className="cart-order-summary__row">
                  <span>Total descuento por volumen</span>
                  <span className="cart-order-summary__free-shipping">-${formatMoney(volumeTotalNum)}</span>
                </div>
              </>
            )}
          </>
        )}
        {deliveryType === 'envio' && (
          <div className="cart-order-summary__row">
            <span>Envío:</span>
            {Number(shipping) === 0 ? (
              <span className="cart-order-summary__free-shipping" style={{ color: '#28a745', fontWeight: 'bold' }}>Gratis</span>
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
  subtotalBase: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  discountLineMayoreo: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  discountRebaja: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  subtotalMerchandise: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  discountVolumeTotal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  discountVolumeMain: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  discountVolumeExtra: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  volumeMainPercent: PropTypes.number,
  shipping: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isFreeShipping: PropTypes.bool,
  total: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  deliveryType: PropTypes.string,
};

export default OrderAmountCard;

