import React, { useState, useEffect } from 'react';
import useMultipleFavorites from '../hooks/useMultipleFavorites';

/**
 * Ejemplo de cómo usar el hook useMultipleFavorites
 * para verificar favoritos de múltiples productos de una sola vez
 */
const ProductListWithFavorites = ({ products = [] }) => {
  const [productIds, setProductIds] = useState([]);
  
  // Extraer IDs de productos
  useEffect(() => {
    const ids = products.map(product => product.id_articulo || product.id);
    setProductIds(ids);
  }, [products]);
  
  // Verificar favoritos de todos los productos de una vez
  const { favoritesMap, loading, isFavorited } = useMultipleFavorites(productIds);
  
  return (
    <div className="product-list">
      <h2>Productos con Favoritos Optimizados</h2>
      
      {loading && <p>Cargando favoritos...</p>}
      
      <div className="products-grid">
        {products.map(product => {
          const productId = product.id_articulo || product.id;
          const isFav = isFavorited(productId);
          
          return (
            <div key={productId} className="product-card">
              <h3>{product.descripcion || product.title}</h3>
              <p>Precio: ${product.precio1 || product.price}</p>
              <div className="favorite-status">
                {isFav ? '❤️ Favorito' : '🤍 No favorito'}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="debug-info">
        <h3>Debug Info:</h3>
        <p>Productos cargados: {products.length}</p>
        <p>Favoritos verificados: {Object.keys(favoritesMap).length}</p>
        <pre>{JSON.stringify(favoritesMap, null, 2)}</pre>
      </div>
    </div>
  );
};

export default ProductListWithFavorites;













