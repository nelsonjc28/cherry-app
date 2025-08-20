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
            iconName: `${category.slug}.svg`,
            link: `/categoria/${category.slug}`
          }));
          
          setCategories(featuredCategories);
        } else {
          // Fallback a categorías por defecto
          const defaultCategories = [
            {
              id: 1,
              title: "Elige lo mejor para ti y marca la diferencia.",
              description: "Nuestra chaqueta de cuero es ideal para cualquier ocasión",
              iconName: "chaqueta.svg",
              link: "/categoria/chaquetas"
            },
            {
              id: 2,
              title: "Complementa tu look con nuestro elegante collar de perlas.",
              description: "Un toque clásico que nunca pasa de moda",
              iconName: "collar.svg",
              link: "/categoria/collares"
            },
            {
              id: 3,
              title: "Confort y estilo se unen en nuestros zapatos altos",
              description: "Ideales para un día activo sin sacrificar la moda",
              iconName: "tacones.svg",
              link: "/categoria/zapatos"
            }
          ];
          setCategories(defaultCategories);
        }
      } catch (error) {
        console.error('Error loading featured categories:', error);
        // Usar categorías por defecto en caso de error
        const defaultCategories = [
          {
            id: 1,
            title: "Elige lo mejor para ti y marca la diferencia.",
            description: "Nuestra chaqueta de cuero es ideal para cualquier ocasión",
            iconName: "chaqueta.svg",
            link: "/categoria/chaquetas"
          },
          {
            id: 2,
            title: "Complementa tu look con nuestro elegante collar de perlas.",
            description: "Un toque clásico que nunca pasa de moda",
            iconName: "collar.svg",
            link: "/categoria/collares"
          },
          {
            id: 3,
            title: "Confort y estilo se unen en nuestros zapatos altos",
            description: "Ideales para un día activo sin sacrificar la moda",
            iconName: "tacones.svg",
            link: "/categoria/zapatos"
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