import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import './CherryButton.css';

const CherryButton = ({ 
  children, 
  variant = 'red', 
  size = 'medium',
  icon, 
  iconPosition = 'right', 
  to, 
  onClick, 
  disabled = false,
  fullWidth = false,
  className = '',
  ...props 
}) => {
  // Base CSS classes for the button
  const baseClasses = [
    'cherry-button',
    `cherry-button--${variant}`,
    `cherry-button--${size}`,
    icon && `cherry-button--with-icon`,
    icon && `cherry-button--icon-${iconPosition}`,
    fullWidth && 'cherry-button--full-width',
    disabled && 'cherry-button--disabled',
    className
  ].filter(Boolean).join(' ');

  // Button content with icon positioning
  const renderContent = () => {
    if (!icon) {
      return <span className="cherry-button__text">{children}</span>;
    }

    if (iconPosition === 'left') {
      return (
        <>
          <span className="cherry-button__icon cherry-button__icon--left">
            {icon}
          </span>
          <span className="cherry-button__text">{children}</span>
        </>
      );
    }

    // Default: icon on the right
    return (
      <>
        <span className="cherry-button__text">{children}</span>
        <span className="cherry-button__icon cherry-button__icon--right">
          {icon}
        </span>
      </>
    );
  };

  // Common props for both button and link
  const commonProps = {
    className: baseClasses,
    disabled,
    ...props
  };

  // If 'to' prop is provided, render as Link (React Router)
  if (to && !disabled) {
    return (
      <Link to={to} {...commonProps}>
        {renderContent()}
      </Link>
    );
  }

  // Otherwise, render as button with onClick
  return (
    <button 
      type="button" 
      onClick={onClick} 
      {...commonProps}
    >
      {renderContent()}
    </button>
  );
};

// PropTypes for type checking and documentation
CherryButton.propTypes = {
  // Button content
  children: PropTypes.node.isRequired,
  
  // Visual variants
  variant: PropTypes.oneOf(['red', 'white', 'outline']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  
  // Icon configuration
  icon: PropTypes.node,
  iconPosition: PropTypes.oneOf(['left', 'right']),
  
  // Navigation and interaction
  to: PropTypes.string,
  onClick: PropTypes.func,
  
  // State and styling
  disabled: PropTypes.bool,
  fullWidth: PropTypes.bool,
  className: PropTypes.string
};

export default CherryButton; 