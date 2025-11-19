import React, { useState, useEffect } from 'react';
import { getProductsWithRatings } from '../../api/cherryApi';

const BasicProductSelect = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');

      
      const allProducts = await getProductsWithRatings();

      
      // Mostrar todos los productos sin filtros
      setProducts(allProducts || []);
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product) => {
    const isSelected = selectedProducts.some(p => p.id_articulo === product.id_articulo);
    
    if (isSelected) {
      setSelectedProducts(prev => prev.filter(p => p.id_articulo !== product.id_articulo));
    } else {
      setSelectedProducts(prev => [...prev, product]);
    }
  };

  const filteredProducts = products.filter(product => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      product.descripcion?.toLowerCase().includes(searchLower) ||
      product.id_articulo?.toString().includes(searchLower) ||
      product.marca?.toLowerCase().includes(searchLower)
    );
  });

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2>🔧 Selector Básico de Productos</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={loadProducts}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? 'Cargando...' : 'Recargar'}
        </button>
        
        <span style={{ color: '#666' }}>
          {products.length} productos cargados | {selectedProducts.length} seleccionados
        </span>
      </div>

      {error && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          border: '1px solid #f5c6cb',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Búsqueda y lista de productos */}
        <div>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px'
              }}
            />
          </div>
          
          <h3>📦 Productos ({filteredProducts.length})</h3>
          <div style={{ 
            maxHeight: '500px', 
            overflowY: 'auto', 
            border: '1px solid #ddd', 
            padding: '10px',
            backgroundColor: '#f9f9f9'
          }}>
            {loading ? (
              <div>Cargando productos...</div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ color: '#666' }}>
                {searchTerm ? 'No se encontraron productos con ese término' : 'No hay productos disponibles'}
              </div>
            ) : (
              filteredProducts.slice(0, 50).map((product, index) => (
                <div 
                  key={product.id_articulo || index}
                  style={{
                    padding: '8px',
                    border: '1px solid #eee',
                    marginBottom: '5px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: selectedProducts.some(p => p.id_articulo === product.id_articulo) ? '#e3f2fd' : 'white',
                    transition: 'background-color 0.2s'
                  }}
                  onClick={() => handleProductSelect(product)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="checkbox"
                      checked={selectedProducts.some(p => p.id_articulo === product.id_articulo)}
                      onChange={() => {}} // Manejado por onClick del div
                      style={{ margin: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                        {product.descripcion || 'Sin descripción'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        ID: {product.id_articulo} | ${product.precio1}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            {filteredProducts.length > 50 && (
              <div style={{ textAlign: 'center', color: '#666', padding: '10px' }}>
                ... y {filteredProducts.length - 50} productos más
              </div>
            )}
          </div>
        </div>

        {/* Productos seleccionados */}
        <div>
          <h3>✅ Seleccionados ({selectedProducts.length})</h3>
          {selectedProducts.length === 0 ? (
            <div style={{ color: '#666' }}>No hay productos seleccionados</div>
          ) : (
            <div style={{ 
              maxHeight: '500px', 
              overflowY: 'auto', 
              border: '1px solid #ddd', 
              padding: '10px',
              backgroundColor: '#f9f9f9'
            }}>
              {selectedProducts.map((product, index) => (
                <div 
                  key={product.id_articulo || index}
                  style={{
                    padding: '8px',
                    border: '1px solid #28a745',
                    marginBottom: '5px',
                    borderRadius: '4px',
                    backgroundColor: '#d4edda'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                        {product.descripcion || 'Sin descripción'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        ID: {product.id_articulo} | ${product.precio1}
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedProducts(prev => prev.filter(p => p.id_articulo !== product.id_articulo))}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Información de debug */}
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
        <h4>🔧 Debug Info</h4>
        <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
          <div>Total productos: {products.length}</div>
          <div>Productos filtrados: {filteredProducts.length}</div>
          <div>Seleccionados: {selectedProducts.length}</div>
          <div>Loading: {loading ? 'Sí' : 'No'}</div>
          <div>Error: {error || 'Ninguno'}</div>
        </div>
      </div>
    </div>
  );
};

export default BasicProductSelect;
