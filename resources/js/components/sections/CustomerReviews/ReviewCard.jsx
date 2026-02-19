import React, { useState } from 'react';
import './ReviewCard.css';

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ReviewCard = ({ name, avatar, rating, text }) => {
  const [imgError, setImgError] = useState(false);

  const generateStars = (rating) => {
    return '★'.repeat(rating);
  };

  return (
    <div className="review-card">
      {avatar && !imgError ? (
        <img 
          className="review-avatar" 
          src={avatar} 
          alt={name}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="review-avatar review-avatar-initials">
          {getInitials(name)}
        </div>
      )}
      
      <div className="reviewer">{name}</div>
      
      <div className="rating">
        {generateStars(rating)}
      </div>
      
      <p className="review-text">"{text}"</p>
    </div>
  );
};

export default ReviewCard; 
