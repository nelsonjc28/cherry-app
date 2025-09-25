import React, { useState, useEffect, useRef } from 'react';
import { getProductsWithRatings } from '../../api/cherryApi';
import './ProductMultiSelect.css';

const ProductMultiSelect = ({ 
  selectedProducts = [], 
  onProductsChange, 
  placeholder = "Buscar productos...",
  maxHeight = "300px",
  disabled = false 
}) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Cargar productos al montar el componente
  useEffect(() => {
    loadProducts();
  }, []);

  // Filtrar productos cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => {
        const searchLower = searchTerm.toLowerCase();
        return (
          product.descripcion?.toLowerCase().includes(searchLower) ||
          product.id_articulo?.toString().includes(searchLower) ||
          product.marca?.toLowerCase().includes(searchLower) ||
          product.linea?.descripcion?.toLowerCase().includes(searchLower) ||
          product.sector?.descripcion?.toLowerCase().includes(searchLower) ||
          product.genero?.descripcion?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');
      
      const allProducts = await getProductsWithRatings();
      
      // Filtrar productos - mostrar todos los que tengan campos básicos
      const filteredProducts = allProducts.filter(product => {
        // Solo verificar que el producto tenga los campos básicos
        const hasBasicFields = product.id_articulo && product.descripcion;
        
        
        return hasBasicFields;
      });
      
      
      setProducts(filteredProducts);
      setFilteredProducts(filteredProducts);
    } catch (err) {
      setError('Error al cargar productos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleProductSelect = (product) => {
    const isSelected = selectedProducts.some(p => p.id_articulo === product.id_articulo);
    
    if (isSelected) {
      // Remover producto
      const newSelected = selectedProducts.filter(p => p.id_articulo !== product.id_articulo);
      onProductsChange(newSelected);
    } else {
      // Agregar producto
      const newSelected = [...selectedProducts, product];
      onProductsChange(newSelected);
    }
  };

  const handleRemoveProduct = (productId) => {
    const newSelected = selectedProducts.filter(p => p.id_articulo !== productId);
    onProductsChange(newSelected);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      searchInputRef.current?.blur();
    }
  };

  const isProductSelected = (product) => {
    return selectedProducts.some(p => p.id_articulo === product.id_articulo);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };


  return (
    <div className="product-multi-select" ref={dropdownRef}>
      {/* Productos seleccionados */}
      {selectedProducts.length > 0 && (
        <div className="product-multi-select__selected">
          <div className="product-multi-select__selected-header">
            <span>Productos seleccionados ({selectedProducts.length})</span>
          </div>
          <div className="product-multi-select__selected-list">
            {selectedProducts.map(product => (
              <div key={product.id_articulo} className="product-multi-select__selected-item">
                <div className="product-multi-select__selected-info">
                  <div className="product-multi-select__selected-details">
                    <span className="product-multi-select__selected-name">
                      {product.descripcion}
                    </span>
                    <span className="product-multi-select__selected-id">
                      ID: {product.id_articulo}
                    </span>
                    <span className="product-multi-select__selected-price">
                      {formatPrice(product.precio1)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="product-multi-select__remove-btn"
                  onClick={() => handleRemoveProduct(product.id_articulo)}
                  disabled={disabled}
                  title="Remover producto"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campo de búsqueda */}
      <div className="product-multi-select__search">
        <input
          ref={searchInputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          disabled={disabled}
          className="product-multi-select__search-input"
        />
        <button
          type="button"
          className="product-multi-select__search-btn"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
        >
          {isOpen ? '▲' : '▼'}
        </button>
      </div>

      {/* Dropdown de productos */}
      {isOpen && (
        <div 
          className="product-multi-select__dropdown"
          style={{ maxHeight }}
        >
          {loading && (
            <div className="product-multi-select__loading">
              <div className="spinner"></div>
              <span>Cargando productos desde Cherry API...</span>
            </div>
          )}

          {error && (
            <div className="product-multi-select__error">
              <span>{error}</span>
              <button 
                type="button"
                onClick={loadProducts}
                className="product-multi-select__retry-btn"
              >
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && filteredProducts.length === 0 && (
            <div className="product-multi-select__empty">
              <span>No se encontraron productos</span>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                Total productos cargados: {products.length}
              </div>
            </div>
          )}

          {!loading && !error && filteredProducts.length > 0 && (
            <div style={{ padding: '10px', backgroundColor: '#f8d7da', fontSize: '12px', color: '#dc3545' }}>
              ✅ {filteredProducts.length} productos disponibles
            </div>
          )}

          {!loading && !error && filteredProducts.length > 0 && (
            <div className="product-multi-select__list">
              {filteredProducts.map(product => (
                <div
                  key={product.id_articulo}
                  className={`product-multi-select__item ${
                    isProductSelected(product) ? 'selected' : ''
                  }`}
                  onClick={() => handleProductSelect(product)}
                >
                  <div className="product-multi-select__item-checkbox">
                    <input
                      type="checkbox"
                      checked={isProductSelected(product)}
                      onChange={() => {}} // Manejado por onClick del contenedor
                      disabled={disabled}
                    />
                  </div>
                  
                  <div className="product-multi-select__item-info">
                    <div className="product-multi-select__item-name">
                      {product.descripcion}
                    </div>
                    <div className="product-multi-select__item-details">
                      <span className="product-multi-select__item-id">
                        ID: {product.id_articulo}
                      </span>
                    </div>
                    <div className="product-multi-select__item-price">
                      {formatPrice(product.precio1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductMultiSelect;
