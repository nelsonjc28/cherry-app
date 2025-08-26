import './CategoryIcon.css';

const CategoryIcon = ({ name, icon }) => {
  return (
    <div className="category-icon">
      <p className="category-name">{name}</p>
      <div className="icon-container">
        <img 
          src={icon} 
          alt={`Categoría: ${name}`} 
          className="category-image"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default CategoryIcon; 