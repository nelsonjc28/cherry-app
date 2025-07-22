import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAllProducts, generateS3ImageUrl } from '../api/cherryApi';
import ProductGrid from '../components/ProductGrid/ProductGrid';
import './BuscarPage.css';

const BuscarPage = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalResults, setTotalResults] = useState(0);

  // Obtener el término de búsqueda desde la URL
  const searchTerm = searchParams.get('q') || '';

  useEffect(() => {
    const searchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!searchTerm.trim()) {
          setProducts([]);
          setTotalResults(0);
          setLoading(false);
          return;
        }

        const allProducts = await getAllProducts();
        
        // Filtrar productos por término de búsqueda
        const filteredProducts = allProducts.filter(product => {
          const searchLower = searchTerm.toLowerCase();
          const productName = product.descripcion?.toLowerCase() || '';
          const productBrand = product.marca?.toLowerCase() || '';
          const productCategory = product.linea?.descripcion?.toLowerCase() || '';
          
          return productName.includes(searchLower) || 
                 productBrand.includes(searchLower) || 
                 productCategory.includes(searchLower);
        });

        // Mapear productos al formato de la app
        const mappedProducts = filteredProducts.map(product => {
          const image = generateS3ImageUrl(product.id_articulo);
          
          const originalPrice = product.precio1 || 0;
          const discount = product.desc_promo || 0;
          const finalPrice = discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;
          
          const colors = [...new Set(product.detalles?.map(d => d.nombreColor) || [])];
          
          return {
            id: product.id_articulo,
            title: product.descripcion,
            image: image,
            price: finalPrice,
            originalPrice: discount > 0 ? originalPrice : null,
            discount: discount > 0 ? discount : null,
            rating: 5,
            description: product.descripcion,
            brand: product.marca,
            category: product.linea?.descripcion || 'Sin categoría',
            colors: colors,
            stock: product.inventario || 0,
            isActive: product.activo === 1,
            isNew: product.opc_nuevo === 'S',
            isPromo: product.opc_promo === 'S'
          };
        });

        setProducts(mappedProducts);
        setTotalResults(mappedProducts.length);
      } catch (err) {
        setError('Error al buscar productos');

      } finally {
        setLoading(false);
      }
    };

    searchProducts();
  }, [searchTerm]);

  if (loading) {
    return (
      <div className="buscar-page">
        <div className="container">
          <div className="loading-container">
            <svg className="loading-spinner-svg" width="40" height="40" viewBox="0 0 40 40">
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="#f3f3f3"
                strokeWidth="4"
              />
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="4"
                strokeDasharray="113"
                strokeDashoffset="113"
                strokeLinecap="round"
                className="spinner-circle"
              />
            </svg>
            <p>Buscando productos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="buscar-page">
        <div className="container">
          <div className="error-container">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Intentar de nuevo</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="buscar-page">
      <div className="container">
        {/* Header Section */}
        <div className="buscar-page__header">
          <div className="buscar-page__title-section">
            <h1 className="buscar-page__title">
              {searchTerm ? `Resultados para "${searchTerm}"` : 'Buscar productos'}
            </h1>
            <p className="buscar-page__description">
              {searchTerm 
                ? `Encontramos ${totalResults} productos que coinciden con tu búsqueda.`
                : 'Busca entre nuestra amplia selección de productos.'
              }
            </p>
            <div className="buscar-page__results">
              <span className="buscar-page__results-count">
                {totalResults} productos encontrados
              </span>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="buscar-page__content">
            <ProductGrid products={products} />
          </div>
        ) : searchTerm ? (
          <div className="buscar-page__empty">
            <h3>No se encontraron productos</h3>
            <p>No encontramos productos que coincidan con "{searchTerm}".</p>
            <p>Intenta con otros términos de búsqueda.</p>
          </div>
        ) : (
          <div className="buscar-page__empty">
            <h3>Busca productos</h3>
            <p>Ingresa un término de búsqueda para encontrar productos.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuscarPage; 