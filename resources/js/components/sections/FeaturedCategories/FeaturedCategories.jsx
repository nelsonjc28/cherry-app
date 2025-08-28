import { useState, useEffect } from 'react';
import './FeaturedCategories.css';
import { Link } from 'react-router-dom';
import { getHeroIconPath, getFeaturedCategoryIconPath } from '../../../utils/assetPaths';
import { publicCategoryService } from '../../../services/api';

const FeaturedCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await publicCategoryService.getAll();
        
        if (response.data.success && response.data.categories) {
          // Tomar las primeras 3 categorías y mapearlas
          const featuredCategories = response.data.categories.slice(0, 3).map((category, index) => ({
            id: category.id,
            title: category.name,
            description: category.description || `Descubre nuestra colección de ${category.name}`,
            iconName: `${category.slug}.png`,
            link: `/categoria/${category.slug}`
          }));
          
          setCategories(featuredCategories);
        } else {
          // Fallback a categorías por defecto
          const defaultCategories = [
            {
              id: 1,
              title: 'Vestidos',
              description: 'Descubre nuestra colección exclusiva de vestidos para toda ocasión.',
              iconName: 'vestido.png',
              link: '/categoria/vestidos'
            },
            {
              id: 2,
              title: 'Blusas',
              description: 'Elegantes blusas que complementan cualquier outfit.',
              iconName: 'Blusa.png',
              link: '/categoria/blusas'
            },
            {
              id: 3,
              title: 'Pantalones',
              description: 'Pantalones versátiles para un look sofisticado.',
              iconName: 'Pantalones.png',
              link: '/categoria/pantalones'
            }
          ];
          setCategories(defaultCategories);
        }
        
        setError(null);
      } catch (err) {
        // Fallback a categorías por defecto en caso de error
        const defaultCategories = [
          {
            id: 1,
            title: 'Vestidos',
            description: 'Descubre nuestra colección exclusiva de vestidos para toda ocasión.',
            iconName: 'vestido.png',
            link: '/categoria/vestidos'
          },
          {
            id: 2,
            title: 'Blusas',
            description: 'Elegantes blusas que complementan cualquier outfit.',
            iconName: 'Blusa.png',
            link: '/categoria/blusas'
          },
          {
            id: 3,
            title: 'Pantalones',
            description: 'Pantalones versátiles para un look sofisticado.',
            iconName: 'Pantalones.png',
            link: '/categoria/pantalones'
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
        </div>

        {/* Categories Grid */}
        <div className="featured-categories__grid">
          {categories.map((category) => (
            <div key={category.id} className="category-card">
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
                
                <div className="category-card__action">
                  <Link to={category.link} className="view-more-link">
                    Ver productos
                    <img 
                      src={getHeroIconPath('Chevron Right.svg')} 
                      alt="Ver más" 
                      width="16" 
                      height="16" 
                    />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories; 