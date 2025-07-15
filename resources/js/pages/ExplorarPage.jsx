import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import CherryButton from '../components/CherryButton/CherryButton';
import { getIconPath } from '../utils/assetPaths';
import { getAllProducts, mapApiProductToAppProduct } from '../api/cherryApi';
import './ExplorarPage.css';

const ExplorarPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const categories = [
    { id: 'all', name: 'Todos los productos', icon: 'Shopping Cart.svg' },
    { id: 'vestidos', name: 'Vestidos', icon: 'category/vestido-de-novio 1.svg' },
    { id: 'blusas', name: 'Blusas', icon: 'category/blusa 1.svg' },
    { id: 'pantalones', name: 'Pantalones', icon: 'category/pantalones-ajustados 1.svg' },
    { id: 'chaquetas', name: 'Chaquetas', icon: 'category/gabardina 1.svg' },
    { id: 'accesorios', name: 'Accesorios', icon: 'category/vestir 1.svg' }
  ];

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const allProducts = await getAllProducts();
        const mappedProducts = allProducts.map(mapApiProductToAppProduct);
        setProducts(mappedProducts);
      } catch (error) {
        console.error('Error loading products:', error);
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
        return productCategory.includes(selectedCategory);
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
        filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
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
              <p>Explorando productos...</p>
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
        <meta name="description" content="Explora nuestra amplia colección de moda femenina. Encuentra vestidos, blusas, pantalones y más en Cherry Central." />
      </Helmet>

      <main className="explorar-page">
        <div className="container">
          {/* Header */}
          <div className="explorar-header">
            <h1>Explorar Productos</h1>
            <p>Descubre nuestra amplia colección de moda femenina</p>
          </div>

          {/* Filtros de categoría */}
          <div className="categorias-filtro">
            <div className="categorias-grid">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`categoria-btn ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(category.id)}
                >
                  <div className="categoria-icon">
                    <img src={getIconPath(category.icon)} alt={category.name} />
                  </div>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Controles de ordenamiento */}
          <div className="explorar-controls">
            <div className="results-info">
              <span>{filteredProducts.length} productos encontrados</span>
            </div>
            
            <div className="sort-controls">
              <label htmlFor="sort-select">Ordenar por:</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="sort-select"
              >
                <option value="newest">Más recientes</option>
                <option value="price-low">Precio: menor a mayor</option>
                <option value="price-high">Precio: mayor a menor</option>
                <option value="name">Nombre A-Z</option>
              </select>
            </div>
          </div>

          {/* Grid de productos */}
          <div className="explorar-content">
            {filteredProducts.length === 0 ? (
              <div className="explorar-empty">
                <div className="empty-icon">
                  <img src={getIconPath('Search.svg')} alt="Sin productos" />
                </div>
                <h2>No se encontraron productos</h2>
                <p>
                  {selectedCategory === 'all' 
                    ? 'No hay productos disponibles en este momento'
                    : `No hay productos en la categoría "${categories.find(c => c.id === selectedCategory)?.name}"`
                  }
                </p>
                <CherryButton 
                  variant="outline" 
                  size="medium"
                  onClick={() => setSelectedCategory('all')}
                >
                  Ver todos los productos
                </CherryButton>
              </div>
            ) : (
              <div className="explorar-products-grid">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onFavoriteToggle={handleFavoriteToggle}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sección de información */}
          <div className="explorar-info">
            <div className="info-section">
              <h3>¿Cómo explorar productos?</h3>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Filter.svg')} alt="Filtros" />
                  </div>
                  <h4>Usa los filtros</h4>
                  <p>Selecciona una categoría para ver productos específicos</p>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Search.svg')} alt="Búsqueda" />
                  </div>
                  <h4>Busca productos</h4>
                  <p>Utiliza la barra de búsqueda para encontrar productos específicos</p>
                </div>
                
                <div className="info-item">
                  <div className="info-icon">
                    <img src={getIconPath('Shopping Cart.svg')} alt="Carrito" />
                  </div>
                  <h4>Agrega al carrito</h4>
                  <p>Haz clic en "Agregar al carrito" para comprar</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default ExplorarPage; 