import React, { useState } from 'react';
import ProductMultiSelect from '../components/ProductMultiSelect';
import SimpleProductTest from '../components/ProductMultiSelect/SimpleProductTest';
import BasicProductSelect from '../components/ProductMultiSelect/BasicProductSelect';

const TestProductMultiSelectPage = () => {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [testMode, setTestMode] = useState('basic'); // 'basic', 'simple', 'full'

  const handleProductsChange = (products) => {
    setSelectedProducts(products);
  };

  const renderTestMode = () => {
    switch (testMode) {
      case 'basic':
        return <BasicProductSelect />;
      case 'simple':
        return <SimpleProductTest />;
      case 'full':
        return (
          <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>Test Product Multi-Select</h1>
            <p>Esta página demuestra el componente ProductMultiSelect que carga productos desde la Cherry API.</p>
            
            <div style={{ marginBottom: '20px' }}>
              <h2>Seleccionar Productos para Descuento</h2>
              <ProductMultiSelect
                selectedProducts={selectedProducts}
                onProductsChange={handleProductsChange}
                placeholder="Buscar productos de Cherry API..."
                maxHeight="400px"
              />
            </div>

            <div style={{ marginTop: '20px' }}>
              <h3>Productos Seleccionados ({selectedProducts.length})</h3>
              {selectedProducts.length === 0 ? (
                <p>No hay productos seleccionados</p>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {selectedProducts.map(product => (
                    <div 
                      key={product.id_articulo} 
                      style={{ 
                        border: '1px solid #ddd', 
                        padding: '10px', 
                        borderRadius: '8px',
                        backgroundColor: '#f9f9f9'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img 
                          src={product.imagen || `https://cherry-fotos.s3.amazonaws.com/shopify/${product.id_articulo}/${product.id_articulo}_1.jpg`}
                          alt={product.descripcion}
                          style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                          onError={(e) => {
                            e.target.src = '/images/placeholder-catalog.png';
                          }}
                        />
                        <div>
                          <h4 style={{ margin: '0 0 5px 0' }}>{product.descripcion}</h4>
                          <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
                            ID: {product.id_articulo} | Marca: {product.marca} | Precio: ${product.precio1}
                          </p>
                          <p style={{ margin: '0', fontSize: '12px', color: '#888' }}>
                            Categoría: {product.linea?.descripcion} | Stock: {product.inventario}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
              <h4>Información del Componente</h4>
              <ul>
                <li>✅ Carga productos desde la Cherry API</li>
                <li>✅ Búsqueda en tiempo real por nombre, ID, marca, categoría</li>
                <li>✅ Selección múltiple con checkboxes</li>
                <li>✅ Vista previa de productos seleccionados</li>
                <li>✅ Imágenes de productos con fallback</li>
                <li>✅ Información detallada (precio, stock, categoría)</li>
                <li>✅ Diseño responsive</li>
                <li>✅ Integración con sistema de descuentos</li>
              </ul>
            </div>
          </div>
        );
      default:
        return <BasicProductSelect />;
    }
  };

  return (
    <div>
      <div style={{ padding: '10px', backgroundColor: '#e3f2fd', borderBottom: '1px solid #2196f3' }}>
        <button 
          onClick={() => setTestMode('basic')}
          style={{ 
            padding: '5px 10px', 
            marginRight: '10px',
            backgroundColor: testMode === 'basic' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Test Básico
        </button>
        <button 
          onClick={() => setTestMode('simple')}
          style={{ 
            padding: '5px 10px', 
            marginRight: '10px',
            backgroundColor: testMode === 'simple' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Test Simple
        </button>
        <button 
          onClick={() => setTestMode('full')}
          style={{ 
            padding: '5px 10px', 
            marginRight: '10px',
            backgroundColor: testMode === 'full' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Componente Completo
        </button>
        <span style={{ marginLeft: '20px', color: '#666' }}>
          Modo actual: {testMode === 'basic' ? 'Test Básico (Recomendado)' : 
                       testMode === 'simple' ? 'Test Simple' : 'Componente Completo'}
        </span>
      </div>
      {renderTestMode()}
    </div>
  );
};

export default TestProductMultiSelectPage;
