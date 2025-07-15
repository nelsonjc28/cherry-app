import React from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../ProductCard/ProductCard';
import { getHeroIconPath } from '../../utils/assetPaths';
import './ProductGrid.css';

const ProductGrid = ({ 
  title, 
  products, 
  viewAllLink, 
  viewAllText = 'Ver Más'
}) => {
  return (
    <div className="product-grid-container">
      <div className="product-grid-header">
        <h2 className="product-grid-title">{title}</h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="product-grid-view-all">
            {viewAllText} 
            <span className="arrow">
              <img 
                src={getHeroIconPath('Chevron Right.svg')} 
                alt="Ver más" 
                width="16" 
                height="16" 
              />
            </span>
          </Link>
        )}
      </div>

      <div className="product-grid">
        {products.map((product) => (
          <div key={product.id} className="product-grid-item">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductGrid; 