import React, { useState, useEffect, useRef } from 'react';
import { getProductsWithRatings } from '../../api/cherryApi';

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

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => {
        const searchLower = searchTerm.toLowerCase();
        const productName = product.descripcion || product.title || product.name || '';
        const productId = product.id_articulo || product.id || product.codigo || '';
        
        return (
          productName.toLowerCase().includes(searchLower) ||
          productId.toString().includes(searchLower) ||
          product.marca?.toLowerCase().includes(searchLower) ||
          product.linea?.descripcion?.toLowerCase().includes(searchLower) ||
          product.sector?.descripcion?.toLowerCase().includes(searchLower) ||
          product.genero?.descripcion?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

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
      
      if (!allProducts || allProducts.length === 0) {
        setProducts([]);
        setFilteredProducts([]);
        return;
      }
      
      const filteredProducts = allProducts.filter(product => {
        const hasId = product.id_articulo || product.id || product.codigo;
        const hasDescription = product.descripcion || product.title || product.name;
        const hasBasicFields = hasId && hasDescription;
        
        return hasBasicFields;
      });
      
      setProducts(filteredProducts);
      setFilteredProducts(filteredProducts);
    } catch (err) {
      console.error('❌ ProductMultiSelect: Error al cargar productos:', err);
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

  const getProductId = (product) => {
    return product.id_articulo || product.id || product.codigo;
  };

  const handleProductSelect = (product) => {
    const productId = getProductId(product);
    const isSelected = selectedProducts.some(p => getProductId(p) === productId);
    
    if (isSelected) {
      const newSelected = selectedProducts.filter(p => getProductId(p) !== productId);
      onProductsChange(newSelected);
    } else {
      const newSelected = [...selectedProducts, product];
      onProductsChange(newSelected);
    }
  };

  const handleRemoveProduct = (productId) => {
    const newSelected = selectedProducts.filter(p => getProductId(p) !== productId);
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
    const productId = getProductId(product);
    return selectedProducts.some(p => getProductId(p) === productId);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  return (
    <div style={{ position: 'relative', width: '100%', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }} ref={dropdownRef}>
      {/* Productos seleccionados */}
      {selectedProducts.length > 0 && (
        <div style={{
          marginBottom: '12px',
          border: '1px solid #e1e5e9',
          borderRadius: '8px',
          background: '#f8f9fa'
        }}>
          <div style={{
            padding: '6px 10px',
            background: '#e9ecef',
            borderBottom: '1px solid #dee2e6',
            borderRadius: '8px 8px 0 0',
            fontSize: '12px',
            fontWeight: 600,
            color: '#495057'
          }}>
            <span>Productos seleccionados ({selectedProducts.length})</span>
          </div>
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto',
            padding: '6px'
          }}>
            {selectedProducts.map(product => (
              <div key={getProductId(product)} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px',
                marginBottom: '4px',
                background: 'white',
                border: '1px solid #e1e5e9',
                borderRadius: '6px',
                transition: 'all 0.2s ease'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  flex: 1,
                  minWidth: 0
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#212529',
                      marginBottom: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {product.descripcion || product.title || product.name || 'Sin nombre'}
                    </span>
                    <span style={{
                      display: 'block',
                      fontSize: '10px',
                      color: '#6c757d',
                      marginBottom: '1px'
                    }}>
                      ID: {getProductId(product) || 'N/A'}
                    </span>
                    <span style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#28a745'
                    }}>
                      {formatPrice(product.precio1 || product.price || 0)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveProduct(getProductId(product))}
                  disabled={disabled}
                  title="Remover producto"
                  style={{
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    fontSize: '14px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s ease',
                    flexShrink: 0,
                    marginLeft: '8px'
                  }}
                  onMouseEnter={(e) => !disabled && (e.target.style.backgroundColor = '#c82333')}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = '#dc3545')}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campo de búsqueda */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'stretch',
        marginBottom: '8px'
      }}>
        <input
          ref={searchInputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={handleInputFocus}
          onKeyDown={handleInputKeyDown}
          disabled={disabled}
          style={{
            flex: 1,
            padding: '10px 12px',
            border: '2px solid #e1e5e9',
            borderRight: 'none',
            borderRadius: '8px 0 0 8px',
            fontSize: '14px',
            background: disabled ? '#e9ecef' : 'white',
            color: disabled ? '#6c757d' : '#212529',
            outline: 'none',
            transition: 'border-color 0.2s ease'
          }}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          style={{
            padding: '0 12px',
            background: '#dc3545',
            color: 'white',
            border: '2px solid #dc3545',
            borderLeft: 'none',
            borderRadius: '0 8px 8px 0',
            fontSize: '12px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => !disabled && (e.target.style.backgroundColor = '#c82333')}
          onMouseLeave={(e) => (e.target.style.backgroundColor = '#dc3545')}
        >
          {isOpen ? '▲' : '▼'}
        </button>
      </div>

      {/* Dropdown de productos */}
      {isOpen && (
        <div 
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '2px solid #e1e5e9',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            maxHeight,
            overflowY: 'auto'
          }}
        >
          {loading && (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#6c757d',
              fontSize: '14px'
            }}>
              <div style={{
                width: '30px',
                height: '30px',
                border: '3px solid #f3f3f3',
                borderTop: '3px solid #dc3545',
                borderRadius: '50%',
                margin: '0 auto 10px',
                animation: 'spin 1s linear infinite'
              }}></div>
              <span>Cargando productos desde Cherry API...</span>
            </div>
          )}

          {error && (
            <div style={{
              padding: '15px',
              background: '#f8d7da',
              color: '#721c24',
              fontSize: '14px',
              borderBottom: '1px solid #f5c6cb'
            }}>
              <span>{error}</span>
              <button 
                type="button"
                onClick={loadProducts}
                style={{
                  marginLeft: '10px',
                  padding: '4px 8px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && filteredProducts.length === 0 && (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#6c757d',
              fontSize: '14px'
            }}>
              <span>No se encontraron productos</span>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                Total productos cargados: {products.length}
              </div>
            </div>
          )}

          {!loading && !error && filteredProducts.length > 0 && (
            <div style={{ padding: '10px', backgroundColor: '#d4edda', fontSize: '12px', color: '#155724', borderBottom: '1px solid #c3e6cb' }}>
              ✅ {filteredProducts.length} productos disponibles
            </div>
          )}

          {!loading && !error && filteredProducts.length > 0 && (
            <div style={{
              maxHeight: '250px',
              overflowY: 'auto'
            }}>
              {filteredProducts.map(product => {
                const isSelected = isProductSelected(product);
                return (
                  <div
                    key={getProductId(product) || Math.random()}
                    onClick={() => handleProductSelect(product)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderBottom: '1px solid #e9ecef',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      background: isSelected ? '#f8d7da' : 'transparent',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => !disabled && !isSelected && (e.target.style.backgroundColor = '#f8f9fa')}
                    onMouseLeave={(e) => !isSelected && (e.target.style.backgroundColor = 'transparent')}
                  >
                    <div style={{
                      flexShrink: 0,
                      marginRight: '12px',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        disabled={disabled}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          accentColor: '#dc3545'
                        }}
                      />
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#212529',
                        marginBottom: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {product.descripcion || product.title || product.name || 'Sin nombre'}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: '#6c757d',
                        marginBottom: '2px'
                      }}>
                        ID: {product.id_articulo || product.id || product.codigo || 'N/A'}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#28a745'
                      }}>
                        {formatPrice(product.precio1 || product.price || 0)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductMultiSelect;

