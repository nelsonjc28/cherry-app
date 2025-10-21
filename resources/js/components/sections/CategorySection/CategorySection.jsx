import { Link, useNavigate } from 'react-router-dom';
import CategoryIcon from '../../CategoryIcon/CategoryIcon';
import { getCategoryIconPath, getHeroIconPath } from '../../../utils/assetPaths';
import useHomeCategories from '../../../hooks/useHomeCategories';
import './CategorySection.css';

const CategorySection = () => {
  const navigate = useNavigate();
  const { categories, loading, error } = useHomeCategories();

  // Función para convertir nombre de categoría de plural a singular
  const pluralToSingular = (categoryName) => {
    const pluralMap = {
      'pantalones': 'pantalón',
      'vestidos': 'vestido',
      'blusas': 'blusa',
      'faldas': 'falda',
      'chaquetas': 'chaqueta',
      'abrigos': 'abrigo',
      'trajes': 'traje',
      'zapatos': 'zapato',
      'bolsos': 'bolso',
      'accesorios': 'accesorio',
      'suéteres': 'suéter',
      'camisas': 'camisa',
      'playeras': 'playera',
      'chamarras': 'chamarra',
      'shorts': 'short',
      'calcetines': 'calcetín',
      'leggins': 'leggin',
      'jeans': 'jean'
    };

    const lowerName = categoryName.toLowerCase().trim();
    
    if (pluralMap[lowerName]) {
      return pluralMap[lowerName];
    }
    
    if (lowerName.endsWith('ones')) {
      return lowerName.slice(0, -4) + 'ón';
    }
    
    if (lowerName.endsWith('es') && lowerName.length > 3) {
      const beforeEs = lowerName[lowerName.length - 3];
      if (!'aeiou'.includes(beforeEs)) {
        return lowerName.slice(0, -2);
      }
    }
    
    if (lowerName.endsWith('s') && !lowerName.endsWith('ss')) {
      return lowerName.slice(0, -1);
    }
    
    return categoryName;
  };

  // Función para manejar clic en categoría
  const handleCategoryClick = (category) => {
    const singularName = pluralToSingular(category.name);
    const searchParams = new URLSearchParams();
    searchParams.set('q', singularName);
    navigate(`/buscar?${searchParams.toString()}`);
  };

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
    // Error silencioso
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
                onClick={() => handleCategoryClick(category)}
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
