import { Link } from 'react-router-dom';
import CategoryIcon from '../../CategoryIcon/CategoryIcon';
import { getCategoryIconPath, getHeroIconPath } from '../../../utils/assetPaths';
import './CategorySection.css';

const CategorySection = () => {
  // Categories data with their icons using robust asset paths
  const categories = [
    { name: 'Vestidos', icon: getCategoryIconPath('vestido-de-novio 1.svg') },
    { name: 'Blusas', icon: getCategoryIconPath('blusa 1.svg') },
    { name: 'Pantalones', icon: getCategoryIconPath('pantalones-ajustados 1.svg') },
    { name: 'Sacos', icon: getCategoryIconPath('vestir 1.svg') },
    { name: 'Conjuntos', icon: getCategoryIconPath('moda 2 1.svg') },
    { name: 'Gabardinas', icon: getCategoryIconPath('gabardina 1.svg') }
  ];

  return (
    <section className="category-section">
      <div className="container">
        <div className="category-grid">
          {categories.map((category, index) => (
            <CategoryIcon 
              key={index}
              name={category.name}
              icon={category.icon}
            />
          ))}
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