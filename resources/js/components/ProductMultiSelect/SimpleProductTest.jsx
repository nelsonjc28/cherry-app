import React, { useState, useEffect } from 'react';
import { getProductsWithRatings } from '../../api/cherryApi';

const SimpleProductTest = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');

      
      const allProducts = await getProductsWithRatings();

      
      setProducts(allProducts || []);
    } catch (err) {
      setError('Error: ' + err.message);
      console.error('❌ Error:', err);
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

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🔍 Test Simple de Productos Cherry API</h1>
      
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
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Cargando...' : 'Recargar Productos'}
        </button>
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
        {/* Lista de productos */}
        <div>
          <h2>📦 Productos Disponibles ({products.length})</h2>
          {loading ? (
            <div>Cargando productos...</div>
          ) : products.length === 0 ? (
            <div style={{ color: '#6c757d' }}>No hay productos disponibles</div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px' }}>
              {products.slice(0, 20).map((product, index) => (
                <div 
                  key={product.id_articulo || index}
                  style={{
                    padding: '10px',
                    border: '1px solid #eee',
                    marginBottom: '5px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    backgroundColor: selectedProducts.some(p => p.id_articulo === product.id_articulo) ? '#e3f2fd' : 'white'
                  }}
                  onClick={() => handleProductSelect(product)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input 
                      type="checkbox"
                      checked={selectedProducts.some(p => p.id_articulo === product.id_articulo)}
                      onChange={() => {}} // Manejado por onClick del div
                    />
                    <div>
                      <div style={{ fontWeight: 'bold' }}>
                        {product.descripcion || 'Sin descripción'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        ID: {product.id_articulo} | Precio: ${product.precio1}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {products.length > 20 && (
                <div style={{ textAlign: 'center', color: '#666', padding: '10px' }}>
                  ... y {products.length - 20} productos más
                </div>
              )}
            </div>
          )}
        </div>

        {/* Productos seleccionados */}
        <div>
          <h2>✅ Productos Seleccionados ({selectedProducts.length})</h2>
          {selectedProducts.length === 0 ? (
            <div style={{ color: '#6c757d' }}>No hay productos seleccionados</div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px' }}>
              {selectedProducts.map((product, index) => (
                <div 
                  key={product.id_articulo || index}
                  style={{
                    padding: '10px',
                    border: '1px solid #28a745',
                    marginBottom: '5px',
                    borderRadius: '5px',
                    backgroundColor: '#d4edda'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>
                        {product.descripcion || 'Sin descripción'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        ID: {product.id_articulo} | Precio: ${product.precio1}
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedProducts(prev => prev.filter(p => p.id_articulo !== product.id_articulo))}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        padding: '5px 10px',
                        cursor: 'pointer'
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
        <h3>🔧 Información de Debug</h3>
        <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
          <div>Total productos cargados: {products.length}</div>
          <div>Productos seleccionados: {selectedProducts.length}</div>
          <div>Estado de carga: {loading ? 'Cargando...' : 'Completado'}</div>
          <div>Error: {error || 'Ninguno'}</div>
        </div>
      </div>
    </div>
  );
};

export default SimpleProductTest;
