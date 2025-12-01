import PropTypes from 'prop-types';
import useIsDesktop from '../../hooks/useIsDesktop';
import MobileView from './MobileView';
import DesktopView from './DesktopView';
import './CartDetailsProductCard.css';

const CartDetailsProductCard = (props) => {
  const isDesktop = useIsDesktop();
  return isDesktop ? <DesktopView {...props} /> : <MobileView {...props} />;
};

CartDetailsProductCard.propTypes = {
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

export default CartDetailsProductCard; 
