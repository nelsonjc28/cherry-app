import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/Pagination/Pagination';
import './Favorites.css';
import CherryButton from '../../components/CherryButton/CherryButton';
import useUserStore from '../../store/userStore';
import { useFavoritesContext } from '../../contexts/FavoritesContext';
import { getIconPath } from '../../utils/assetPaths';
import { getExternalPromoProducts, generateS3ImageUrl } from '../../api/cherryApi';
import api from '../../services/api';

const Favorites = () => {
  const { user } = useUserStore();
  const { favorites: favoritesContext, loadFavorites, initialized, toggleFavorite } = useFavoritesContext();
  const navigate = useNavigate();
  
  // State for favorites and pagination
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [totalFavorites, setTotalFavorites] = useState(0);
  const itemsPerPage = 6;

  // Calculate pagination
  const totalPages = Math.ceil(totalFavorites / itemsPerPage);

  // Fetch favorites from API
  const fetchFavorites = async (page = 1) => {
    if (!user) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Usar el contexto de favoritos
      if (favoritesContext && favoritesContext.size > 0) {
        const favoriteIds = Array.from(favoritesContext);
        
        try {
          // Obtener todos los productos de la API externa directamente
          const response = await fetch('https://cherryapi.estrategiadmgs.com.mx/cherryApi/');
          const allProducts = await response.json();
          
          if (Array.isArray(allProducts)) {
            // Filtrar solo los productos que están en favoritos
            const favoriteProductsData = allProducts.filter(product => 
              favoriteIds.includes(product.id_articulo)
            );
            
            // Mapear a el formato esperado por la página
            const favorites = favoriteProductsData.map(product => ({
              id: product.id_articulo,
              id_articulo: product.id_articulo, // Asegurar que esté disponible
              title: product.descripcion || product.title || `Producto ${product.id_articulo}`,
              image: product.imagen || `https://cherry-fotos.s3.amazonaws.com/shopify/${product.id_articulo}/${product.id_articulo}_1.jpg`,
              price: parseFloat(product.precio1) || 0,
              originalPrice: product.originalPrice,
              discount: product.discount,
              favoriteId: product.id_articulo
            }));
            setFavoriteProducts(favorites);
            setTotalFavorites(favorites.length);
            setCurrentPage(page);
          } else {
            throw new Error('Error: allProducts no es un array');
          }
        } catch (apiError) {
          console.error('❌ Error cargando datos de productos:', apiError);
          // Fallback: crear productos básicos
          const favorites = favoriteIds.map(id => ({
            id: id,
            title: `Producto ${id}`,
            image: `https://cherry-fotos.s3.amazonaws.com/shopify/${id}/${id}_1.jpg`,
            price: 0,
            favoriteId: id
          }));
          
          console.log('🔄 Usando fallback:', favorites);
          setFavoriteProducts(favorites);
          setTotalFavorites(favorites.length);
          setCurrentPage(page);
        }
      } else {
        console.log('❌ No hay favoritos en el contexto');
        setFavoriteProducts([]);
        setTotalFavorites(0);
        setCurrentPage(page);
      }
    } catch (err) {
      console.error('❌ Error cargando favoritos:', err);
      setError('Error al cargar favoritos');
    } finally {
      setLoading(false);
    }
  };

  // Load favorites when component mounts or user changes
  useEffect(() => {
    if (user && initialized) {
      fetchFavorites(1);
    }
  }, [user, initialized]);

  // Sync with favorites context when it changes
  useEffect(() => {
    if (initialized && favoritesContext) {
      // Solo limpiar si no hay favoritos en el contexto
      if (favoritesContext.size === 0) {
        setFavoriteProducts([]);
        setTotalFavorites(0);
        setLoading(false);
      }
      // No recargar automáticamente cuando hay favoritos para evitar conflictos
    }
  }, [favoritesContext, initialized]);

  // Handle favorite toggle callback
  const handleFavoriteToggle = async (productId) => {
    try {
      // Encontrar el producto para obtener sus datos
      const product = favoriteProducts.find(p => p.id === productId || p.favoriteId === productId || p.id_articulo === productId);
      
      // Usar el contexto para remover el favorito
      await toggleFavorite(productId, {
        product_id: productId,
        product_title: product?.title || '',
        product_image: product?.image || '',
        product_price: product?.price || 0
      });
      
      // Remove from selected items if selected
      setSelectedItems(prev => {
        const newSelected = new Set(prev);
        newSelected.delete(productId);
        return newSelected;
      });
      
      // Actualizar el estado local inmediatamente sin recargar desde API
      setFavoriteProducts(prev => prev.filter(p => p.id !== productId && p.favoriteId !== productId && p.id_articulo !== productId));
      setTotalFavorites(prev => prev - 1);
      
      // Scroll hacia arriba después de remover
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error removiendo favorito:', err);
    }
  };

  // Handle page change
  const handlePageChange = (page) => {
    fetchFavorites(page);
    
    // Scroll to top of section when page changes
    const section = document.querySelector('.favorites-page');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle select all checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select all current page items
      const newSelected = new Set(selectedItems);
      favoriteProducts.forEach(product => newSelected.add(product.id));
      setSelectedItems(newSelected);
    } else {
      // Deselect all current page items
      const newSelected = new Set(selectedItems);
      favoriteProducts.forEach(product => newSelected.delete(product.id));
      setSelectedItems(newSelected);
    }
  };

  // Handle individual item selection
  const handleItemSelect = (productId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedItems(newSelected);
  };

  // Handle eliminate selected items
  const handleEliminate = async () => {
    if (selectedItems.size > 0) {
      try {
        // Remove all selected items from favorites using context
        const promises = Array.from(selectedItems).map(productId => 
          toggleFavorite(productId, {
            product_id: productId,
            product_title: '',
            product_image: '',
            product_price: 0
          })
        );
        
        await Promise.all(promises);
        
        // Clear selected items
        setSelectedItems(new Set());
        
        // Actualizar el estado local inmediatamente sin recargar desde API
        setFavoriteProducts(prev => prev.filter(p => !selectedItems.has(p.id) && !selectedItems.has(p.favoriteId) && !selectedItems.has(p.id_articulo)));
        setTotalFavorites(prev => prev - selectedItems.size);
        
        // Scroll hacia arriba después de remover múltiples
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        console.error('Error removiendo productos seleccionados:', err);
        if (window.showToast) {
          window.showToast('Error al remover productos seleccionados', 'error');
        }
      }
    }
  };

  // Check if all current page items are selected
  const allCurrentPageSelected = favoriteProducts.length > 0 &&
    favoriteProducts.every(product => selectedItems.has(product.id));

  // Navigate to product detail
  const handleProductClick = (productId) => {
    navigate(`/producto/${productId}`);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="favorites-page">
        <div className="favorites-page__header">
          <h1 className="favorites-page__title">Favoritos</h1>
        </div>
        <div className="favorites-page__loading">
          <p>Cargando favoritos...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="favorites-page">
        <div className="favorites-page__header">
          <h1 className="favorites-page__title">Favoritos</h1>
        </div>
        <div className="favorites-page__error">
          <p>{error}</p>
          <CherryButton onClick={() => fetchFavorites(1)} variant="outline">
            Reintentar
          </CherryButton>
        </div>
      </div>
    );
  }

  // Show empty state
  if (favoriteProducts.length === 0) {
    return (
      <div className="favorites-page">
        <div className="favorites-page__header">
          <h1 className="favorites-page__title">Favoritos</h1>
        </div>
        <div className="favorites-page__empty">
          <p>No tienes productos favoritos aún.</p>
          <p>¡Agrega productos a tus favoritos para verlos aquí!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      {/* Header */}
      <div className="favorites-page__header">
        <h1 className="favorites-page__title">Favoritos</h1>

        <div className="favorites-page__sort">
          <label htmlFor="favorites-sort" className="favorites-page__sort-label">
            Ordenar por:
          </label>
          <select
            id="favorites-sort"
            className="favorites-page__sort-select"
            defaultValue="más recientes"
          >
            <option value="más recientes">más recientes</option>
            <option value="precio-menor">Precio: menor a mayor</option>
            <option value="precio-mayor">Precio: mayor a menor</option>
            <option value="nombre-az">Nombre: A-Z</option>
            <option value="nombre-za">Nombre: Z-A</option>
          </select>
        </div>
      </div>

      {/* Controls */}
      <div className="favorites-page__controls">
        <div className="favorites-page__select-all">
          <label className="favorites-page__checkbox-label">
            <input
              type="checkbox"
              checked={allCurrentPageSelected}
              onChange={handleSelectAll}
              className="favorites-page__checkbox"
            />
            <span className="favorites-page__checkbox-text">
              Seleccionar todo ({totalFavorites} ítems)
            </span>
          </label>
        </div>

        <CherryButton
          variant="outline"
          size="small"
          className="favorites-page__btn"
          onClick={handleEliminate}
          disabled={selectedItems.size === 0}
          icon={
            <img src={getIconPath('Trash.svg')} alt="Eliminar" style={{ width: 12, height: 14 }} />
          }
          iconPosition="left"
        >
          <span className="favorites-page__btn-text">
            Eliminar {selectedItems.size > 0 ? `(${selectedItems.size})` : ''}
          </span>
        </CherryButton>
      </div>

      {/* Products Grid */}
      <div className="favorites-page__products">
        <div className="favorites-page__products-grid">
          {favoriteProducts.map((product) => (
            <div key={product.id} className="favorites-page__product-card">
              <div className="favorites-page__product-checkbox">
                <input
                  type="checkbox"
                  checked={selectedItems.has(product.id)}
                  onChange={() => handleItemSelect(product.id)}
                  className="favorites-page__checkbox"
                />
              </div>
              
              <div 
                className="favorites-page__product-image"
                onClick={() => handleProductClick(product.id)}
                style={{ cursor: 'pointer' }}
              >
                <img 
                  src={generateS3ImageUrl(product.id_articulo)} 
                  alt={product.title}
                  onError={(e) => {
                    e.target.src = '/images/FeaturedProducts/example_image_card.png';
                  }}
                />
              </div>
              
              <div className="favorites-page__product-info">
                <h3 
                  className="favorites-page__product-title"
                  onClick={() => handleProductClick(product.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {product.title}
                </h3>
                <div className="favorites-page__product-price-container">
                  {product.originalPrice && product.discount ? (
                    <>
                      <span className="favorites-page__product-original-price">
                        ${product.originalPrice.toFixed(2)}
                      </span>
                      <span className="favorites-page__product-discount">
                        -{product.discount}%
                      </span>
                      <span className="favorites-page__product-final-price">
                        ${product.price.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="favorites-page__product-price">
                      ${product.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="favorites-page__product-actions">
                <CherryButton
                  variant="outline"
                  size="small"
                  onClick={() => handleFavoriteToggle(product.favoriteId || product.id_articulo)}
                  className="favorites-page__remove-btn"
                >
                  Remover
                </CherryButton>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default Favorites;
