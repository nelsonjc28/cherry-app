import React, { useState, useEffect } from 'react';
import { catalogService } from '../../services/api';
import CatalogProductManager from './CatalogProductManager';
import CatalogPdfManager from './CatalogPdfManager';
import CatalogPdfModule from './CatalogPdfModule';
import CatalogOffersModule from './CatalogOffersModule';
import useUserStore from '../../store/userStore';
import './AdminCatalogManager.css';

const AdminCatalogManager = () => {
  const { user } = useUserStore();
  const [catalogs, setCatalogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCatalog, setEditingCatalog] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [currentView, setCurrentView] = useState('catalogs'); // 'catalogs', 'products', 'pdf', 'pdf-module' o 'offers'
  const [selectedCatalog, setSelectedCatalog] = useState(null);
  const [showPdfManager, setShowPdfManager] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    image: null,
    is_active: true,
    display_order: 0
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {

    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    try {
      setLoading(true);
      const response = await catalogService.getAll();
      if (response.data.success) {
        setCatalogs(response.data.data);
      }
    } catch (error) {
      setError('Error al cargar los catálogos');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      const file = files[0];
      if (file) {
        setFormData(prev => ({ ...prev, [name]: file }));
        setImagePreview(URL.createObjectURL(file));
      }
    } else if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Validación frontend
      if (!formData.name.trim() || !formData.description.trim()) {
        setError('El nombre y la descripción son obligatorios');
        return;
      }

      if (!editingCatalog && !formData.image) {
        setError('La imagen es obligatoria para nuevos catálogos');
        return;
      }

      const formDataObj = new FormData();
      formDataObj.append('name', formData.name.trim());
      formDataObj.append('description', formData.description.trim());
      formDataObj.append('code', formData.code.trim());
      formDataObj.append('is_active', formData.is_active ? '1' : '0');
      formDataObj.append('display_order', formData.display_order.toString());
      
      if (formData.image) {
        formDataObj.append('image', formData.image);
      }

      let response;
      if (editingCatalog) {
        response = await catalogService.update(editingCatalog.id, formDataObj);
      } else {
        response = await catalogService.create(formDataObj);
      }

      if (response.data.success) {
        window.showToast(
          editingCatalog 
            ? 'Catálogo actualizado exitosamente' 
            : 'Catálogo creado exitosamente',
          'success'
        );
        
        resetForm();
        fetchCatalogs();
      }
    } catch (error) {
      setError('Error al guardar el catálogo');
    }
  };

  const handleEdit = (catalog) => {
    setEditingCatalog(catalog);
    setFormData({
      name: catalog.name,
      description: catalog.description,
      code: catalog.code || '',
      image: null,
      is_active: catalog.is_active,
      display_order: catalog.display_order
    });
         setImagePreview(catalog.image ? `/${catalog.image}` : null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este catálogo?')) {
      return;
    }

    try {
      const response = await catalogService.delete(id);
      if (response.data.success) {
        window.showToast('Catálogo eliminado exitosamente', 'success');
        fetchCatalogs();
      }
    } catch (error) {
      window.showToast('Error al eliminar el catálogo', 'error');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const response = await catalogService.toggleStatus(id);
      if (response.data.success) {
        window.showToast('Estado del catálogo cambiado exitosamente', 'success');
        fetchCatalogs();
      }
    } catch (error) {
      window.showToast('Error al cambiar el estado del catálogo', 'error');
    }
  };

  const resetForm = () => {
    // Calcular el siguiente número de orden basado en los catálogos existentes
    const nextOrder = catalogs.length > 0 
      ? Math.max(...catalogs.map(cat => cat.display_order || 0)) + 1 
      : 1;
    
    setFormData({
      name: '',
      description: '',
      code: '',
      image: null,
      is_active: true,
      display_order: nextOrder
    });
    setImagePreview(null);
    setEditingCatalog(null);
    setShowForm(false);
    setError('');
  };

  const openProductManager = (catalog) => {
    setSelectedCatalog(catalog);
    setCurrentView('products');
  };

  const handleBackToCatalogs = () => {
    setCurrentView('catalogs');
    setSelectedCatalog(null);
  };

  const handleClosePdfManager = () => {
    setShowPdfManager(false);
    setCurrentView('catalogs');
    setSelectedCatalog(null);
  };

  const handleBackFromPdfModule = () => {
    setCurrentView('catalogs');
  };

  const handleBackFromOffersModule = () => {
    setCurrentView('catalogs');
    setSelectedCatalog(null);
  };

  const handleProductsUpdated = () => {
    fetchCatalogs(); // Recargar catálogos para actualizar contadores
  };

  const handlePdfUpdated = () => {
    fetchCatalogs(); // Recargar catálogos para actualizar contadores
  };

  const openPdfManager = (catalog) => {
    setSelectedCatalog(catalog);
    setCurrentView('pdf-module');
  };

  const openOffersManager = (catalog) => {
    setSelectedCatalog(catalog);
    setCurrentView('offers');
  };

  if (loading) {
    return (
      <div className="admin-catalog-manager">
        <div className="admin-catalog-manager__loading">
          <div className="spinner"></div>
          <p>Cargando catálogos...</p>
        </div>
      </div>
    );
  }

  // Si estamos en la vista de productos, solo mostrar el gestor de productos
  if (currentView === 'products' && selectedCatalog) {
    return (
      <CatalogProductManager
        catalog={selectedCatalog}
        onClose={handleBackToCatalogs}
        onProductsUpdated={handleProductsUpdated}
      />
    );
  }

  // Si estamos en la vista de PDF, mostrar el gestor de PDF
  if (currentView === 'pdf' && selectedCatalog && showPdfManager) {
    return (
      <CatalogPdfManager
        catalog={selectedCatalog}
        onClose={handleClosePdfManager}
        onPdfUpdated={handlePdfUpdated}
      />
    );
  }

  // Si estamos en la vista del módulo de PDF, mostrar el módulo completo
  if (currentView === 'pdf-module') {
    return (
      <CatalogPdfModule
        onBack={handleBackFromPdfModule}
        initialCatalog={selectedCatalog}
      />
    );
  }

  // Si estamos en la vista del módulo de ofertas, mostrar el módulo completo
  if (currentView === 'offers') {
    return (
      <CatalogOffersModule
        onBack={handleBackFromOffersModule}
        initialCatalog={selectedCatalog}
      />
    );
  }

  return (
    <div className="admin-catalog-manager">
      <div className="admin-catalog-manager__header">
        <h2>Gestión de Catálogos</h2>
        <div className="admin-catalog-manager__header-actions">
          <button 
            className="admin-catalog-manager__pdf-module-btn"
            onClick={() => setCurrentView('pdf-module')}
            title="Ir al módulo de gestión de PDF"
          >
            📄 Módulo PDF
          </button>
          <button 
            className="admin-catalog-manager__offers-module-btn"
            onClick={() => setCurrentView('offers')}
            title="Ir al módulo de gestión de ofertas"
          >
            🎯 Módulo Ofertas
          </button>
          <button 
            className="admin-catalog-manager__add-btn"
            onClick={() => {
              // Calcular el siguiente número de orden antes de abrir el formulario
              const nextOrder = catalogs.length > 0 
                ? Math.max(...catalogs.map(cat => cat.display_order || 0)) + 1 
                : 1;
              
              setFormData(prev => ({
                ...prev,
                display_order: nextOrder
              }));
              setShowForm(true);
            }}
          >
            + Nuevo Catálogo
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
          <button 
            type="button" 
            className="btn-close"
            onClick={() => setError('')}
          >
            ×
          </button>
        </div>
      )}

      {showForm && (
        <div className="admin-catalog-manager__form-container">
          <div className="admin-catalog-manager__form-header">
            <h3>{editingCatalog ? 'Editar Catálogo' : 'Nuevo Catálogo'}</h3>
            <button 
              className="admin-catalog-manager__close-btn"
              onClick={resetForm}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="admin-catalog-manager__form">
            <div className="admin-catalog-manager__form-group">
              <label htmlFor="name">Nombre *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="form-control"
                required
              />
            </div>

            <div className="admin-catalog-manager__form-group">
              <label htmlFor="description">Descripción *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="form-control"
                rows="4"
                required
              />
            </div>

            <div className="admin-catalog-manager__form-group">
              <label htmlFor="code">Código</label>
              <input
                type="text"
                id="code"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Ej: 96, 95, 94..."
              />
            </div>

            <div className="admin-catalog-manager__form-group">
              <label htmlFor="image">
                Imagen {!editingCatalog && '*'}
              </label>
              <input
                type="file"
                id="image"
                name="image"
                onChange={handleInputChange}
                className="form-control"
                accept="image/*"
                required={!editingCatalog}
              />
              {imagePreview && (
                <div className="admin-catalog-manager__image-preview">
                  <img src={imagePreview} alt="Vista previa" />
                </div>
              )}
            </div>

            <div className="admin-catalog-manager__form-row">
              <div className="admin-catalog-manager__form-group">
                <label htmlFor="display_order">Orden de Visualización</label>
                <input
                  type="number"
                  id="display_order"
                  name="display_order"
                  value={formData.display_order}
                  onChange={handleInputChange}
                  className="form-control"
                  min="0"
                />
              </div>

              <div className="admin-catalog-manager__form-group">
                <label className="admin-catalog-manager__checkbox-label">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  Activo
                </label>
              </div>
            </div>

            <div className="admin-catalog-manager__form-actions">
              <button type="submit" className="admin-catalog-manager__submit-btn">
                {editingCatalog ? 'Actualizar' : 'Crear'}
              </button>
              <button 
                type="button" 
                className="admin-catalog-manager__cancel-btn"
                onClick={resetForm}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-catalog-manager__catalogs">
        {catalogs.length === 0 ? (
          <div className="admin-catalog-manager__empty">
            <p>No hay catálogos creados</p>
          </div>
        ) : (
          <div className="admin-catalog-manager__catalogs-grid">
            {catalogs.map((catalog) => (
              <div key={catalog.id} className="admin-catalog-manager__catalog-card">
                                 <div className="admin-catalog-manager__catalog-image">
                   {catalog.image ? (
                     <img src={`/${catalog.image}`} alt={catalog.name} />
                   ) : (
                     <div className="admin-catalog-manager__no-image">
                       Sin imagen
                     </div>
                   )}
                 </div>

                <div className="admin-catalog-manager__catalog-info">
                  <h4>{catalog.name}</h4>
                  <p>{catalog.description}</p>
                  
                  <div className="admin-catalog-manager__catalog-stats">
                    
                    <span className="admin-catalog-manager__stat">
                      🛍️ {catalog.products?.length || 0} productos
                    </span>
                  </div>

                  <div className="admin-catalog-manager__catalog-status">
                    <span className={`admin-catalog-manager__status-badge ${catalog.is_active ? 'active' : 'inactive'}`}>
                      {catalog.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                    <span className="admin-catalog-manager__order">
                      Orden: {catalog.display_order}
                    </span>
                  </div>
                </div>

                <div className="admin-catalog-manager__catalog-actions">
                  <button
                    className="admin-catalog-manager__action-btn admin-catalog-manager__action-btn--edit"
                    onClick={() => handleEdit(catalog)}
                    title="Editar catálogo"
                  >
                    ✏️
                  </button>
                  
                  <button
                    className="admin-catalog-manager__action-btn admin-catalog-manager__action-btn--pdf"
                    onClick={() => openPdfManager(catalog)}
                    title="Gestionar PDF"
                  >
                    📄
                  </button>
                  
                  <button
                    className="admin-catalog-manager__action-btn admin-catalog-manager__action-btn--offers"
                    onClick={() => openOffersManager(catalog)}
                    title="Gestionar ofertas"
                  >
                    🎯
                  </button>
                  
                  <button
                    className="admin-catalog-manager__action-btn admin-catalog-manager__action-btn--products"
                    onClick={() => openProductManager(catalog)}
                    title="Gestionar productos"
                  >
                    🛍️
                  </button>
                  
                  <button
                    className="admin-catalog-manager__action-btn admin-catalog-manager__action-btn--toggle"
                    onClick={() => handleToggleStatus(catalog.id)}
                    title={catalog.is_active ? 'Desactivar' : 'Activar'}
                  >
                    {catalog.is_active ? '🔴' : '🟢'}
                  </button>
                  
                  <button
                    className="admin-catalog-manager__action-btn admin-catalog-manager__action-btn--delete"
                    onClick={() => handleDelete(catalog.id)}
                    title="Eliminar catálogo"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Gestión de Productos */}
    </div>
  );
};

export default AdminCatalogManager;
