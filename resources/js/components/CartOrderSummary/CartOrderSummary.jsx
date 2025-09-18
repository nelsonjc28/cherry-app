import PropTypes from 'prop-types';
import './CartOrderSummary.css';
import { getIconPath } from '../../utils/assetPaths';
import CustomButton from '../CustomButton';

const CartOrderSummary = ({
  responsable,
  creditDays,
  discount1,
  discount2,
  pieces,
  subtotal,
  discountTotal,
  total,
  selectedAddress,
  onGenerateOrder,
  onClearCart
}) => (
  <aside className="cart-order-summary">
    <div className="cart-order-summary__section">
      <div className="cart-order-summary__section-title">Responsable</div>
      <div className="cart-order-summary__section-content">
        <div className="cart-order-summary__responsable-name">{responsable}</div>
        <div className="cart-order-summary__row">
          <span>Plazo crédito</span>
          <span>{creditDays} días</span>
        </div>
        <div className="cart-order-summary__row">
          <span>Descuento 1</span>
          <span>{discount1}%</span>
        </div>
        <div className="cart-order-summary__row">
          <span>Descuento 2</span>
          <span>{discount2}%</span>
        </div>
      </div>
    </div>
    <div className="cart-order-summary__divider" />
    {selectedAddress && (
      <>
        <div className="cart-order-summary__section">
          <div className="cart-order-summary__section-title">Dirección de entrega</div>
          <div className="cart-order-summary__section-content">
            <div className="cart-order-summary__address-name">
              <strong>{selectedAddress.name}</strong>
              {selectedAddress.is_default && (
                <span className="cart-order-summary__default-badge">Predeterminada</span>
              )}
            </div>
            <div className="cart-order-summary__address-street">
              {selectedAddress.street_address}
            </div>
            <div className="cart-order-summary__address-location">
              {selectedAddress.city}
              {selectedAddress.state && `, ${selectedAddress.state}`}
              {selectedAddress.postal_code && ` CP: ${selectedAddress.postal_code}`}
              {selectedAddress.country && `, ${selectedAddress.country}`}
            </div>
            {selectedAddress.additional_info && (
              <div className="cart-order-summary__address-additional">
                <small>{selectedAddress.additional_info}</small>
              </div>
            )}
          </div>
        </div>
        <div className="cart-order-summary__divider" />
      </>
    )}
    <div className="cart-order-summary__section">
      <div className="cart-order-summary__section-title">Monto del pedido</div>
      <div className="cart-order-summary__section-content">
        <div className="cart-order-summary__row">
          <span>Cantidad de piezas</span>
          <span>{pieces}</span>
        </div>
        <div className="cart-order-summary__row">
          <span>Sub-Total</span>
          <span>${subtotal}</span>
        </div>
        <div className="cart-order-summary__row">
          <span>Descuento:</span>
          <span>${discountTotal}</span>
        </div>
      </div>
      <div className="cart-order-summary__total-row">
        <span>Total:</span>
        <span className="cart-order-summary__total-value">${total}</span>
      </div>
    </div>
    <div className="cart-order-summary__divider" />
    <div className="cart-order-summary__actions">
      <CustomButton
        variant="outlined"
        size="small"
        onClick={onGenerateOrder}
        iconLeft={<img className="cart-order-summary__generate-icon" src={getIconPath('Handshake.svg')} alt="Handshake" />}
        className="cart-order-summary__summary-btn"
      >
        Generar pedido
      </CustomButton>
      <CustomButton
        variant="outlined"
        size="small"
        onClick={onClearCart}
        className="cart-order-summary__summary-btn cart-order-summary__empty-btn"
      >
        Vaciar carrito
      </CustomButton>
    </div>
  </aside>
);

CartOrderSummary.propTypes = {
  creditDays: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  discount1: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  discount2: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  discountTotal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onClearCart: PropTypes.func.isRequired,
  onGenerateOrder: PropTypes.func.isRequired,
  pieces: PropTypes.number.isRequired,
  responsable: PropTypes.string.isRequired,
  selectedAddress: PropTypes.object,
  subtotal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  total: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

export default CartOrderSummary; 
