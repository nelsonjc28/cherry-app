import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import './HomePage.css';
import HeroBanner from '../components/sections/HeroBanner/HeroBanner';
import CategorySection from '../components/sections/CategorySection/CategorySection';

import RecentCatalogs from '../components/sections/RecentCatalogs/RecentCatalogs';
import FeaturedProducts from '../components/sections/FeaturedProducts/FeaturedProducts';
import FeaturedCategories from '../components/sections/FeaturedCategories/FeaturedCategories';
import CustomerReviews from '../components/sections/CustomerReviews/CustomerReviews';
import BestSellers from '../components/sections/BestSellers/BestSellers';
import AffiliateSection from '../components/sections/AffiliateSection/AffiliateSection';

import useUserStore from '../store/userStore';
import { getTopSellingProducts } from '../api/cherryApi';
import { applyUserOffersToProducts } from '../api/userOffers';

const HomePage = () => {
  const { user, initialized } = useUserStore();
  const [topSellingProducts, setTopSellingProducts] = useState([]);
  const [loadingTopSelling, setLoadingTopSelling] = useState(true);

  // Cargar productos más vendidos (6 productos)
  useEffect(() => {
    const loadTopSellingProducts = async () => {
      setLoadingTopSelling(true);
      
      try {
        
        // Obtener productos más vendidos del mes actual (limitado a 6)
        const products = await getTopSellingProducts(6);
        
        if (products.length === 0) {
          setTopSellingProducts([]);
          return;
        }
        
        // Aplicar ofertas personalizadas si hay usuario logueado
        let finalProducts = products;
        if (user) {
          finalProducts = await applyUserOffersToProducts(products);
        }
        
        setTopSellingProducts(finalProducts);
        
        
      } catch (error) {
        console.error('❌ HomePage: Error al cargar productos más vendidos:', error);
        setTopSellingProducts([]);
      } finally {
        setLoadingTopSelling(false);
      }
    };

    loadTopSellingProducts();
  }, [user]);

  
  const featuredProducts = [
    {
      id: 1,
      title: 'Complementa tu look con nuestra elegante colección de vestidos',
      image: `${window.location.origin}/images/FeaturedProducts/example_image_card.png`,
      price: 29,
      rating: 5,
      description: 'Un toque clásico que nunca pasa de moda. Perfecto para ocasiones especiales.'
    },
    {
      id: 2,
      title: 'Blusas modernas para el día a día',
      image: `${window.location.origin}/images/RecentCatalogs/image_example_2.png`,
      price: 29,
      rating: 5,
      description: 'Comodidad y estilo en cada diseño. Ideal para el uso diario.'
    },
    {
      id: 3,
      title: 'Pantalones que resaltan tu figura',
      image: `${window.location.origin}/images/RecentCatalogs/image_example_1.png`,
      price: 29,
      rating: 5,
      description: 'Cortes modernos que se adaptan a tu silueta perfectamente.'
    },
    {
      id: 4,
      title: 'Accesorios únicos para completar tu outfit',
      image: `${window.location.origin}/images/HeroBanner/hero-slider1-girl.png`,
      price: 29,
      rating: 5,
      description: 'Detalles que marcan la diferencia en tu estilo personal.'
    }
  ];

  return (
    <>
      <Helmet>
        <title>Cherry Central - Moda Femenina Online | Vestidos, Blusas y Más</title>
        <meta name="description" content="Descubre la mejor moda femenina en Cherry Central. Vestidos elegantes, blusas modernas, pantalones y accesorios únicos. ¡Afíliate y empieza tu negocio!" />
        <meta name="keywords" content="moda femenina, vestidos elegantes, blusas modernas, pantalones de mujer, accesorios únicos, cherry central, tienda online moda" />
        <link rel="canonical" href="https://cherrycentral.com/" />
        
        {/* Schema.org for HomePage */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Cherry Central - Inicio",
            "description": "Tienda online de moda femenina con los mejores diseños y programa de afiliados",
            "url": "https://cherrycentral.com/",
            "mainEntity": {
              "@type": "Store",
              "name": "Cherry Central",
              "description": "Tienda de moda femenina online",
              "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "Catálogo de Moda Femenina",
                "itemListElement": [
                  {
                    "@type": "Offer",
                    "itemOffered": {
                      "@type": "Product",
                      "name": "Vestidos Elegantes",
                      "category": "Vestidos"
                    }
                  },
                  {
                    "@type": "Offer", 
                    "itemOffered": {
                      "@type": "Product",
                      "name": "Blusas Modernas",
                      "category": "Blusas"
                    }
                  }
                ]
              }
            }
          })}
        </script>
      </Helmet>

      <main id="main-content" className="home-page" role="main">
        {/* Hero Section - Contains H1 */}
        <HeroBanner />

        {/* Navigation Section */}
        <nav aria-label="Categorías de productos">
          <CategorySection />
        </nav>



        {/* Recent Collections */}
        <section aria-labelledby="recent-catalogs-heading">
          <RecentCatalogs />
        </section>

        {/* Featured Products Section */}
        <section aria-labelledby="featured-products-heading">
          <h2 id="featured-products-heading" className="sr-only">Productos Más Vendidos</h2>
          <FeaturedProducts 
            title="Productos diseñados para reflejar tu estilo y personalidad."
            viewAllLink="/productos"
            viewAllText="Ver Más"
            useApi={true}
          />
        </section>

        {/* Featured Categories */}
        <section aria-labelledby="featured-categories-heading">
          <h2 id="featured-categories-heading" className="sr-only">Categorías Destacadas</h2>
          <FeaturedCategories />
        </section>

        {/* Affiliate Section - Solo visible cuando no hay sesión activa */}
        {!user && (
          <section className="affiliate-banner" aria-labelledby="affiliate-heading">
            <AffiliateSection />
          </section>
        )}

        {/* Customer Testimonials */}
        <section aria-labelledby="reviews-heading">
          <h2 id="reviews-heading" className="sr-only">Opiniones de Nuestros Clientes</h2>
          <CustomerReviews />
        </section>

        {/* Best Selling Products */}
        <section aria-labelledby="best-sellers-heading">
          <h2 id="best-sellers-heading" className="sr-only">Productos Más Vendidos</h2>
          <BestSellers 
            products={topSellingProducts}
            title="Productos más vendidos"
            description="Los 6 productos favoritos de nuestros clientes este mes"
            loading={loadingTopSelling}
            useApi={false}
          />
        </section>
      </main>
    </>
  );
};

export default HomePage; 
