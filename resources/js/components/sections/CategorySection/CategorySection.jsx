import { Link } from 'react-router-dom';
import CategoryIcon from '../../CategoryIcon/CategoryIcon';
import { getCategoryIconPath, getHeroIconPath } from '../../../utils/assetPaths';
import './CategorySection.css';

const CategorySection = () => {
  // Categories data with their icons using robust asset paths - ACTUALIZADO CON DATOS REALES
  const categories = [
    { name: 'Vestidos', icon: getCategoryIconPath('vestido-de-novio 1.svg'), category: 'vestidos' },
    { name: 'Blusas', icon: getCategoryIconPath('blusa 1.svg'), category: 'blusas' },
    { name: 'Pantalones', icon: getCategoryIconPath('pantalones-ajustados 1.svg'), category: 'pantalones' },
    { name: 'Suéteres', icon: getCategoryIconPath('vestir 1.svg'), category: 'sueteres' },
    { name: 'Jumpsuits', icon: getCategoryIconPath('moda 2 1.svg'), category: 'jumpsuits' },
    { name: 'Faldas', icon: getCategoryIconPath('gabardina 1.svg'), category: 'faldas' },
    { name: 'Conjuntos', icon: getCategoryIconPath('moda 2 1.svg'), category: 'conjuntos' },
    { name: 'Abrigos', icon: getCategoryIconPath('vestir 1.svg'), category: 'abrigos' }
  ];

  return (
    <section className="category-section">
      <div className="container">
        <div className="category-grid">
          {categories.map((category, index) => (
            <Link 
              key={index}
              to={`/catalogo?category=${category.category}`}
              className="category-link"
            >
              <CategoryIcon 
                name={category.name}
                icon={category.icon}
              />
            </Link>
          ))}
        </div>
        
        <div className="category-description">
          <p>
            En nuestra tienda, encontrarás una amplia variedad de ropa, accesorios y calzado.
            Cada pieza está seleccionada para realzar tu estilo personal.
          </p>
          
          <Link to="/catalogo" className="view-more-link">
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