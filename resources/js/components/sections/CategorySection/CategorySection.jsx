import { Link } from 'react-router-dom';
import CategoryIcon from '../../CategoryIcon/CategoryIcon';
import { getCategoryIconPath, getHeroIconPath } from '../../../utils/assetPaths';
import useHomeCategories from '../../../hooks/useHomeCategories';
import './CategorySection.css';

const CategorySection = () => {
  const { categories, loading, error } = useHomeCategories();

  if (loading) {
    return (
      <section className="category-section">
        <div className="container">
          <div className="category-loading">
            <div className="loading-spinner"></div>
            <p>Cargando categorías...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    console.error('Error loading categories:', error);
  }

  return (
    <section className="category-section">
      <div className="container">
        <div className="category-grid">
          {categories && categories.length > 0 ? (
            categories.map((category, index) => (
              <CategoryIcon 
                key={category.id || index}
                name={category.name}
                icon={category.icon}
              />
            ))
          ) : (
            <div className="no-categories">
              <p>No hay categorías disponibles</p>
            </div>
          )}
        </div>
        
        <div className="category-description">
          <p>
            En nuestra tienda, encontrarás una amplia variedad de ropa, accesorios y calzado.
            Cada pieza está seleccionada para realzar tu estilo personal.
          </p>
          
          <Link to="/categorias" className="view-more-link">
            Ver Más 
            <img 
              src={getHeroIconPath('Chevron Right.svg')} 
              alt="Ver más" 
              width="16" 
              height="16" 
            />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CategorySection; 