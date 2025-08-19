import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { categoryService } from '../../services/api';
import './CategoryProductManager.css';

const CategoryProductManager = ({ category, onClose, onProductsUpdated }) => {
  const [availableProducts, setAvailableProducts] = useState([]);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draggedProduct, setDraggedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (category) {
      fetchData();
    }
  }, [category]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Obtener productos de la API externa y filtrar localmente
      try {
        // 1. Obtener productos de la API externa
        const externalApiResponse = await axios.get('https://cherryapi.estrategiadmgs.com.mx/cherryApi/', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });
        
        if (externalApiResponse.status !== 200) {
          throw new Error(`Error al conectar con la API externa: ${externalApiResponse.status}`);
        }
        
        const externalProducts = externalApiResponse.data;
        
        // 2. Obtener IDs de productos que ya están en categorías
        const categoryIdsResponse = await categoryService.getCategoryProductIds();
        
        if (!categoryIdsResponse.data.success) {
          throw new Error('Error al obtener IDs de categorías');
        }
        
        const categoryProductIds = categoryIdsResponse.data.data;
        
        // 3. Filtrar productos localmente
        const availableProducts = externalProducts.filter(product => 
          !categoryProductIds.includes(product.id_articulo)
        );
        
        // 4. Mapear productos al formato esperado (sin imágenes para optimizar)
        const mappedProducts = availableProducts.map(product => ({
          external_product_id: product.id_articulo,
          product_name: product.descripcion || '',
          product_description: product.especificaciones || null,
          product_price: product.precio1 || 0,
          product_category: product.linea?.descripcion || null,
          product_metadata: {
            marca: product.marca || null,
            temporada: product.temporada || null,
            genero: product.genero?.descripcion || null,
            sector: product.sector?.descripcion || null,
            inventario: product.inventario || 0
          }
        }));
        
        setAvailableProducts(mappedProducts);
        
      } catch (error) {
        throw new Error(`Error al obtener productos: ${error.message}`);
      }

      // Obtener productos de la categoría actual
      const categoryResponse = await categoryService.getCategoryProducts(category.id);
      
      if (categoryResponse.data.success) {
        const categoryProducts = categoryResponse.data.data.products || [];
        setCategoryProducts(categoryProducts);
      } else {
        window.showToast('Error al cargar productos de la categoría', 'error');
      }
    } catch (error) {
      window.showToast('Error al cargar los productos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, product, source) => {
    setDraggedProduct({ ...product, source });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetArea) => {
    e.preventDefault();
    
    if (!draggedProduct) return;

    try {
      if (targetArea === 'category' && draggedProduct.source === 'available') {
        // Agregar producto a la categoría
        const response = await categoryService.addProductsToCategory(category.id, [draggedProduct]);
        if (response.data.success) {
          window.showToast('Producto agregado a la categoría exitosamente', 'success');
          
          // Actualizar listas
          setAvailableProducts(prev => prev.filter(p => p.external_product_id !== draggedProduct.external_product_id));
          setCategoryProducts(prev => [...prev, ...response.data.data]);
          
          if (onProductsUpdated) {
            onProductsUpdated();
          }
        }
      } else if (targetArea === 'available' && draggedProduct.source === 'category') {
        // Remover producto de la categoría
        const response = await categoryService.removeProductFromCategory(category.id, draggedProduct.id);
        if (response.data.success) {
          window.showToast('Producto removido de la categoría exitosamente', 'success');
          
          // Actualizar listas
          setCategoryProducts(prev => prev.filter(p => p.id !== draggedProduct.id));
          setAvailableProducts(prev => [...prev, {
            external_product_id: draggedProduct.external_product_id,
            product_name: draggedProduct.product_name,
            product_description: draggedProduct.product_description,
            product_price: draggedProduct.product_price,
            product_category: draggedProduct.product_category,
            product_metadata: draggedProduct.product_metadata
          }]);
          
          if (onProductsUpdated) {
            onProductsUpdated();
          }
        }
      }
    } catch (error) {
      window.showToast('Error al mover el producto', 'error');
    } finally {
      setDraggedProduct(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedProduct(null);
  };

  // Asegurar que availableProducts sea siempre un array antes de usar .filter()
  const filteredAvailableProducts = (Array.isArray(availableProducts) ? availableProducts : []).filter(product =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.product_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.product_category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCategoryProducts = (Array.isArray(categoryProducts) ? categoryProducts : []).filter(product =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.product_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.product_category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="category-product-manager">
        <div className="category-product-manager__loading">
          <div className="spinner"></div>
          <p>Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="category-product-manager category-product-manager--full-view">
      <div className="category-product-manager__header">
        <h3>Gestionar Productos de Categoría: {category?.name}</h3>
        <button 
          className="category-product-manager__back-btn"
          onClick={onClose}
        >
          ← Volver a Categorías
        </button>
      </div>

      <div className="category-product-manager__search">
        <input
          type="text"
          placeholder="Buscar productos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="category-product-manager__search-input"
        />
      </div>

      <div className="category-product-manager__content">
        {/* Productos Disponibles */}
        <div className="category-product-manager__section">
          <h4>Productos Disponibles ({filteredAvailableProducts.length})</h4>
          <p className="category-product-manager__section-description">
            Arrastra productos de aquí a la categoría para agregarlos
          </p>
          
          <div 
            className="category-product-manager__products-grid"
            onDragOver={(e) => handleDragOver(e)}
            onDrop={(e) => handleDrop(e, 'available')}
          >
            {filteredAvailableProducts.length === 0 ? (
              <div className="category-product-manager__empty">
                <p>No hay productos disponibles</p>
              </div>
            ) : (
              filteredAvailableProducts.map((product) => (
                <div
                  key={product.external_product_id}
                  className="category-product-manager__product-card category-product-manager__product-card--available"
                  draggable
                  onDragStart={(e) => handleDragStart(e, product, 'available')}
                  onDragEnd={handleDragEnd}
                >
                  <div className="category-product-manager__product-icon">
                    📦
                  </div>
                  
                  <div className="category-product-manager__product-info">
                    <h5>{product.product_name}</h5>
                    {product.product_description && (
                      <p>{product.product_description}</p>
                    )}
                    {product.product_price && (
                      <span className="category-product-manager__price">
                        ${product.product_price}
                      </span>
                    )}
                    {product.product_category && (
                      <span className="category-product-manager__category">
                        {product.product_category}
                      </span>
                    )}
                  </div>
                  
                  <div className="category-product-manager__drag-indicator">
                    🖱️ Arrastra
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Productos de la Categoría */}
        <div className="category-product-manager__section">
          <h4>Productos de la Categoría ({filteredCategoryProducts.length})</h4>
          <p className="category-product-manager__section-description">
            Arrastra productos de aquí a "Productos Disponibles" para removerlos
          </p>
          
          <div 
            className="category-product-manager__products-grid"
            onDragOver={(e) => handleDragOver(e)}
            onDrop={(e) => handleDrop(e, 'category')}
          >
            {filteredCategoryProducts.length === 0 ? (
              <div className="category-product-manager__empty">
                <p>No hay productos en esta categoría</p>
              </div>
            ) : (
              filteredCategoryProducts.map((product) => (
                <div
                  key={product.id}
                  className="category-product-manager__product-card category-product-manager__product-card--category"
                  draggable
                  onDragStart={(e) => handleDragStart(e, product, 'category')}
                  onDragEnd={handleDragEnd}
                >
                  <div className="category-product-manager__product-icon">
                    📦
                  </div>
                  
                  <div className="category-product-manager__product-info">
                    <h5>{product.product_name}</h5>
                    {product.product_description && (
                      <p>{product.product_description}</p>
                    )}
                    {product.product_price && (
                      <span className="category-product-manager__price">
                        ${product.product_price}
                      </span>
                    )}
                    {product.product_category && (
                      <span className="category-product-manager__category">
                        {product.product_category}
                      </span>
                    )}
                  </div>
                  
                  <div className="category-product-manager__drag-indicator">
                    🖱️ Arrastra
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="category-product-manager__footer">
        <button 
          className="category-product-manager__close-footer-btn"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default CategoryProductManager;
