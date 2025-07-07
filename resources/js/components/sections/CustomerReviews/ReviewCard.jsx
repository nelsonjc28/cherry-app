import React from 'react';
import './ReviewCard.css';

const ReviewCard = ({ name, avatar, rating, text }) => {
  // Generate stars based on rating
  const generateStars = (rating) => {
    return '★'.repeat(rating);
  };

  return (
    <div className="review-card">
      {/* User Avatar */}
      <img 
        className="review-avatar" 
        src={avatar} 
        alt={name}
        loading="lazy"
      />
      
      {/* Reviewer Name */}
      <div className="reviewer">{name}</div>
      
      {/* Star Rating */}
      <div className="rating">
        {generateStars(rating)}
      </div>
      
      {/* Review Text */}
      <p className="review-text">"{text}"</p>
    </div>
  );
};

export default ReviewCard; 