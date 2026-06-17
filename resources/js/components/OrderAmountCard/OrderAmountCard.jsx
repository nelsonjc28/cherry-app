import React from 'react';
import PropTypes from 'prop-types';
import './OrderAmountCard.css';

const formatMoney = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(value || 0);
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const Row = ({ label, value, valueClass = '' }) => (
  <div className="cart-order-summary__row order-amount__row">
    <span>{label}</span>
    <span className={valueClass || undefined}>{value}</span>
  </div>
);

/**
 * Desglose "tipo factura": bloque línea (volumen 30%/+10%) y bloque promo, luego totales.
 */
const OrderAmountCard = ({
  breakdown = null,
  mainPercent = 30,
  shipping = 0,
  total = 0,
  /** @type {'envio'|'retiro'} */
  deliveryType = 'envio',
  isFreeShipping: _isFreeShippingProp = false
}) => {
  const b = breakdown;
  if (!b) {
    return (
      <div className="address-selector order-amount order-amount--empty">
        <div className="cart-order-summary__section-title">Monto del pedido</div>
        <p className="order-amount__note">Cargando…</p>
      </div>
    );
  }

  const {
    linePieces = 0,
    promoPieces = 0,
    lineSubtotal = 0,
    discountVolumeMain = 0,
    discountVolumeExtra = 0,
    lineNet = 0,
    promoListSubtotal = 0,
    promoCatalogSubtotal = 0,
    promoCartSubtotal = 0,
    promoSavings = 0,
    offerDiscountLines = [],
    totalPieces = 0
  } = b;

  const hasLine = linePieces > 0;
  const hasPromo = promoPieces > 0;
  const showMainDisc = (Number(discountVolumeMain) || 0) > 0.0001;
  const showExtraDisc = (Number(discountVolumeExtra) || 0) > 0.0001;
  const showPromoSavings = (Number(promoSavings) || 0) > 0.0001;
  const offerLines = Array.isArray(offerDiscountLines) ? offerDiscountLines : [];

  const shippingIsFree = deliveryType === 'envio' && Number(shipping) === 0;
  const mainLabel = `Descuento del ${Number(mainPercent) || 30}%`;

  return (
    <div className="address-selector order-amount">
      <div className="cart-order-summary__section-title">Monto del pedido</div>
      <div className="cart-details__address-content order-amount__content">

        {hasLine && (
          <div className="order-amount__block">
            <div className="order-amount__block-label">Prendas de línea</div>
            <Row label="Prendas de Línea" value={String(linePieces)} />
            <Row label="Subtotal de Línea" value={`$${formatMoney(lineSubtotal)}`} />
            {showMainDisc && (
              <div className="cart-order-summary__row cart-order-summary__discount-line order-amount__row">
                <span>{mainLabel}</span>
                <span className="cart-order-summary__free-shipping">-${formatMoney(discountVolumeMain)}</span>
              </div>
            )}
            {showExtraDisc && (
              <div className="cart-order-summary__row cart-order-summary__discount-line order-amount__row">
                <span>Descuento del 10%</span>
                <span className="cart-order-summary__free-shipping">-${formatMoney(discountVolumeExtra)}</span>
              </div>
            )}
            <Row
              label="Importe de Línea"
              value={`$${formatMoney(lineNet)}`}
              valueClass="order-amount__importe"
            />
          </div>
        )}

        {hasLine && hasPromo && <div className="order-amount__spacer" aria-hidden />}

        {hasPromo && (
          <div className="order-amount__block">
            <div className="order-amount__block-label">Prendas de promo</div>
            <Row label="Prendas de Promo" value={String(promoPieces)} />
            <Row label="Subtotal de Promo" value={`$${formatMoney(promoListSubtotal)}`} />
            {showPromoSavings && (
              <div className="cart-order-summary__row cart-order-summary__discount-line order-amount__row">
                <span>Descuentos de Promo</span>
                <span className="cart-order-summary__free-shipping">-${formatMoney(promoSavings)}</span>
              </div>
            )}
            {offerLines.map((line) => (
              <div
                key={line.title}
                className="cart-order-summary__row cart-order-summary__discount-line order-amount__row"
              >
                <span>{line.title}</span>
                <span className="cart-order-summary__free-shipping">-${formatMoney(line.amount)}</span>
              </div>
            ))}
            <Row
              label="Importe de Promo"
              value={`$${formatMoney(promoCartSubtotal)}`}
              valueClass="order-amount__importe"
            />
          </div>
        )}

        {(hasLine || hasPromo) && <div className="order-amount__spacer" aria-hidden />}

        <div className="order-amount__block order-amount__block--total">
          <Row label="Prendas Totales" value={String(totalPieces || linePieces + promoPieces)} />
          {deliveryType === 'envio' && (
            <div className="cart-order-summary__row order-amount__row">
              <span>Envío</span>
              {shippingIsFree ? (
                <span className="cart-order-summary__free-shipping" style={{ color: '#28a745', fontWeight: 'bold' }}>Gratis</span>
              ) : (
                <span>${formatMoney(shipping)}</span>
              )}
            </div>
          )}
          <div className="cart-order-summary__total-row order-amount__gran-total" style={{ marginTop: 8 }}>
            <span>Gran total</span>
            <span className="cart-order-summary__total-value">${formatMoney(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

OrderAmountCard.propTypes = {
  breakdown: PropTypes.shape({
    linePieces: PropTypes.number,
    promoPieces: PropTypes.number,
    lineSubtotal: PropTypes.number,
    discountVolumeMain: PropTypes.number,
    discountVolumeExtra: PropTypes.number,
    lineNet: PropTypes.number,
    promoListSubtotal: PropTypes.number,
    promoCatalogSubtotal: PropTypes.number,
    promoCartSubtotal: PropTypes.number,
    promoSavings: PropTypes.number,
    offerDiscountLines: PropTypes.arrayOf(PropTypes.shape({
      title: PropTypes.string,
      amount: PropTypes.number,
    })),
    totalPieces: PropTypes.number
  }),
  mainPercent: PropTypes.number,
  shipping: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  total: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  deliveryType: PropTypes.string,
  isFreeShipping: PropTypes.bool
};

export default OrderAmountCard;
