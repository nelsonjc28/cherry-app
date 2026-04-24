import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { catalogService } from '../../services/api';
import { getCherryCatalogBaseUrl, unwrapCatalogProductList } from '../../config/cherryCatalogBaseUrl';
import './CatalogProductManager.css';

const CatalogProductManager = ({ catalog, onClose, onProductsUpdated }) => {
  const [availableProducts, setAvailableProducts] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedProduct, setDraggedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (catalog) {
      fetchData();
    }
  }, [catalog]);

  // Agregar función para refrescar datos
  const refreshData = () => {
    fetchData();
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Declarar externalProducts en el scope principal
      let externalProducts = null;
      
      // Obtener productos de la API externa y filtrar localmente
      try {
        // 1. Obtener productos de la API externa
        const externalApiResponse = await axios.get(getCherryCatalogBaseUrl(), {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });
        
        if (externalApiResponse.status !== 200) {
          throw new Error(`Error al conectar con la API externa: ${externalApiResponse.status}`);
        }
        
        const externalProducts = unwrapCatalogProductList(externalApiResponse.data);
        
        // 2. Obtener IDs de productos que ya están en catálogos
        const catalogIdsResponse = await catalogService.getCatalogProductIds();
        
        if (!catalogIdsResponse.data.success) {
          throw new Error('Error al obtener IDs de catálogos');
        }
        
        const catalogProductIds = catalogIdsResponse.data.data;
        
        // 3. Filtrar productos localmente
        const availableProducts = externalProducts.filter(product => 
          !catalogProductIds.includes(product.id_articulo)
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

      // Obtener productos del catálogo actual
      const catalogResponse = await catalogService.getById(catalog.id);
      
      if (catalogResponse.data.success) {
        const catalogProducts = catalogResponse.data.data.products || [];
        setCatalogProducts(catalogProducts);
      } else {
        window.showToast('Error al cargar productos del catálogo', 'error');
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
      if (targetArea === 'catalog' && draggedProduct.source === 'available') {
        // Agregar producto al catálogo
        const response = await catalogService.addProducts(catalog.id, [draggedProduct]);
        if (response.data.success) {
          window.showToast('Producto agregado al catálogo exitosamente', 'success');
          
          // Actualizar listas
          setAvailableProducts(prev => prev.filter(p => p.external_product_id !== draggedProduct.external_product_id));
          setCatalogProducts(prev => [...prev, ...response.data.data]);
          
          if (onProductsUpdated) {
            onProductsUpdated();
          }
        }
      } else if (targetArea === 'available' && draggedProduct.source === 'catalog') {
        // Remover producto del catálogo
        const response = await catalogService.removeProduct(catalog.id, draggedProduct.id);
        if (response.data.success) {
          window.showToast('Producto removido del catálogo exitosamente', 'success');
          
          // Actualizar listas
          setCatalogProducts(prev => prev.filter(p => p.id !== draggedProduct.id));
          setAvailableProducts(prev => [...prev, {
            external_product_id: draggedProduct.external_product_id,
            product_name: draggedProduct.product_name,
            product_description: draggedProduct.product_description,
            product_image: draggedProduct.product_image,
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

  const filteredCatalogProducts = catalogProducts.filter(product =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.product_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.product_category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="catalog-product-manager">
        <div className="catalog-product-manager__loading">
          <div className="spinner"></div>
          <p>Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="catalog-product-manager catalog-product-manager--full-view">
      <div className="catalog-product-manager__header">
        <h3>Gestionar Productos - {catalog.name}</h3>
        <button 
          className="catalog-product-manager__back-btn"
          onClick={onClose}
        >
          ← Volver a Catálogos
        </button>
      </div>

      <div className="catalog-product-manager__search">
        <input
          type="text"
          placeholder="Buscar productos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="catalog-product-manager__search-input"
        />
      </div>

      <div className="catalog-product-manager__content">
        {/* Productos Disponibles */}
        <div className="catalog-product-manager__section">
          <h4>Productos Disponibles ({filteredAvailableProducts.length})</h4>
          <p className="catalog-product-manager__section-description">
            Arrastra productos de aquí al catálogo para agregarlos
          </p>
          
          <div 
            className="catalog-product-manager__products-grid"
            onDragOver={(e) => handleDragOver(e)}
            onDrop={(e) => handleDrop(e, 'available')}
          >
            {filteredAvailableProducts.length === 0 ? (
              <div className="catalog-product-manager__empty">
                <p>No hay productos disponibles</p>
              </div>
            ) : (
              filteredAvailableProducts.map((product) => (
                <div
                  key={product.external_product_id}
                  className="catalog-product-manager__product-card catalog-product-manager__product-card--available"
                  draggable
                  onDragStart={(e) => handleDragStart(e, product, 'available')}
                  onDragEnd={handleDragEnd}
                >
                  <div className="catalog-product-manager__product-icon">
                    📦
                  </div>
                  
                  <div className="catalog-product-manager__product-info">
                    <h5>{product.product_name}</h5>
                    {product.product_description && (
                      <p>{product.product_description}</p>
                    )}
                    {product.product_price && (
                      <span className="catalog-product-manager__price">
                        ${product.product_price}
                      </span>
                    )}
                    {product.product_category && (
                      <span className="catalog-product-manager__category">
                        {product.product_category}
                      </span>
                    )}
                  </div>
                  
                  <div className="catalog-product-manager__drag-indicator">
                    🖱️ Arrastra
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Productos del Catálogo */}
        <div className="catalog-product-manager__section">
          <h4>Productos del Catálogo ({filteredCatalogProducts.length})</h4>
          <p className="catalog-product-manager__section-description">
            Arrastra productos de aquí a "Productos Disponibles" para removerlos
          </p>
          
          <div 
            className="catalog-product-manager__products-grid"
            onDragOver={(e) => handleDragOver(e)}
            onDrop={(e) => handleDrop(e, 'catalog')}
          >
            {filteredCatalogProducts.length === 0 ? (
              <div className="catalog-product-manager__empty">
                <p>No hay productos en este catálogo</p>
              </div>
            ) : (
              filteredCatalogProducts.map((product) => (
                <div
                  key={product.id}
                  className="catalog-product-manager__product-card catalog-product-manager__product-card--catalog"
                  draggable
                  onDragStart={(e) => handleDragStart(e, product, 'catalog')}
                  onDragEnd={handleDragEnd}
                >
                  <div className="catalog-product-manager__product-image">
                    {product.product_image ? (
                      <img src={product.product_image} alt={product.product_name} />
                    ) : (
                      <div className="catalog-product-manager__no-image">Sin imagen</div>
                    )}
                  </div>
                  
                  <div className="catalog-product-manager__product-info">
                    <h5>{product.product_name}</h5>
                    {product.product_description && (
                      <p>{product.product_description}</p>
                    )}
                    {product.product_price && (
                      <span className="catalog-product-manager__price">
                        ${product.product_price}
                      </span>
                    )}
                    {product.product_category && (
                      <span className="catalog-product-manager__category">
                        {product.product_category}
                      </span>
                    )}
                  </div>
                  
                  <div className="catalog-product-manager__drag-indicator">
                    🖱️ Arrastra
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="catalog-product-manager__footer">
        <button 
          className="catalog-product-manager__close-footer-btn"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default CatalogProductManager;
