import React from 'react';
import './Spinner.css';

const Spinner = ({ size = 'medium', color = 'primary', className = '' }) => {
  const sizeClass = `spinner--${size}`;
  const colorClass = `spinner--${color}`;
  
  return (
    <div className={`spinner ${sizeClass} ${colorClass} ${className}`}>
      <div className="spinner__circle"></div>
    </div>
  );
};

export default Spinner; 