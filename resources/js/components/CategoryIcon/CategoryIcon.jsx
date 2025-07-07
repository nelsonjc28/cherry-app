import { Link } from 'react-router-dom';
import './CategoryIcon.css';

const CategoryIcon = ({ name, icon, to, className = "category-icon" }) => {
  // Generate URL-friendly slug from category name
  const categorySlug = name.toLowerCase().replace(/\s+/g, '-');
  
  // If 'to' prop is provided, render as Link, otherwise render as div
  const Component = to ? Link : 'div';
  const props = to ? { to, className } : { className };
  
  return (
    <Component {...props}>
      <p className="category-name">{name}</p>
      <div className="icon-container">
        <img 
          src={icon} 
          alt={`Categoría: ${name}`} 
          className="category-image"
          loading="lazy"
        />
      </div>
    </Component>
  );
};

export default CategoryIcon; 