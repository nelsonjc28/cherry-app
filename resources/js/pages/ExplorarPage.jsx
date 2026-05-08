import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import CherryButton from '../components/CherryButton/CherryButton';
import InfiniteScrollLoader from '../components/InfiniteScrollLoader/InfiniteScrollLoader';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import { getIconPath } from '../utils/assetPaths';
import { applyUserOffersToProducts } from '../api/userOffers';
import api from '../services/api';
import { getProductImageUrl } from '../utils/productImageUtils';
import { isProductNewLikeNuevosPage, sortKeyFechaCompra } from '../utils/productNewRules';
import './ExplorarPage.css';

const ExplorarPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const categories = [
    { id: 'all', name: 'Todos los productos', icon: 'Shopping Cart.svg' },
    { id: 'vestidos', name: 'Vestidos', icon: 'category/vestido-de-novio 1' },
    { id: 'blusas', name: 'Blusas', icon: 'category/blusa 1.svg' },
    { id: 'pantalones', name: 'Pantalones', icon: 'category/pantalones-ajustados 1.svg' },
    { id: 'chaquetas', name: 'Chaquetas', icon: 'category/gabardina 1.svg' },
    { id: 'accesorios', name: 'Accesorios', icon: 'category/vestir 1.svg' }
  ];

  // Cargar productos desde el backend local
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const searchResponse = await api.get('/products/search', {
          params: { q: '' }
        });

        if (searchResponse.data.success && searchResponse.data.data.products) {
          const localProducts = searchResponse.data.data.products;
          
          // Mapear productos al formato esperado
          const mappedProducts = localProducts.map(product => {
            const rawPrice = product.precio1;
            const numericPrice = typeof rawPrice === 'string' 
              ? parseFloat(rawPrice.replace(/[^\d.-]/g, '')) 
              : parseFloat(rawPrice) || 0;
            
            const productColors = product.detalles 
              ? [...new Set(product.detalles.map(d => d.nombreColor).filter(Boolean))] 
              : [];
            
            const productSizes = product.detalles 
              ? [...new Set(product.detalles.map(d => d.detalle).filter(Boolean))] 
              : [];
            
            const isNewProduct = isProductNewLikeNuevosPage(product);
            
            let finalPrice = product.price;
            let originalPrice = product.originalPrice;
            let discountPercentage = product.discount;
            
            if (finalPrice === undefined || finalPrice === null || finalPrice === 0) {
              const hasDiscount = product.opc_promo === 'S' && product.desc_promo > 0;
              const originalDiscountPercentage = hasDiscount ? parseFloat(product.desc_promo) : 0;
              discountPercentage = hasDiscount ? Math.max(0, originalDiscountPercentage - 10) : 0;
              originalPrice = hasDiscount && numericPrice > 0 
                ? (numericPrice / (1 - originalDiscountPercentage / 100)) 
                : null;
              finalPrice = hasDiscount && discountPercentage > 0 && numericPrice > 0 
                ? (numericPrice - (numericPrice * (discountPercentage / 100))) 
                : numericPrice;
            }
            
            return {
              id: product.id_articulo || product.id,
              title: product.descripcion || product.title || 'Sin nombre',
              description: product.descripcion || 'Sin descripción',
              price: finalPrice,
              originalPrice: originalPrice,
              discount: discountPercentage || 0,
              image: getProductImageUrl(product.id_articulo || product.id),
              brand: product.marca || 'Sin marca',
              stock: product.inventario || 0,
              colors: productColors.length > 0 ? productColors : ['black'],
              sizes: productSizes.length > 0 ? productSizes : ['M'],
              isNew: isNewProduct,
              rating: product.rating || 0,
              ratingCount: product.ratingCount || 0,
              category: product.linea || '',
              id_linea: product.id_linea,
              catalogoId: product.catalogoId,
              fechaAlta: product.fecha_alta,
              fecha_compra: product.fecha_compra,
              fechaCompra: product.fecha_compra,
              inventario: product.inventario,
              detalles: product.detalles
            };
          });

          // Aplicar ofertas de usuario
          const productsWithOffers = await applyUserOffersToProducts(mappedProducts);
          setProducts(productsWithOffers);
        } else {
          setProducts([]);
        }
      } catch (error) {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const getFilteredAndSortedProducts = () => {
    let filtered = [...products];

    // Filtrar por categoría
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => {
        const productCategory = product.category?.toLowerCase() || '';
        const productTitle = product.title?.toLowerCase() || '';
        return productCategory.includes(selectedCategory) || productTitle.includes(selectedCategory);
      });
    }

    // Ordenar productos
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'name':
        filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => {
          const tb = sortKeyFechaCompra(b) || new Date(b.fechaAlta || 0).getTime();
          const ta = sortKeyFechaCompra(a) || new Date(a.fechaAlta || 0).getTime();
          return tb - ta;
        });
        break;
    }

    return filtered;
  };

  const handleCategoryClick = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleSortChange = (sortValue) => {
    setSortBy(sortValue);
  };

  const handleFavoriteToggle = (productId) => {
  };

  const filteredProducts = getFilteredAndSortedProducts();

  // Infinite scroll
  const infiniteScroll = useInfiniteScroll(filteredProducts, 20);

  // Reset infinite scroll cuando cambian los productos filtrados
  useEffect(() => {
    infiniteScroll.reset();
  }, [filteredProducts.length]);

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Explorar - Cherry Central</title>
        </Helmet>
        
        <main className="explorar-page">
          <div className="container">
            <div className="explorar-loading">
              <div className="loading-spinner"></div>
              <p>Cargando productos...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Explorar - Cherry Central</title>
        <meta name="description" content="Explora nuestra amplia colección de productos de moda femenina en Cherry Central." />
      </Helmet>

      <main className="explorar-page">
        <div className="container">
          {/* Header */}
          <div className="explorar-header">
            <h1>Explorar Productos</h1>
            <p>Encuentra lo que buscas en nuestra colección</p>
          </div>

          {/* Categories */}
          <div className="explorar-categories">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat.id)}
              >
                {cat.icon && <img src={getIconPath(cat.icon)} alt={cat.name} className="category-icon" />}
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Sort and Results */}
          <div className="explorar-toolbar">
            <div className="results-count">
              <span>{filteredProducts.length} productos encontrados</span>
            </div>
            <div className="sort-options">
              <label>Ordenar por:</label>
              <select value={sortBy} onChange={(e) => handleSortChange(e.target.value)}>
                <option value="newest">Más recientes</option>
                <option value="price-low">Precio: menor a mayor</option>
                <option value="price-high">Precio: mayor a menor</option>
                <option value="name">Nombre A-Z</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="explorar-empty">
              <div className="empty-icon">
                <img src={getIconPath('Search.svg')} alt="Sin productos" />
              </div>
              <h3>No se encontraron productos</h3>
              <p>Intenta seleccionar otra categoría</p>
              <CherryButton 
                variant="outline" 
                size="medium"
                onClick={() => setSelectedCategory('all')}
              >
                Ver todos los productos
              </CherryButton>
            </div>
          ) : (
            <>
              <div className="explorar-grid">
                {infiniteScroll.displayedItems.map((product, index) => (
                  <ProductCard
                    key={product.id || `product-${index}`}
                    product={product}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                ))}
              </div>

              {/* Infinite Scroll Loader */}
              <InfiniteScrollLoader
                isLoading={infiniteScroll.isLoading}
                hasMore={infiniteScroll.hasMore}
                observerTarget={infiniteScroll.observerTarget}
              />
            </>
          )}
        </div>
      </main>
    </>
  );
};

export default ExplorarPage;
