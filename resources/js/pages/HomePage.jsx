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
import useProductCachePreload from '../hooks/useProductCachePreload';

const HomePage = () => {
  const { user, initialized } = useUserStore();
  const [topSellingProducts, setTopSellingProducts] = useState([]);
  const [loadingTopSelling, setLoadingTopSelling] = useState(true);

  // 🚀 PRECARGA: Inicia descarga de todos los productos en background
  // Primera vez: tarda unos segundos, pero las siguientes páginas serán instantáneas
  useProductCachePreload();

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
        <title>Cherry - Tienda de Ropa y Calzado para Dama en México</title>
        <meta name="description" content="CHERRY es una Tienda de Ropa y Calzado para Dama en Mexico. Constantemente estamos recibiendo Modelos Nuevos tenemos vestidos, blusas, pantalones, faldas y más." />
        <meta name="keywords" content="ropa para dama, calzado para dama, vestidos, blusas, pantalones, faldas, moda femenina, tienda online México, Cherry" />
        <link rel="canonical" href="https://cherrydistribuidores.com.mx/" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://cherrydistribuidores.com.mx/" />
        <meta property="og:title" content="Cherry - Tienda de Ropa y Calzado para Dama en México" />
        <meta property="og:description" content="CHERRY es una Tienda de Ropa y Calzado para Dama en Mexico. Constantemente estamos recibiendo Modelos Nuevos tenemos vestidos, blusas, pantalones, faldas y más." />
        <meta property="og:image" content="https://cherrydistribuidores.com.mx/icons/logo-cherry.png" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://cherrydistribuidores.com.mx/" />
        <meta property="twitter:title" content="Cherry - Tienda de Ropa y Calzado para Dama en México" />
        <meta property="twitter:description" content="CHERRY es una Tienda de Ropa y Calzado para Dama en Mexico. Constantemente estamos recibiendo Modelos Nuevos tenemos vestidos, blusas, pantalones, faldas y más." />
        <meta property="twitter:image" content="https://cherrydistribuidores.com.mx/icons/logo-cherry.png" />
        
        {/* Schema.org Organization with Logo - Required by Google */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Cherry",
            "url": "https://cherrydistribuidores.com.mx",
            "logo": "https://cherrydistribuidores.com.mx/icons/logo-cherry.png",
            "description": "CHERRY es una Tienda de Ropa y Calzado para Dama en Mexico. Constantemente estamos recibiendo Modelos Nuevos tenemos vestidos, blusas, pantalones, faldas y más.",
            "sameAs": []
          })}
        </script>
        
        {/* Schema.org for HomePage */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Cherry - Tienda de Ropa y Calzado para Dama",
            "description": "CHERRY es una Tienda de Ropa y Calzado para Dama en Mexico. Constantemente estamos recibiendo Modelos Nuevos tenemos vestidos, blusas, pantalones, faldas y más.",
            "url": "https://cherrydistribuidores.com.mx/",
            "mainEntity": {
              "@type": "Store",
              "name": "Cherry",
              "description": "CHERRY es una Tienda de Ropa y Calzado para Dama en Mexico. Constantemente estamos recibiendo Modelos Nuevos tenemos vestidos, blusas, pantalones, faldas y más.",
              "image": "https://cherrydistribuidores.com.mx/icons/logo-cherry.png",
              "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "Catálogo de Ropa y Calzado para Dama",
                "itemListElement": [
                  {
                    "@type": "Offer",
                    "itemOffered": {
                      "@type": "Product",
                      "name": "Vestidos",
                      "category": "Vestidos"
                    }
                  },
                  {
                    "@type": "Offer", 
                    "itemOffered": {
                      "@type": "Product",
                      "name": "Blusas",
                      "category": "Blusas"
                    }
                  },
                  {
                    "@type": "Offer",
                    "itemOffered": {
                      "@type": "Product",
                      "name": "Pantalones",
                      "category": "Pantalones"
                    }
                  },
                  {
                    "@type": "Offer",
                    "itemOffered": {
                      "@type": "Product",
                      "name": "Faldas",
                      "category": "Faldas"
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
            title="Checa lo mas nuevo"
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
