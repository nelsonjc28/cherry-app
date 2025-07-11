import { useState } from 'react';
import PropTypes from 'prop-types';
import './FavoriteButton.css';

const FavoriteButton = ({ 
  productId, 
  initialState = false, 
  onToggle,
  size = 'medium',
  className = '',
  ...props 
}) => {
  // State to track if product is favorited
  const [isFavorited, setIsFavorited] = useState(initialState);

  // Handle favorite toggle
  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newState = !isFavorited;
    setIsFavorited(newState);
    
    // Call the callback function if provided
    if (onToggle) {
      onToggle(productId, newState);
    }
  };

  // CSS classes for the button
  const buttonClasses = [
    'favorite-button',
    `favorite-button--${size}`,
    isFavorited && 'favorite-button--active',
    className
  ].filter(Boolean).join(' ');

  return (
    <button 
      type="button"
      className={buttonClasses}
      onClick={handleToggle}
      aria-label={isFavorited ? "Quitar de favoritos" : "Añadir a favoritos"}
      {...props}
    >
      {/* Heart icon - filled when favorited, outline when not */}
      {isFavorited ? (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="white" 
          stroke="white" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      ) : (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="white" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      )}
    </button>
  );
};

// PropTypes for type checking
FavoriteButton.propTypes = {
  // Product identifier
  productId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  
  // Initial favorite state
  initialState: PropTypes.bool,
  
  // Callback function when favorite state changes
  onToggle: PropTypes.func,
  
  // Size variant
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  
  // Additional CSS classes
  className: PropTypes.string
};

export default FavoriteButton; 