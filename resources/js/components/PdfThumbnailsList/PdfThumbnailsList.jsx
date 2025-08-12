import React from 'react';
import './PdfThumbnailsList.css';

const PdfThumbnailsList = ({ products, selectedIndex, onSelect }) => {
  return (
    <div className="pdf-thumbnails-list">
      {products.map((product, index) => (
        <div
          key={product.id}
          className={`pdf-thumbnail ${selectedIndex === index ? 'selected' : ''}`}
          onClick={() => onSelect(index)}
        >
          <img
            src={product.image}
            alt={product.title}
            className="pdf-thumbnail-image"
            loading="lazy"
          />
          <div className="pdf-thumbnail-overlay">
            <span className="pdf-thumbnail-title">{product.title}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PdfThumbnailsList; 