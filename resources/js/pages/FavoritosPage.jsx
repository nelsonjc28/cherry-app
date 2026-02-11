import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useFavoritesContext } from '../contexts/FavoritesContext';
import api from '../services/api';
import './FavoritosPage.css';

const FavoritosPage = () => {
  const { 
    favorites, 
    loading, 
    initialized,
    loadFavorites,
    isFavorited,
    toggleFavorite
  } = useFavoritesContext();
  
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Cargar favoritos desde el backend
  useEffect(() => {
    const loadFavoriteProducts = async () => {
      if (!initialized) {
        return;
      }

      setProductsLoading(true);
      try {
        // Obtener favoritos directamente del endpoint del backend que incluye información completa del producto
        const response = await api.get('/favorites');
        
        if (response.data.success && response.data.favorites) {
          const favoritesData = response.data.favorites || [];
          
          // Mapear los favoritos con información completa del producto desde el backend
          const mappedProducts = favoritesData
            .filter(fav => fav.product !== null) // Filtrar favoritos sin producto
            .map(fav => {
              const product = fav.product;
              return {
                id: product.id,
                id_articulo: product.id || product.id_articulo,
                descripcion: product.descripcion || product.title || `Producto ${product.id}`,
                title: product.descripcion || product.title || `Producto ${product.id}`,
                imagen: product.image || product.imagen,
                image: product.image || product.imagen,
                precio1: parseFloat(product.precio1 || product.price || 0),
                price: parseFloat(product.precio1 || product.price || 0),
                originalPrice: product.desc_promo && product.desc_promo > 0 
                  ? parseFloat(product.precio1 || product.price || 0) 
                  : null,
                discount: product.desc_promo || product.discount || 0,
                marca: product.marca || product.brand,
                brand: product.marca || product.brand,
                sku: product.sku,
                ean: product.ean,
                stock: product.stock || product.inventario || 0,
                inventario: product.stock || product.inventario || 0
              };
            });
          
          setFavoriteProducts(mappedProducts);
        } else {
          setFavoriteProducts([]);
        }
      } catch (error) {
        setFavoriteProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    if (initialized) {
      loadFavoriteProducts();
    }
  }, [initialized, favorites]);

  const handleRemoveFavorite = async (productId) => {
    try {
      // Encontrar el producto para obtener sus datos
      const product = favoriteProducts.find(p => (p.id_articulo === productId) || (p.id === productId));
      
      // Usar el toggle del contexto para remover el favorito
      await toggleFavorite(productId, {
        product_id: productId,
        product_title: product?.descripcion || product?.title || '',
        product_image: product?.imagen || product?.image || '',
        product_price: product?.precio1 || product?.price || 0
      });
      
      // Actualizar el estado local inmediatamente
      setFavoriteProducts(prev => prev.filter(product => (product.id_articulo !== productId) && (product.id !== productId)));
      
      if (window.showToast) {
        window.showToast('Producto removido de favoritos', 'success');
      }
      
      // Scroll hacia arriba después de remover
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      // No mostrar mensaje de error para favoritos
    }
  };

  const handleProductClick = (productId) => {
    if (productId) {
      window.location.href = `/producto/${productId}`;
    }
  };

  if (loading || !initialized || productsLoading) {
    return (
      <div className="favoritos-page">
        <div className="favoritos-page__loading">
          <div className="loading-spinner"></div>
          <h2>Cargando tus favoritos</h2>
          <p>Estamos obteniendo tus productos favoritos...</p>
        </div>
      </div>
    );
  }


  return (
    <>
      <Helmet>
        <title>Mis Favoritos - Cherry</title>
        <meta name="description" content="Tus productos favoritos guardados" />
      </Helmet>

      <div className="favoritos-page">
        <div className="favoritos-page__header">
          <div className="favoritos-page__header-content">
            <div>
              <h1>Mis Favoritos</h1>
              <p>{favoriteProducts.length} {favoriteProducts.length === 1 ? 'producto' : 'productos'} guardado{favoriteProducts.length !== 1 ? 's' : ''}</p>
            </div>
            <button 
              className="btn btn-outline-primary"
              onClick={loadFavorites}
              disabled={loading}
              title="Recargar favoritos"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M20.24 7.76a6 6 0 0 0-8.49-8.49L5 10.5"></path>
                <path d="M3.76 16.24a6 6 0 0 0 8.49 8.49L19 13.5"></path>
              </svg>
              Recargar
            </button>
          </div>
        </div>

        {favoriteProducts.length === 0 ? (
          <div className="favoritos-page__empty">
            <div className="favoritos-page__empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </div>
            <h3>No tienes favoritos aún</h3>
            <p>Agrega productos a tus favoritos para verlos aquí</p>
            <button onClick={() => window.location.href = '/catalogo'}>
              Explorar Productos
            </button>
          </div>
        ) : (
          <div className="favoritos-page__grid">
            {favoriteProducts.map((product) => (
              <div key={product.id_articulo} className="favoritos-page__item">
                <div className="favoritos-page__item-image" onClick={() => handleProductClick(product.id_articulo || product.id)}>
                  <img 
                    src={product.image || product.imagen || `/images/placeholder-product.jpg`} 
                    alt={product.descripcion || product.title || 'Producto'}
                    onError={(e) => {
                      e.target.src = '/images/placeholder-product.jpg';
                    }}
                  />
                  <div className="favoritos-page__item-overlay">
                    <span>Ver Producto</span>
                  </div>
                </div>
                
                <div className="favoritos-page__item-content">
                  <h3 onClick={() => handleProductClick(product.id_articulo || product.id)}>
                    {product.descripcion || product.title || `Producto ${product.id_articulo || product.id}`}
                  </h3>
                  
                  {(product.precio1 || product.price) && (
                    <div className="favoritos-page__item-price">
                      ${(product.precio1 || product.price).toLocaleString()}
                    </div>
                  )}
                  
                  <div className="favoritos-page__item-actions">
                    <button 
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleRemoveFavorite(product.id_articulo)}
                      title="Remover de favoritos"
                    >
                      ❌ Remover
                    </button>
                    
                    <button 
                      className="favoritos-page__item-view"
                      onClick={() => handleProductClick(product.id_articulo)}
                    >
                      Ver Producto
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default FavoritosPage; 
