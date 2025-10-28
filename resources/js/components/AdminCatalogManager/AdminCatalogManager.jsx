import React, { useState, useEffect } from 'react';
import { catalogService } from '../../services/api';
import CatalogProductManager from './CatalogProductManager';
import CatalogPdfManager from './CatalogPdfManager';
import CatalogPdfModule from './CatalogPdfModule';
import CatalogOffersModule from './CatalogOffersModule';
import useUserStore from '../../store/userStore';
import Swal from 'sweetalert2';
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
    is_active: true
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {

    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    try {
      setLoading(true);
      const response = await catalogService.getAll();
      if (response.data.success) {
        // Ordenar catálogos por code (ascendente)
        // Los catálogos sin code se colocan al final
        const sortedCatalogs = [...response.data.data].sort((a, b) => {
          const codeA = parseInt(a.code) || 999999;
          const codeB = parseInt(b.code) || 999999;
          return codeA - codeB;
        });
        setCatalogs(sortedCatalogs);
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
        // Validar formato de imagen
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          setError('La imagen no cumple con los formatos permitidos. Formatos permitidos: JPEG, JPG, PNG, GIF, WebP');
          return;
        }
        
        // Validar tamaño (10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB en bytes
        if (file.size > maxSize) {
          setError('La imagen excede el tamaño máximo permitido (10MB)');
          return;
        }
        
        setError(''); // Limpiar error si la validación pasa
        setFormData(prev => ({ ...prev, [name]: file }));
        setImagePreview(URL.createObjectURL(file));
      }
    } else if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      // Convertir a número para inputs numéricos
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

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
        await fetchCatalogs();
      }
    } catch (error) {
      console.error('Error al guardar catálogo:', error);
      
      if (error.response?.status === 413) {
        setError('La imagen es demasiado grande. Por favor, usa una imagen más pequeña.');
      } else if (error.response?.data?.message) {
        setError(`Error: ${error.response.data.message}`);
      } else {
        setError('Error al guardar el catálogo. Por favor, inténtalo de nuevo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (catalog) => {
    setEditingCatalog(catalog);
    setFormData({
      name: catalog.name,
      description: catalog.description,
      code: catalog.code || '',
      image: null,
      is_active: catalog.is_active
    });
         setImagePreview(catalog.image ? `/${catalog.image}` : null);
    setShowForm(true);
    
    // 🚀 SCROLL AUTOMÁTICO HACIA ARRIBA al editar catálogo
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });;
    }, 100);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: '¿Quieres eliminar este catálogo? Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
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
    setFormData({
      name: '',
      description: '',
      code: '',
      image: null,
      is_active: true
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
              setShowForm(true);
              
              // 🚀 SCROLL AUTOMÁTICO HACIA ARRIBA al crear nuevo catálogo
              setTimeout(() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });;
              }, 100);
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
                <span className="image-dimensions-hint">
                  (Tamaño recomendado: 305 × 407 píxeles)
                </span>
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
            
            <div className="admin-catalog-manager__form-note">
              <small>
                ℹ️ El orden de visualización se determina por el código (ascendente). Los catálogos sin código se mostrarán al final.
              </small>
            </div>

            <div className="admin-catalog-manager__form-actions">
              <button 
                type="submit" 
                className="admin-catalog-manager__submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner-small"></span>
                    {editingCatalog ? 'Actualizando...' : 'Creando...'}
                  </>
                ) : (
                  editingCatalog ? 'Actualizar' : 'Crear'
                )}
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
                   {catalog.image_url && !catalog.image_url.includes('placeholder') ? (
                     <img 
                       src={catalog.image_url} 
                       alt={catalog.name}
                       onLoad={() => {}}
                       onError={(e) => {

                         e.target.style.display = 'none';
                         e.target.nextSibling.style.display = 'flex';
                       }}
                     />
                   ) : null}
                   <div 
                     className="admin-catalog-manager__no-image"
                     style={{ display: (catalog.image_url && !catalog.image_url.includes('placeholder')) ? 'none' : 'flex' }}
                   >
                     {catalog.image_url && !catalog.image_url.includes('placeholder') ? 'Error al cargar imagen' : 'Sin imagen'}
                   </div>
                 </div>

                <div className="admin-catalog-manager__catalog-info">
                  <h4>{catalog.name}</h4>
                  <p>{catalog.description}</p>
                  
                  <div className="admin-catalog-manager__catalog-stats">
                    <span className="admin-catalog-manager__stat">
                      🖼️ {catalog.pdfs?.length || 0} imágenes
                    </span>
                    <span className="admin-catalog-manager__stat">
                      🛍️ {catalog.products?.length || 0} productos
                    </span>
                  </div>

                  <div className="admin-catalog-manager__catalog-status">
                    <span className={`admin-catalog-manager__status-badge ${catalog.is_active ? 'active' : 'inactive'}`}>
                      {catalog.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                    {catalog.code && (
                      <span className="admin-catalog-manager__order">
                        Código: {catalog.code}
                      </span>
                    )}
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
                    title="Gestionar Imágenes del Catálogo"
                  >
                    🖼️
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
