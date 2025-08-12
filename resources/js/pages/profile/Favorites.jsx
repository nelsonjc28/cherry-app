import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/Pagination/Pagination';
import './Favorites.css';
import CherryButton from '../../components/CherryButton/CherryButton';
import useUserStore from '../../store/userStore';
import { useFavoritesContext } from '../../contexts/FavoritesContext';
import { getIconPath } from '../../utils/assetPaths';
import api from '../../services/api';

const Favorites = () => {
  const { user } = useUserStore();
  const { favorites: favoritesContext, loadFavorites, initialized } = useFavoritesContext();
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
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/favorites', {
        params: {
          page: page,
          per_page: itemsPerPage
        }
      });
      
      if (response.data.success) {
        const favorites = response.data.favorites.map(fav => ({
          id: fav.product_id,
          title: fav.product_title || 'Producto sin título',
          image: fav.product_image || '/images/FeaturedProducts/example_image_card.png',
          price: parseFloat(fav.product_price) || 0,
          favoriteId: fav.id
        }));
        
        setFavoriteProducts(favorites);
        setTotalFavorites(response.data.pagination.total);
        setCurrentPage(page);
      } else {
        setError('Error al cargar favoritos');
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError('Error al cargar favoritos');
    } finally {
      setLoading(false);
    }
  };

  // Load favorites when component mounts or user changes
  useEffect(() => {
    if (user) {
      fetchFavorites(1);
    }
  }, [user]);

  // Sync with favorites context when it changes
  useEffect(() => {
    if (initialized && favoritesContext) {
      // Si el contexto tiene favoritos, recargar la página actual
      if (favoritesContext.size > 0) {
        fetchFavorites(currentPage);
      } else {
        // Si no hay favoritos en el contexto, limpiar el estado local
        setFavoriteProducts([]);
        setTotalFavorites(0);
        setLoading(false);
      }
    }
  }, [favoritesContext, initialized]);

  // Handle favorite toggle callback
  const handleFavoriteToggle = async (productId) => {
    try {
      // Remove from favorites
      await api.delete('/favorites', {
        data: { product_id: productId }
      });
      
      // Remove from selected items if selected
      setSelectedItems(prev => {
        const newSelected = new Set(prev);
        newSelected.delete(productId);
        return newSelected;
      });
      
      // Reload favorites to get updated data
      fetchFavorites(currentPage);
      
      if (window.showToast) {
        window.showToast('Producto removido de favoritos', 'success');
      }
    } catch (err) {
      console.error('Error removing favorite:', err);
      if (window.showToast) {
        window.showToast('Error al remover de favoritos', 'error');
      }
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
        // Remove all selected items from favorites
        const promises = Array.from(selectedItems).map(productId => 
          api.delete('/favorites', { data: { product_id: productId } })
        );
        
        await Promise.all(promises);
        
        // Clear selected items
        setSelectedItems(new Set());
        
        // Reload favorites to get updated data
        fetchFavorites(currentPage);
        
        if (window.showToast) {
          window.showToast(`${selectedItems.size} productos removidos de favoritos`, 'success');
        }
      } catch (err) {
        console.error('Error removing selected favorites:', err);
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
                  src={product.image} 
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
                <p className="favorites-page__product-price">
                  ${product.price.toFixed(2)}
                </p>
              </div>
              
              <div className="favorites-page__product-actions">
                <CherryButton
                  variant="outline"
                  size="small"
                  onClick={() => handleFavoriteToggle(product.id)}
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
