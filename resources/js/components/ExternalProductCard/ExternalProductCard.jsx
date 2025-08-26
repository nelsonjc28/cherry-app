import React from 'react';
import { generateS3ImageUrl } from '../../api/cherryApi';
import './ExternalProductCard.css';

const ExternalProductCard = ({ product, onAddToCategory, isInCategory = false }) => {


  const handleAddToCategory = () => {
    if (onAddToCategory && !isInCategory) {
      onAddToCategory(product);
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'Precio no disponible';
    return `$${parseFloat(price).toFixed(2)}`;
  };

  const getProductImage = () => {
    try {
      return generateS3ImageUrl(product.id_articulo);
    } catch (error) {
      return '/images/placeholder-product.jpg';
    }
  };

  return (
    <div className={`external-product-card ${isInCategory ? 'in-category' : ''}`}>
      <div className="external-product-card__image">
        <img 
          src={getProductImage()} 
          alt={product.nombre_articulo || 'Producto'}
          onError={(e) => {
            e.target.src = '/images/placeholder-product.jpg';
          }}
        />
        {isInCategory && (
          <div className="external-product-card__badge">
            <span>✓ En categoría</span>
          </div>
        )}
      </div>
      
      <div className="external-product-card__content">
        <h3 className="external-product-card__name">
          {product.nombre_articulo || 'Sin nombre'}
        </h3>
        
        <p className="external-product-card__description">
          {product.descripcion_articulo || 'Sin descripción'}
        </p>
        
        <div className="external-product-card__details">
          <span className="external-product-card__price">
            {formatPrice(product.precio_articulo)}
          </span>
          
          {product.codigo_articulo && (
            <span className="external-product-card__code">
              Código: {product.codigo_articulo}
            </span>
          )}
        </div>
        
        {!isInCategory && (
          <button 
            className="external-product-card__add-btn"
            onClick={handleAddToCategory}
          >
            Agregar a Categoría
          </button>
        )}
      </div>
    </div>
  );
};

export default ExternalProductCard;
