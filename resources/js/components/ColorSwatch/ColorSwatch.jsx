import React from 'react';
import './ColorSwatch.css';

const ColorSwatch = ({ 
  colorName, 
  hexColor, 
  isSelected = false, 
  onClick, 
  size = 'medium',
  showHex = true,
  showName = true,
  className = ''
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(colorName);
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'color-swatch--small';
      case 'large': return 'color-swatch--large';
      default: return 'color-swatch--medium';
    }
  };

  const getSelectedClass = () => {
    return isSelected ? 'color-swatch--selected' : '';
  };

  return (
    <div 
      className={`color-swatch ${getSizeClass()} ${getSelectedClass()} ${className}`}
      onClick={handleClick}
      title={`${colorName}${hexColor ? ` (${hexColor})` : ''}`}
    >
      <div 
        className="color-swatch__color"
        style={{ 
          backgroundColor: hexColor || '#ccc',
          border: hexColor ? 'none' : '2px dashed #999'
        }}
      >
        {!hexColor && (
          <span className="color-swatch__placeholder">?</span>
        )}
      </div>
      
      {showName && (
        <span className="color-swatch__name">{colorName}</span>
      )}
      
      {showHex && hexColor && (
        <span className="color-swatch__hex">{hexColor}</span>
      )}
    </div>
  );
};

export default ColorSwatch;
