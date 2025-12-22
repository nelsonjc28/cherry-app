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
import OffersModal from '../components/OffersModal/OffersModal';
import api from '../config/axios';

const HomePage = () => {
  const { user, initialized } = useUserStore();
  const [topSellingProducts, setTopSellingProducts] = useState([]);
  const [loadingTopSelling, setLoadingTopSelling] = useState(true);
  const [showOffersModal, setShowOffersModal] = useState(false);

  // 🚀 PRECARGA: Inicia descarga de todos los productos en background
  // Primera vez: tarda unos segundos, pero las siguientes páginas serán instantáneas
  useProductCachePreload();

  // Verificar si hay ofertas personalizadas y mostrar la modal automáticamente
  useEffect(() => {
    if (!initialized) return; // Esperar a que el store de usuario esté inicializado
    
    // Solo mostrar la modal si hay usuario logueado (las ofertas personalizadas requieren usuario)
    if (!user) return;
    
    const checkAndShowOffers = async () => {
      try {
        // Obtener ofertas personalizadas del usuario
        const response = await api.get('/user-offers');
        
        if (response.data.success) {
          const offers = response.data.offers || [];
          
          // Filtrar ofertas que estén dentro del rango de fechas
          // start_date <= now <= end_date
          const now = new Date();
          const activeOffers = offers.filter(offer => {
            const startDate = new Date(offer.start_date);
            const endDate = new Date(offer.end_date);
            // Verificar que la fecha actual sea >= fecha inicio Y <= fecha fin
            return now >= startDate && now <= endDate;
          });
          
          // Solo mostrar la modal si hay ofertas personalizadas activas dentro del rango de fechas
          if (activeOffers.length > 0) {
            setTimeout(() => {
              setShowOffersModal(true);
            }, 1000);
          }
        }
      } catch (error) {
        console.error('Error al verificar ofertas personalizadas:', error);
      }
    };
    
    // Pequeño delay para asegurar que el componente esté montado
    const timer = setTimeout(() => {
      checkAndShowOffers();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [user, initialized]);

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
        <meta name="description" content="Empieza a vender por catálogo, gana dinero y conviértete en tu propio jefe. Tú eliges cómo y cuándo comenzar a vender. ¡Emprende hoy mismo con Cherry!!!" />
        <meta name="keywords" content="ropa para dama, calzado para dama, vestidos, blusas, pantalones, faldas, moda femenina, tienda online México, Cherry" />
        <link rel="canonical" href="https://cherrydistribuidores.com.mx/" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://cherrydistribuidores.com.mx/" />
        <meta property="og:title" content="Cherry - Tienda de Ropa y Calzado para Dama en México" />
        <meta property="og:description" content="Empieza a vender por catálogo, gana dinero y conviértete en tu propio jefe. Tú eliges cómo y cuándo comenzar a vender. ¡Emprende hoy mismo con Cherry!!!" />
        <meta property="og:image" content="https://cherrydistribuidores.com.mx/icons/logo-cherry.png" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://cherrydistribuidores.com.mx/" />
        <meta property="twitter:title" content="Cherry - Tienda de Ropa y Calzado para Dama en México" />
        <meta property="twitter:description" content="Empieza a vender por catálogo, gana dinero y conviértete en tu propio jefe. Tú eliges cómo y cuándo comenzar a vender. ¡Emprende hoy mismo con Cherry!!!" />
        <meta property="twitter:image" content="https://cherrydistribuidores.com.mx/icons/logo-cherry.png" />
        
        {/* Schema.org Organization with Logo - Required by Google */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Cherry",
            "url": "https://cherrydistribuidores.com.mx",
            "logo": "https://cherrydistribuidores.com.mx/icons/logo-cherry.png",
            "description": "Empieza a vender por catálogo, gana dinero y conviértete en tu propio jefe. Tú eliges cómo y cuándo comenzar a vender. ¡Emprende hoy mismo con Cherry!!!",
            "sameAs": []
          })}
        </script>
        
        {/* Schema.org for HomePage */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Cherry - Tienda de Ropa y Calzado para Dama",
            "description": "Empieza a vender por catálogo, gana dinero y conviértete en tu propio jefe. Tú eliges cómo y cuándo comenzar a vender. ¡Emprende hoy mismo con Cherry!!!",
            "url": "https://cherrydistribuidores.com.mx/",
            "mainEntity": {
              "@type": "Store",
              "name": "Cherry",
              "description": "Empieza a vender por catálogo, gana dinero y conviértete en tu propio jefe. Tú eliges cómo y cuándo comenzar a vender. ¡Emprende hoy mismo con Cherry!!!",
              "image": "https://cherrydistribuidores.com.mx/icons/logo-cherry.png",
              "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "Catálogo de Ropa y Calzado para Dama",
                "itemListElement": [
                  {
                    "@type": "ListItem",
                    "position": 1,
                    "item": {
                      "@type": "Product",
                      "name": "Vestidos",
                      "url": "https://cherrydistribuidores.com.mx/categoria/vestidos",
                      "image": "https://cherrydistribuidores.com.mx/images/category/vestido.png",
                      "offers": {
                        "@type": "AggregateOffer",
                        "offerCount": "1",
                        "lowPrice": "0",
                        "priceCurrency": "MXN"
                      }
                    }
                  },
                  {
                    "@type": "ListItem",
                    "position": 2,
                    "item": {
                      "@type": "Product",
                      "name": "Blusas",
                      "url": "https://cherrydistribuidores.com.mx/categoria/blusas",
                      "image": "https://cherrydistribuidores.com.mx/images/category/Blusa.png",
                      "offers": {
                        "@type": "AggregateOffer",
                        "offerCount": "1",
                        "lowPrice": "0",
                        "priceCurrency": "MXN"
                      }
                    }
                  },
                  {
                    "@type": "ListItem",
                    "position": 3,
                    "item": {
                      "@type": "Product",
                      "name": "Pantalones",
                      "url": "https://cherrydistribuidores.com.mx/categoria/pantalones",
                      "image": "https://cherrydistribuidores.com.mx/images/category/pantalones.png",
                      "offers": {
                        "@type": "AggregateOffer",
                        "offerCount": "1",
                        "lowPrice": "0",
                        "priceCurrency": "MXN"
                      }
                    }
                  },
                  {
                    "@type": "ListItem",
                    "position": 4,
                    "item": {
                      "@type": "Product",
                      "name": "Faldas",
                      "url": "https://cherrydistribuidores.com.mx/categoria/faldas",
                      "image": "https://cherrydistribuidores.com.mx/images/category/falda.png",
                      "offers": {
                        "@type": "AggregateOffer",
                        "offerCount": "1",
                        "lowPrice": "0",
                        "priceCurrency": "MXN"
                      }
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

      {/* Modal de Ofertas - Se abre automáticamente */}
      <OffersModal 
        isOpen={showOffersModal} 
        onClose={() => setShowOffersModal(false)} 
      />
    </>
  );
};

export default HomePage; 
