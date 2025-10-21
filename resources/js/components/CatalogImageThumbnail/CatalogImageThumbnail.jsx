import React from 'react';
import './CatalogImageThumbnail.css';

const CatalogImageThumbnail = ({ 
  image, 
  selected, 
  onClick, 
  onRemove, 
  showRemoveButton = false,
  isDragging = false 
}) => {
  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(image.id);
    }
  };

  return (
    <div
      className={`catalog-image-thumbnail${selected ? ' selected' : ''}${isDragging ? ' dragging' : ''}`}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      draggable={true}
    >
      <div className="catalog-image-thumbnail-image-wrapper">
        <img
          src={image.image_url || image.thumbnail_url || image.image_path}
          alt={image.image_alt || image.image_name || 'Imagen del catálogo'}
          className="catalog-image-thumbnail-image"
          loading="lazy"
        />
        {showRemoveButton && (
          <button
            className="catalog-image-thumbnail-remove-btn"
            onClick={handleRemove}
            title="Eliminar imagen"
          >
            ×
          </button>
        )}
      </div>
      <div className="catalog-image-thumbnail-title">
        {image.image_name || image.image_alt || `Imagen ${image.id}`}
      </div>
    </div>
  );
};

export default CatalogImageThumbnail;






























