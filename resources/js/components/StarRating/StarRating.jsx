import React, { useState, useEffect } from 'react';
import './StarRating.css';

const StarRating = ({ 
  rating = 0, 
  maxRating = 5, 
  size = 'medium', 
  readonly = false, 
  showAverage = false,
  averageRating = 0,
  totalRatings = 0,
  onRatingChange = null 
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [currentRating, setCurrentRating] = useState(rating);

  useEffect(() => {
    setCurrentRating(rating);
  }, [rating]);

  const handleMouseEnter = (starIndex) => {
    if (!readonly) {
      setHoverRating(starIndex + 1);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverRating(0);
    }
  };

  const handleClick = (starIndex) => {
    if (!readonly && onRatingChange) {
      const newRating = starIndex + 1;
      setCurrentRating(newRating);
      onRatingChange(newRating);
    }
  };

  const renderStars = () => {
    const stars = [];
    const displayRating = readonly ? currentRating : hoverRating || currentRating;
    const hasRatings = totalRatings > 0;

    for (let i = 0; i < maxRating; i++) {
      const starClass = `star-rating__star ${size}`;
      const isFilled = i < displayRating;
      const isHalf = !isFilled && displayRating > i && displayRating < i + 1;
      const isNoRatings = !hasRatings;

      stars.push(
        <span
          key={i}
          className={`${starClass} ${isFilled ? 'filled' : isHalf ? 'half' : ''} ${isNoRatings ? 'no-ratings' : ''}`}
          onMouseEnter={() => handleMouseEnter(i)}
          onMouseLeave={handleMouseLeave}
          onClick={() => handleClick(i)}
          style={{ cursor: readonly ? 'default' : 'pointer' }}
        >
          {isHalf ? '★' : '☆'}
        </span>
      );
    }

    return stars;
  };

  return (
    <div className="star-rating">
      <div className="star-rating__stars">
        {renderStars()}
      </div>
      
      {showAverage && (
        <div className="star-rating__info">
          <span className="star-rating__average">
            {averageRating.toFixed(1)}
          </span>
          {totalRatings > 0 && (
            <span className="star-rating__count">
              ({totalRatings} {totalRatings === 1 ? 'calificación' : 'calificaciones'})
            </span>
          )}
        </div>
      )}
      
      {!readonly && (
        <div className="star-rating__hint">
          Haz clic para calificar
        </div>
      )}
    </div>
  );
};

export default StarRating; 
