import { Link } from 'react-router-dom';
import './CategoryIcon.css';

const CategoryIcon = ({ name, icon }) => {
  // Generate URL-friendly slug from category name
  const categorySlug = name.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <Link to={`/categoria/${categorySlug}`} className="category-icon">
      <p className="category-name">{name}</p>
      <div className="icon-container">
        <img 
          src={icon} 
          alt={`Categoría: ${name}`} 
          className="category-image"
          loading="lazy"
        />
      </div>
    </Link>
  );
};

export default CategoryIcon; 