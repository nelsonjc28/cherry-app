import './PdfThumbnail.css';

const PdfThumbnail = ({ 
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
      className={`pdf-thumbnail${selected ? ' selected' : ''}${isDragging ? ' dragging' : ''}`}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
      draggable={true}
    >
      <div className="pdf-thumbnail-image-wrapper">
        <img
          src={image.image_url || image.thumbnail_url || `http://127.0.0.1:8000/${image.image_path}`}
          alt={image.image_alt || image.image_name || 'Imagen del catálogo'}
          className="pdf-thumbnail-image"
          loading="lazy"
        />
        {showRemoveButton && (
          <button
            className="pdf-thumbnail-remove-btn"
            onClick={handleRemove}
            title="Eliminar imagen"
          >
            ×
          </button>
        )}
      </div>
      <div className="pdf-thumbnail-title">
        {image.image_name || image.image_alt || `Imagen ${image.id}`}
      </div>
    </div>
  );
};

export default PdfThumbnail; 