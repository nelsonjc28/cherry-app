import { useState, useEffect } from 'react';
import './FeaturedCategories.css';
import { Link } from 'react-router-dom';
import { getHeroIconPath, getFeaturedCategoryIconPath } from '../../../utils/assetPaths';
import { publicCategoryService } from '../../../services/api';

const FeaturedCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Función para manejar el clic en una categoría
  const handleCategoryClick = (category) => {
    console.log(`Navegando a la categoría: ${category.title} (${category.link})`);
  };
  
  // Mapeo de categorías para compatibilidad con la API
  const categoryMapping = {
    'vestidos': 'dresses',
    'blusas': 'tops',
    'pantalones': 'pants',
    'faldas': 'skirts',
    'chaquetas': 'jackets',
    'abrigos': 'coats',
    'trajes': 'suits',
    'ropa-interior': 'lingerie',
    'accesorios': 'accessories',
    'zapatos': 'shoes',
    'bolsos': 'bags'
  };
  
  // Función para mezclar array de forma aleatoria (Fisher-Yates shuffle)
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await publicCategoryService.getAll();
        
        if (response.data.success && response.data.categories) {
          // Mezclar las categorías y tomar 3 aleatorias
          const shuffledCategories = shuffleArray(response.data.categories);
          const featuredCategories = shuffledCategories.slice(0, 3).map((category, index) => {
            // Mapear el slug de la categoría a un nombre compatible con la API
            const mappedSlug = categoryMapping[category.slug] || category.slug;
            return {
              id: category.id,
              title: category.name,
              description: category.description || `Descubre nuestra colección de ${category.name}`,
              iconName: category.slug,
              link: `/categoria/${mappedSlug}`
            };
          });
          
          setCategories(featuredCategories);
        } else {
          // Fallback a categorías por defecto
          const defaultCategories = [
            {
              id: 1,
              title: 'Vestidos',
              description: 'Descubre nuestra colección exclusiva de vestidos para toda ocasión.',
              iconName: 'vestidos',
              link: '/categoria/dresses'
            },
            {
              id: 2,
              title: 'Blusas',
              description: 'Elegantes blusas que complementan cualquier outfit.',
              iconName: 'blusas',
              link: '/categoria/tops'
            },
            {
              id: 3,
              title: 'Pantalones',
              description: 'Pantalones versátiles para un look sofisticado.',
              iconName: 'pantalones',
              link: '/categoria/pants'
            }
          ];
          setCategories(defaultCategories);
        }
      } catch (err) {
        // Fallback a categorías por defecto en caso de error
        const defaultCategories = [
          {
            id: 1,
            title: 'Vestidos',
            description: 'Descubre nuestra colección exclusiva de vestidos para toda ocasión.',
            iconName: 'vestidos',
            link: '/categoria/dresses'
          },
          {
            id: 2,
            title: 'Blusas',
            description: 'Elegantes blusas que complementan cualquier outfit.',
            iconName: 'blusas',
            link: '/categoria/tops'
          },
          {
            id: 3,
              title: 'Pantalones',
              description: 'Pantalones versátiles para un look sofisticado.',
              iconName: 'pantalones',
              link: '/categoria/pants'
            }
          ];
        setCategories(defaultCategories);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return (
    <section className="featured-categories">
      <div className="container">
        {/* Section Header */}
        <div className="featured-categories__header">
          <h2 className="featured-categories__title">
            Descubre nuestros productos destacados que realzan tu estilo y personalidad.
          </h2>
          <p className="featured-categories__subtitle">
            Explora estas 3 categorías seleccionadas especialmente para ti
          </p>
        </div>

        {/* Categories Grid */}
        <div className="featured-categories__grid">
          {categories.map((category) => (
            <div key={category.id} className="category-card">
              <Link 
                to={category.link} 
                className="category-card__link"
                onClick={() => handleCategoryClick(category)}
              >
                <div className="category-card__icon">
                  <div className="image-container">
                    <img 
                      src={getFeaturedCategoryIconPath(category.iconName)}
                      alt={`Icono de ${category.title}`}
                      width="48"
                      height="48"
                    />
                  </div>
                </div>
                
                <div className="category-card__content">
                  <h3 className="category-card__title">
                    {category.title}
                  </h3>
                  
                  <p className="category-card__description">
                    {category.description}
                  </p>
                </div>
              </Link>
              
              <div className="category-card__action">
                <Link to="/catalogos" className="view-more-link">
                  Ver todos los catálogos
                  <img 
                    src={getHeroIconPath('Chevron Right.svg')} 
                    alt="Ver más" 
                    width="16" 
                    height="16" 
                  />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories; 