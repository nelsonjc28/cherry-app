import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFavoritesContext } from '../../../contexts/FavoritesContext';
import FavoriteButton from '../../FavoriteButton/FavoriteButton';
import { getProductImageUrl } from '../../../utils/productImageUtils';
import './NewProductsSection.css';

const NewProductsSection = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isFavorited } = useFavoritesContext();

  useEffect(() => {
    loadNewProducts();
  }, []);

  const loadNewProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Hacer petición directa a la API externa
      const response = await fetch('https://cherryapi.estrategiadmgs.com.mx/cherryApi/');
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !Array.isArray(data)) {
        throw new Error('Formato de respuesta inválido');
      }

      // Filtrar solo productos con opc_nuevo = 'S'
      const newProducts = data.filter(product => product.opc_nuevo === 'S');

      // Mapear productos nuevos
      const mappedProducts = newProducts.map(product => {
        // Extraer precio y convertirlo a número
        const rawPrice = product.precio1;
        const numericPrice = typeof rawPrice === 'string' ? parseFloat(rawPrice.replace(/[^\d.-]/g, '')) : parseFloat(rawPrice) || 0;
        
        // Extraer colores si existen - usar detalles como en ProductPage
        const productColors = product.detalles ? 
          [...new Set(product.detalles.map(d => d.nombreColor).filter(Boolean))] : 
          [];
        const availableColors = productColors.length > 0 ? productColors : ['black']; // Color por defecto
        
        // Calcular descuento si existe
        const hasDiscount = product.opc_promo === 'S' && product.desc_promo > 0;
        const discountPercentage = hasDiscount ? product.desc_promo : 0;
        const originalPrice = hasDiscount ? (numericPrice / (1 - discountPercentage / 100)) : numericPrice;
        
        return {
          id: product.id_articulo,
          title: product.descripcion || 'Sin nombre',
          description: product.descripcion || 'Sin descripción',
          price: numericPrice,
          originalPrice: originalPrice,
          discount: discountPercentage,
          image: getProductImageUrl(product.id_articulo),
          brand: product.marca || 'Sin marca',
          category: product.linea?.nombre_linea || 'Sin categoría',
          stock: product.inventario || 0,
          colors: availableColors,
          colores: productColors, // Mantener colores originales para ExternalProductCard
          isNew: true, // Todos son nuevos por definición
          rating: 0, // Se actualizará con la consulta a la BD
          ratingCount: 0, // Se actualizará con la consulta a la BD
          linea: product.linea,
          // Propiedades adicionales de la API externa
          fechaAlta: product.fecha_alta,
          fechaAct: product.fechaAct,
          temporada: product.temporada,
          opcNuevo: product.opc_nuevo,
          opcPromo: product.opc_promo,
          descPromo: product.desc_promo
        };
      });



      // Obtener calificaciones reales de la base de datos
      if (mappedProducts.length > 0) {
        try {
          const productIds = mappedProducts.map(product => product.id);
          
          const ratingsResponse = await fetch('/api/products/ratings', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ product_ids: productIds })
          });
          
          if (ratingsResponse.ok) {
            const ratingsData = await ratingsResponse.json();
            if (ratingsData.success) {
              const ratings = ratingsData.data.ratings;
              
              // Actualizar productos con calificaciones reales
              const productsWithRatings = mappedProducts.map(product => ({
                ...product,
                rating: ratings[product.id]?.average || 0,
                ratingCount: ratings[product.id]?.count || 0
              }));
              
              setProducts(productsWithRatings);
            } else {
              setProducts(mappedProducts);
            }
          } else {
            setProducts(mappedProducts);
          }
        } catch (error) {
          console.error('Error al obtener calificaciones:', error);
          setProducts(mappedProducts);
        }
      } else {
        setProducts([]);
      }

    } catch (error) {
      console.error('Error al cargar productos nuevos:', error);
      setError('Error al cargar productos nuevos');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = (productId) => {
    // Implement favorite functionality here
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg key={`full-${i}`} className="star full" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    }

    if (hasHalfStar) {
      stars.push(
        <svg key="half" className="star half" viewBox="0 0 24 24">
          <defs>
            <linearGradient id="halfStar">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#e5e7eb" />
            </linearGradient>
          </defs>
          <path fill="url(#halfStar)" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg key={`empty-${i}`} className="star empty" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    }

    return stars;
  };

  if (loading) {
    return (
      <section className="new-products-section">
        <div className="container">
          <div className="section-header">
            <h2>Productos Nuevos</h2>
            <p>Descubre las últimas novedades</p>
          </div>
          <div className="loading-container">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p>Cargando productos nuevos...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="new-products-section">
        <div className="container">
          <div className="section-header">
            <h2>Productos Nuevos</h2>
            <p>Descubre las últimas novedades</p>
          </div>
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button onClick={loadNewProducts} className="btn btn-primary">
              Intentar de nuevo
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className="new-products-section">
        <div className="container">
          <div className="section-header">
            <h2>Productos Nuevos</h2>
            <p>Descubre las últimas novedades</p>
          </div>
          <div className="empty-container">
            <p>No hay productos nuevos disponibles en este momento.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="new-products-section">
      <div className="container">
        <div className="section-header">
          <h2>Productos Nuevos</h2>
          <p>Descubre las últimas novedades</p>
        </div>
        
        <div className="products-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-image-container">
                <Link to={`/producto/${product.id}`} className="product-image-link">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="product-image"
                    onError={(e) => {
                      e.target.src = '/images/placeholder-product.jpg';
                    }}
                  />
                </Link>
                
                {/* Badge de Nuevo */}
                {product.isNew && (
                  <div className="product-badge new">
                    <span>Nuevo</span>
                  </div>
                )}
                
                {/* Badge de Descuento */}
                {product.discount > 0 && (
                  <div className="product-badge discount">
                    <span>-{product.discount}%</span>
                  </div>
                )}
                
                {/* Botón de Favoritos */}
                <div className="product-actions">
                  <FavoriteButton
                    productId={product.id}
                    productTitle={product.title}
                    productImage={product.image}
                    productPrice={product.price}
                    onToggle={handleFavoriteToggle}
                    size="small"
                    className="favorite-btn"
                  />
                </div>
              </div>
              
              <div className="product-info">
                <div className="product-category">
                  <span>{product.category}</span>
                </div>
                
                <h3 className="product-title">
                  <Link to={`/producto/${product.id}`}>
                    {product.title}
                  </Link>
                </h3>
                
                <div className="product-rating">
                  <div className="stars">
                    {renderStars(product.rating)}
                  </div>
                  <span className="rating-count">({product.ratingCount})</span>
                </div>
                
                <div className="product-price">
                  {product.discount > 0 ? (
                    <>
                      <span className="current-price">{formatPrice(product.price)}</span>
                      <span className="original-price">{formatPrice(product.originalPrice)}</span>
                    </>
                  ) : (
                    <span className="current-price">{formatPrice(product.price)}</span>
                  )}
                </div>
                
                <div className="product-colors">
                  {product.colors.slice(0, 3).map((color, index) => (
                    <div
                      key={index}
                      className="color-option"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  {product.colors.length > 3 && (
                    <span className="more-colors">+{product.colors.length - 3}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="section-footer">
          <Link to="/nuevos" className="btn btn-outline-primary">
            Ver todos los productos nuevos
          </Link>
        </div>
      </div>
    </section>
  );
};

export default NewProductsSection;
