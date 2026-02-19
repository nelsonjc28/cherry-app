import { useState, useEffect, useRef } from 'react';
import HorizontalProductCarousel from '../../HorizontalProductCarousel/HorizontalProductCarousel';
import api from '../../../services/api';
import { getProductImageUrl } from '../../../utils/productImageUtils';
import { applyUserOffersToProducts } from '../../../api/userOffers';
import './FeaturedProducts.css';

const FeaturedProducts = ({ 
  title = "Productos diseñados para reflejar tu estilo y personalidad.",
  products = [],
  viewAllLink = "/productos",
  viewAllText = "Ver Más",
  showViewAllButton = true,
  className = "",
  useApi = true
}) => {
  const [apiProducts, setApiProducts] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState(null);
  const isLoadingRef = useRef(false); // Ref para evitar múltiples llamadas simultáneas

  // Función helper para mapear productos
  const mapProduct = (product) => {
    const productId = product.id_articulo || product.id;
    const imageUrl = productId ? getProductImageUrl(productId, 1) : '';
    
    const productColors = product.colors || [];
    const availableColors = productColors.length > 0 ? productColors : [];
    
    const productSizes = product.sizes || [];
    const availableSizes = productSizes.length > 0 ? productSizes : [];
    
    const isNewProduct = product.isNew !== undefined ? product.isNew : 
      (product.opc_nuevo === 'S' || 
       (product.fecha_alta && new Date(product.fecha_alta) > new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)));
    
    return {
      id: product.id,
      id_articulo: productId,
      title: product.title || product.description || 'Sin nombre',
      description: product.description || 'Sin descripción',
      price: product.price || 0,
      originalPrice: product.originalPrice,
      discount: product.discount || 0,
      image: imageUrl,
      brand: product.brand || 'Sin marca',
      stock: product.stock || product.inventario || 0,
      inventario: product.inventario || product.stock || 0,
      colors: availableColors,
      colores: productColors,
      sizes: availableSizes,
      tallas: productSizes,
      isNew: isNewProduct,
      rating: product.rating || 0,
      ratingCount: product.ratingCount || 0,
      id_linea: product.id_linea,
      category_id: product.category_id || product.id_linea,
      catalogoId: product.catalogoId,
      fecha_alta: product.fecha_alta,
      fechaAlta: product.fecha_alta,
      opcNuevo: product.opc_nuevo,
      opcPromo: product.opc_promo,
      descPromo: product.desc_promo,
      codigo: productId,
      detalles: product.detalles || [],
      linea: product.id_linea,
      precio1: product.price || 0
    };
  };

  // Cargar productos desde API cuando useApi es true
  useEffect(() => {
    // Solo ejecutar si useApi es true y no hay productos pasados como props
    if (!useApi || (products && products.length > 0)) {
      return;
    }

    // Evitar múltiples llamadas simultáneas
    if (isLoadingRef.current) {
      return;
    }

    const loadNewProducts = async () => {
      try {
        isLoadingRef.current = true;
        setLocalLoading(true);
        setError(null);
        
        // Obtener productos nuevos (últimos 45 días) desde el backend local
        const response = await api.get('/products/new', {
          params: { limit: 4 }
        });
        
        if (response.data.success && response.data.data) {
          // Mapear productos al formato esperado
          const mappedProducts = response.data.data.map(mapProduct);
          
          // Aplicar ofertas de usuario
          const productsWithOffers = await applyUserOffersToProducts(mappedProducts);
          setApiProducts(productsWithOffers);
        } else {
          setApiProducts([]);
        }
      } catch (err) {
        setError(err.message || 'Error al cargar productos');
        setApiProducts([]);
      } finally {
        setLocalLoading(false);
        isLoadingRef.current = false;
      }
    };

    loadNewProducts();
  }, [useApi]); // Solo ejecutar cuando useApi cambia
  
  // Actualizar productos cuando se pasan como props y no estamos usando API
  useEffect(() => {
    if (!useApi && products && products.length > 0) {
      const mappedProducts = products.map(mapProduct);
      applyUserOffersToProducts(mappedProducts).then(productsWithOffers => {
        setApiProducts(productsWithOffers);
      });
    } else if (!useApi && (!products || products.length === 0)) {
      setApiProducts([]);
    }
  }, [products, useApi]); // Solo cuando products cambia Y no estamos usando API

  const handleFavoriteToggle = (productId) => {
    // Here you would typically update your favorites state/API
  };

  if (localLoading) {
    return (
      <section className={`featured-products ${className}`}>
        <div className="container">
          <div className="loading-spinner">
            <p>Cargando productos nuevos...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={`featured-products ${className}`}>
        <div className="container">
          <div className="error-message">
            <p>Error al cargar productos: {error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`featured-products ${className}`}>
      <div className="container">
        <HorizontalProductCarousel
          title={title}
          viewAllLink={viewAllLink}
          viewAllText={viewAllText}
          products={apiProducts}
          onFavoriteToggle={handleFavoriteToggle}
          showTitle={true}
          showViewAll={showViewAllButton}
          showFavoriteButton={false}
          variant="bestseller"
          useCatalogCard={true}
        />
      </div>
    </section>
  );
};

export default FeaturedProducts; 
