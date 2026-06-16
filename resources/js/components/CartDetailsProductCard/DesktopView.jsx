import PropTypes from 'prop-types';
import OrderSummaryTable from '../OrderSummaryTable/OrderSummaryTable';
import './CartDetailsProductCard.css';
import { Link } from 'react-router-dom';


function DesktopView({
  image,
  sku,
  title,
  isDiscount,
  discountLabel,
  price,
  originalPrice,
  hasDiscount,
  discountPercentage,
  variants,
  summary,
  onRemove,
  onQuantityChange
}) {
  return (
      <div className={`cart-details-product-card${isDiscount ? '' : ' no-discount'}`}>
      <div className="cart-details-product-card__desktop-row">
        {image && 
         image !== '/images/catalogProductImages/Rectangle 4922.png' && 
         image !== '/images/placeholder.jpg' && (
          <div className="cart-details-product-card__image-block">
            <img 
              src={image} 
              alt={title} 
              className="cart-details-product-card__image" 
              loading="lazy"
              onError={(e) => {
                e.target.parentElement.style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="cart-details-product-card__desktop-content">
          <div className="cart-details-product-card__header-row">
            <div className="cart-details-product-card__sku-price-row">
              <span className="cart-details-product-card__sku">{sku}</span>
              <div className="cart-details-product-card__discount-prices">
                {hasDiscount && originalPrice ? (
                  <>
                    <span className="cart-details-product-card__original-price">${originalPrice}</span>
                    <span className="cart-details-product-card__discounted-price">${price}</span>
                    {discountPercentage > 0 && (
                      <span className="cart-details-product-card__discount-percent">-{Math.round(discountPercentage)}%</span>
                    )}
                  </>
                ) : (
                  <span className="cart-details-product-card__regular-price">${price}</span>
                )}
              </div>
            </div>
            <span className={`cart-details-product-card__discount-badge${isDiscount ? '' : ' no-discount'}`}>{discountLabel}</span>
          </div>
          <div className="cart-details-product-card__title">
            <Link to={`/producto/${sku}`} className="catalog-product-title-link">
              {title}
            </Link></div>
          <div className="cart-details-product-card__price-block">
            <div className="cart-details-product-card__unit-price-label">Precio unidad</div>
            <div className="cart-details-product-card__unit-price-value">${(price ? parseFloat(price).toFixed(2) : '0.00')}</div>
          </div>
          <div className="cart-details-product-card__variants-summary-row">
            <div className="cart-details-product-card__variants-table-wrapper">
              <table className="cart-details-product-card__variants-table">
                <thead>
                  <tr>
                    <th>Color</th>
                    <th>Talla</th>
                    <th>Cantidad</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant, idx) => (
                    <tr key={`${variant.size}-${variant.isFreeItem ? 'free' : 'paid'}-${idx}`}>
                      <td>{variant.color}</td>
                      <td>
                        {variant.size}
                        {variant.isFreeItem && (
                          <span className="cart-details-product-card__free-badge"> 🎁 Gratis</span>
                        )}
                      </td>
                      <td className="cart-details-product-card__quantity-cell">
                        <div className="cart-details-product-card__quantity-controls">
                          <button
                            onClick={() => onQuantityChange(idx, variant.quantity - 1)}
                            disabled={variant.quantity <= 1}
                            className="cart-details-product-card__qty-btn cart-details-product-card__btn-minus"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          </button>
                          <span className="cart-details-product-card__quantity-value">{variant.quantity}</span>
                          <button
                            onClick={() => onQuantityChange(idx, variant.quantity + 1)}
                            className="cart-details-product-card__qty-btn cart-details-product-card__btn-plus"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td>
                        <button onClick={() => onRemove(idx)} className="cart-details-product-card__remove-btn" aria-label="Eliminar variante">
                          <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8.875 13.0001H9.625C9.8125 13.0001 10 12.8439 10 12.6251V5.87512C10 5.68762 9.8125 5.50012 9.625 5.50012H8.875C8.65625 5.50012 8.5 5.68762 8.5 5.87512V12.6251C8.5 12.8439 8.65625 13.0001 8.875 13.0001ZM14 2.50012H11.4062L10.3438 0.750122C10.0938 0.312622 9.59375 0.00012207 9.0625 0.00012207H5.90625C5.375 0.00012207 4.875 0.312622 4.625 0.750122L3.5625 2.50012H1C0.71875 2.50012 0.5 2.75012 0.5 3.00012V3.50012C0.5 3.78137 0.71875 4.00012 1 4.00012H1.5V14.5001C1.5 15.3439 2.15625 16.0001 3 16.0001H12C12.8125 16.0001 13.5 15.3439 13.5 14.5001V4.00012H14C14.25 4.00012 14.5 3.78137 14.5 3.50012V3.00012C14.5 2.75012 14.25 2.50012 14 2.50012ZM5.84375 1.59387C5.875 1.56262 5.9375 1.50012 6 1.50012C6 1.50012 6 1.50012 6.03125 1.50012H8.96875C9.03125 1.50012 9.09375 1.56262 9.125 1.59387L9.65625 2.50012H5.3125L5.84375 1.59387ZM12 14.5001H3V4.00012H12V14.5001ZM5.375 13.0001H6.125C6.3125 13.0001 6.5 12.8439 6.5 12.6251V5.87512C6.5 5.68762 6.3125 5.50012 6.125 5.50012H5.375C5.15625 5.50012 5 5.68762 5 5.87512V12.6251C5 12.8439 5.15625 13.0001 5.375 13.0001Z" fill="#EA2630" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="cart-details-product-card__order-table">
              <OrderSummaryTable
                quantity={summary.quantity}
                priceWithoutDiscount={summary.priceWithoutDiscount}
                priceWithDiscount={summary.priceWithDiscount}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

DesktopView.propTypes = {
  image: PropTypes.string.isRequired,
  sku: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  isDiscount: PropTypes.bool,
  discountLabel: PropTypes.string,
  price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  originalPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  hasDiscount: PropTypes.bool,
  discountPercentage: PropTypes.number,
  variants: PropTypes.arrayOf(PropTypes.shape({
    color: PropTypes.string,
    size: PropTypes.string,
    quantity: PropTypes.number
  })).isRequired,
  summary: PropTypes.object.isRequired,
  onRemove: PropTypes.func.isRequired,
  onQuantityChange: PropTypes.func.isRequired
};

export default DesktopView; 
