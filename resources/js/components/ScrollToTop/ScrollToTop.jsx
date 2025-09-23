import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';

const ScrollToTop = ({ behavior = 'smooth' }) => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll hacia arriba cada vez que cambie la ruta
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: behavior // 'smooth' para scroll suave, 'auto' para scroll instantáneo
    });
  }, [pathname, behavior]);

  return null; // Este componente no renderiza nada
};

ScrollToTop.propTypes = {
  behavior: PropTypes.oneOf(['smooth', 'auto'])
};

export default ScrollToTop;
