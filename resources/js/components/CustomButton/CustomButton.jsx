import React from 'react';
import PropTypes from 'prop-types';
import './CustomButton.css';

const CustomButton = ({
  children,
  iconLeft,
  iconRight,
  onClick,
  type = 'button',
  className = '',
  style = {},
  variant = 'outlined', // outlined, filled, text, etc.
  size = 'medium', // small, medium, large
  disabled = false,
  ...props
}) => {
  return (
    <button
      type={type}
      className={`custom-btn custom-btn--${variant} custom-btn--${size} ${className}`.trim()}
      onClick={onClick}
      style={style}
      disabled={disabled}
      {...props}
    >
      {iconLeft && <span className="custom-btn__icon custom-btn__icon--left">{iconLeft}</span>}
      <span className="custom-btn__content">{children}</span>
      {iconRight && <span className="custom-btn__icon custom-btn__icon--right">{iconRight}</span>}
    </button>
  );
};

CustomButton.propTypes = {
  children: PropTypes.node.isRequired,
  iconLeft: PropTypes.node,
  iconRight: PropTypes.node,
  onClick: PropTypes.func,
  type: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
  variant: PropTypes.oneOf(['outlined', 'filled', 'text']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  disabled: PropTypes.bool,
};

export default CustomButton; 