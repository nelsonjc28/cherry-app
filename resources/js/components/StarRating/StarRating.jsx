import React, { useState, useEffect } from 'react';
import './StarRating.css';

const StarRating = ({ 
  rating = 0, 
  maxRating = 5, 
  size = 'medium', 
  readonly = false, 
  readOnly = false, // Alternative prop name for compatibility
  showAverage = false,
  averageRating = 0,
  totalRatings = 0,
  onRatingChange = null,
  showText = false
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [currentRating, setCurrentRating] = useState(rating);
  
  // Use either readonly or readOnly prop
  const isReadonly = readonly || readOnly;

  useEffect(() => {
    setCurrentRating(rating);
  }, [rating]);

  const handleMouseEnter = (starIndex) => {
    if (!isReadonly) {
      setHoverRating(starIndex + 1);
    }
  };

  const handleMouseLeave = () => {
    if (!isReadonly) {
      setHoverRating(0);
    }
  };

  const handleClick = (starIndex) => {
    if (!isReadonly && onRatingChange) {
      const newRating = starIndex + 1;
      setCurrentRating(newRating);
      onRatingChange(newRating);
    }
  };

  const renderStars = () => {
    const stars = [];
    // Asegurar que displayRating sea un número
    const numericRating = parseFloat(isReadonly ? currentRating : hoverRating || currentRating) || 0;
    const displayRating = numericRating;
    const hasRatings = totalRatings > 0;

    for (let i = 0; i < maxRating; i++) {
      const starClass = `star-rating__star ${size}`;
      // Estrella completa si el índice es menor que el rating completo
      // Ejemplo: rating 4.5 -> i=0,1,2,3 son filled, i=4 es half
      const isFilled = i < Math.floor(displayRating);
      // Media estrella si el rating tiene decimales y está entre i e i+1
      // Ejemplo: rating 4.5 -> i=4, displayRating=4.5, entonces 4 < 4.5 < 5 = true
      const isHalf = !isFilled && displayRating > i && displayRating < i + 1;
      // Solo mostrar como "no-ratings" si es readonly, no hay ratings totales Y no hay rating actual
      const isNoRatings = isReadonly && !hasRatings && displayRating === 0;

      stars.push(
        <span
          key={i}
          className={`${starClass} ${isFilled ? 'filled' : isHalf ? 'half' : ''} ${isNoRatings ? 'no-ratings' : ''}`}
          onMouseEnter={() => handleMouseEnter(i)}
          onMouseLeave={handleMouseLeave}
          onClick={() => handleClick(i)}
          style={{ cursor: isReadonly ? 'default' : 'pointer' }}
        >
          ★
        </span>
      );
    }

    return stars;
  };

  const getRatingText = () => {
    const ratingTexts = {
      1: 'Muy malo',
      2: 'Malo', 
      3: 'Regular',
      4: 'Bueno',
      5: 'Excelente'
    };
    return ratingTexts[hoverRating || currentRating] || '';
  };

  return (
    <div className="star-rating">
      <div className="star-rating__stars">
        {renderStars()}
      </div>
      
      {showText && !isReadonly && (
        <div className="star-rating__text">
          {getRatingText()}
        </div>
      )}
      
      {showAverage && (
        <div className="star-rating__info">
          <span className="star-rating__average">
            {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
          </span>
          {totalRatings > 0 && (
            <span className="star-rating__count">
              ({totalRatings} {totalRatings === 1 ? 'calificación' : 'calificaciones'})
            </span>
          )}
          {totalRatings === 0 && (
            <span className="star-rating__count">
              (Sin calificaciones)
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StarRating; 
