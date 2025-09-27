import React, { useState, useEffect } from 'react';
import { catalogService, publicCatalogService } from '../../services/api';
import PdfThumbnail from '../PdfThumbnail/PdfThumbnail';
import Swal from 'sweetalert2';
import './CatalogPdfModule.css';

const CatalogPdfModule = ({ onBack, initialCatalog = null }) => {
  const [catalogs, setCatalogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCatalog, setSelectedCatalog] = useState(initialCatalog);
  const [currentView, setCurrentView] = useState(initialCatalog ? 'groups' : 'list'); // 'list', 'groups', 'detail'
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  
  // Estados para grupos de imágenes
  const [imageGroups, setImageGroups] = useState([]);
  const [selectedImageGroup, setSelectedImageGroup] = useState(null);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    display_order: 0
  });
  
  // Estados para imágenes del grupo seleccionado
  const [groupImages, setGroupImages] = useState([]);
  const [groupImagesLoading, setGroupImagesLoading] = useState(false);

  useEffect(() => {
    if (initialCatalog) {
      // Si tenemos un catálogo inicial, ir directo a la gestión de grupos
      setSelectedCatalog(initialCatalog);
      setCurrentView('groups');
      setLoading(false);
      fetchImageGroups(initialCatalog.id);
    } else {
      // Si no, cargar la lista de catálogos
      fetchCatalogs();
    }
  }, [initialCatalog]);

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

  const handleCatalogSelect = (catalog) => {
    setSelectedCatalog(catalog);
    setCurrentView('groups');
    fetchImageGroups(catalog.id);
  };

  const handleBackToList = () => {
    setSelectedCatalog(null);
    setSelectedImageGroup(null);
    setImageGroups([]);
    setCurrentView('list');
    setError('');
  };

  const handleBackToGroups = () => {
    setSelectedImageGroup(null);
    setGroupImages([]);
    setCurrentView('groups');
    setError('');
  };

  // Funciones para grupos de imágenes
  const fetchImageGroups = async (catalogId) => {
    try {
      setGroupsLoading(true);
      const response = await publicCatalogService.getCatalogImageGroups(catalogId);
      if (response.data.success) {
        setImageGroups(response.data.data.image_groups || []);
      }
    } catch (error) {
      setError('Error al cargar los grupos de imágenes');
    } finally {
      setGroupsLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupFormData.name.trim()) {
      setError('El nombre del grupo es obligatorio');
      return;
    }

    try {
      setGroupsLoading(true);
      setError('');
      
      // Hacer petición al backend para crear el grupo
      const response = await publicCatalogService.createImageGroup(selectedCatalog.id, groupFormData);
      
      if (response.data.success) {
        // Agregar el nuevo grupo a la lista
        setImageGroups([...imageGroups, response.data.data]);
        setGroupFormData({ name: '', description: '', is_active: true, display_order: 0 });
        setShowGroupForm(false);
        window.showToast('Grupo creado exitosamente', 'success');
      } else {
        setError(response.data.message || 'Error al crear el grupo');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error al crear el grupo';
      setError(errorMessage);
      window.showToast(errorMessage, 'error');
    } finally {
      setGroupsLoading(false);
    }
  };

  const handleSelectImageGroup = (group) => {
    setSelectedImageGroup(group);
    setCurrentView('detail');
    fetchGroupImages(selectedCatalog.id, group.id);
  };

  const handleDeleteGroup = async (groupId) => {
    const result = await Swal.fire({
      title: '¿Eliminar grupo?',
      text: 'Esta acción no se puede deshacer y eliminará todas las imágenes asociadas al grupo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setGroupsLoading(true);
      setError('');
      
      const response = await catalogService.deleteImageGroup(selectedCatalog.id, groupId);
      
      if (response.data.success) {
        // Remover el grupo de la lista local
        setImageGroups(imageGroups.filter(group => group.id !== groupId));
        
        Swal.fire({
          title: '¡Eliminado!',
          text: 'El grupo ha sido eliminado exitosamente.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        setError(response.data.message || 'Error al eliminar el grupo');
        Swal.fire({
          title: 'Error',
          text: response.data.message || 'Error al eliminar el grupo',
          icon: 'error'
        });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Error al eliminar el grupo';
      setError(errorMessage);
      Swal.fire({
        title: 'Error',
        text: errorMessage,
        icon: 'error'
      });
    } finally {
      setGroupsLoading(false);
    }
  };

  // Función para cargar las imágenes de un grupo específico
  const fetchGroupImages = async (catalogId, groupId) => {
    try {
      setGroupImagesLoading(true);
      const response = await publicCatalogService.getImageGroupImages(catalogId, groupId);
      if (response.data.success) {
        setGroupImages(response.data.data.images || []);
      }
    } catch (error) {
      setError('Error al cargar las imágenes del grupo');
      console.error('Error fetching group images:', error);
    } finally {
      setGroupImagesLoading(false);
    }
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Validar tipos de archivo - solo imágenes
    const validFiles = files.filter(file => 
      file.type.startsWith('image/')
    );

    if (validFiles.length !== files.length) {
      window.showToast('Solo se permiten archivos de imagen (JPG, PNG, GIF, WebP)', 'error');
      return;
    }

    await uploadFiles(validFiles);
  };

  const uploadFiles = async (files) => {
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images[]', file);
      });
      
      // Si estamos en la vista de detalle de un grupo, asociar las imágenes a ese grupo
      if (selectedImageGroup && selectedImageGroup.id) {
        formData.append('image_group_id', selectedImageGroup.id);
      }

      const response = await catalogService.addPdfs(selectedCatalog.id, formData);
      
      if (response.data.success) {
        window.showToast(`${files.length} imagen(es) subida(s) exitosamente`, 'success');
        
        // Actualizar el estado local inmediatamente con las nuevas imágenes
        const newImages = response.data.data || [];
        
        // Si estamos en la vista de detalle de un grupo, actualizar groupImages
        if (selectedImageGroup) {
          setGroupImages(prev => [...prev, ...newImages]);
        }
        
        // También actualizar la lista de catálogos para mantener sincronizados los contadores
        if (!initialCatalog) {
          await fetchCatalogs();
        }
      } else {
        setError(response.data.message || 'Error al subir imágenes');
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      let errorMessage = 'Error al subir imágenes';
      
      if (error.response?.status === 413) {
        errorMessage = 'El archivo es demasiado grande. El tamaño máximo permitido es 2MB por imagen.';
      } else if (error.response?.status === 422) {
        errorMessage = error.response.data?.message || 'Error de validación en los archivos';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      window.showToast(errorMessage, 'error');
    } finally {
      setUploading(false);
      // Limpiar el input de archivos después de un pequeño delay para asegurar que se procese
      setTimeout(() => {
        if (event && event.target) {
          event.target.value = '';
        }
      }, 100);
    }
  };

  const handleRemovePdf = async (pdfId) => {
    const result = await Swal.fire({
      title: '¿Eliminar imagen?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const response = await catalogService.removePdf(selectedCatalog.id, pdfId);
      
      if (response.data.success) {
        // Actualizar el estado local inmediatamente removiendo la imagen
        setGroupImages(prev => prev.filter(pdf => pdf.id !== pdfId));
        
        Swal.fire({
          title: '¡Eliminada!',
          text: 'La imagen ha sido eliminada exitosamente.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        setError(response.data.message || 'Error al eliminar imagen');
        Swal.fire({
          title: 'Error',
          text: response.data.message || 'Error al eliminar imagen',
          icon: 'error'
        });
      }
    } catch (error) {
      setError('Error al eliminar imagen');
      Swal.fire({
        title: 'Error',
        text: 'Error al eliminar imagen',
        icon: 'error'
      });
    }
  };

  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const pdfs = groupImages || [];
    const newPdfs = [...pdfs];
    const draggedItem = newPdfs[dragIndex];
    
    // Remover el elemento arrastrado
    newPdfs.splice(dragIndex, 1);
    // Insertar en la nueva posición
    newPdfs.splice(dropIndex, 0, draggedItem);
    
    // Actualizar el estado local
    setGroupImages(newPdfs);
    
    // Actualizar el orden en el backend
    try {
      const reorderData = newPdfs.map((pdf, index) => ({
        id: pdf.id,
        display_order: index + 1
      }));

      const response = await catalogService.reorderPdfs(selectedCatalog.id, {
        type: 'pdfs',
        items: reorderData
      });

      if (response.data.success) {
        window.showToast('Orden actualizado exitosamente', 'success');
      } else {
        setError('Error al actualizar el orden');
        // Revertir cambios si falla
        setGroupImages(pdfs);
      }
    } catch (error) {
      setError('Error al actualizar el orden');
      setGroupImages(pdfs);
    }

    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const getFileIcon = (fileType) => {
    if (fileType === 'application/pdf') {
      return '📄';
    }
    return '🖼️';
  };

  const getFileTypeName = (fileType) => {
    if (fileType === 'application/pdf') {
      return 'PDF';
    }
    return 'Imagen';
  };

  // Vista de lista de catálogos
  if (currentView === 'list') {
    return (
      <div className="catalog-pdf-module">
        <div className="catalog-pdf-module__header">
          <div className="catalog-pdf-module__title">
            <button 
              className="catalog-pdf-module__back-btn"
              onClick={onBack}
              title="Volver al panel principal"
            >
              ←
            </button>
            <h2>Gestión de Imágenes de Catálogos</h2>
          </div>
                     <p className="catalog-pdf-module__subtitle">
             Gestiona las imágenes de todos tus catálogos
           </p>
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

        {loading ? (
          <div className="catalog-pdf-module__loading">
            <div className="spinner"></div>
            <p>Cargando catálogos...</p>
          </div>
                 ) : catalogs.length === 0 ? (
           <div className="catalog-pdf-module__empty">
             <p>No hay catálogos creados</p>
             <p>Crea catálogos primero para poder gestionar sus imágenes</p>
           </div>
         ) : (
          <div className="catalog-pdf-module__catalogs">
            <div className="catalog-pdf-module__catalogs-grid">
              {catalogs.map((catalog) => (
                <div key={catalog.id} className="catalog-pdf-module__catalog-card">
                  <div className="catalog-pdf-module__catalog-image">
                    {catalog.image_url && !catalog.image_url.includes('placeholder') ? (
                      <img 
                        src={catalog.image_url} 
                        alt={catalog.name}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="catalog-pdf-module__no-image"
                      style={{ display: (catalog.image_url && !catalog.image_url.includes('placeholder')) ? 'none' : 'flex' }}
                    >
                      {catalog.image_url && !catalog.image_url.includes('placeholder') ? 'Error al cargar imagen' : 'Sin imagen'}
                    </div>
                  </div>

                  <div className="catalog-pdf-module__catalog-info">
                    <h4>{catalog.name}</h4>
                    <p>{catalog.description}</p>
                    
                                         <div className="catalog-pdf-module__catalog-stats">
                       <span className="catalog-pdf-module__stat">
                         🖼️ {catalog.pdfs?.length || 0} imágenes
                       </span>
                       <span className="catalog-pdf-module__stat">
                         🛍️ {catalog.products?.length || 0} productos
                       </span>
                     </div>

                    <div className="catalog-pdf-module__catalog-status">
                      <span className={`catalog-pdf-module__status-badge ${catalog.is_active ? 'active' : 'inactive'}`}>
                        {catalog.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                      <span className="catalog-pdf-module__order">
                        Orden: {catalog.display_order}
                      </span>
                    </div>
                  </div>

                  <div className="catalog-pdf-module__catalog-actions">
                    <button
                      className="catalog-pdf-module__action-btn catalog-pdf-module__action-btn--pdf"
                      onClick={() => handleCatalogSelect(catalog)}
                      title="Gestionar PDF de este catálogo"
                    >
                      📄
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Vista de gestión de grupos de imágenes
  if (currentView === 'groups' && selectedCatalog) {
    return (
      <div className="catalog-pdf-module">
        <div className="catalog-pdf-module__header">
          <div className="catalog-pdf-module__title">
            <button 
              className="catalog-pdf-module__back-btn"
              onClick={handleBackToList}
              title="Volver a la lista de catálogos"
            >
              ←
            </button>
            <h2>Grupos de Imágenes: {selectedCatalog.name}</h2>
          </div>
          <p className="catalog-pdf-module__subtitle">
            Organiza las imágenes en grupos temáticos
          </p>
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

        {/* Formulario para crear grupo */}
        {showGroupForm && (
          <div className="catalog-pdf-module__group-form">
            <h4>Crear Nuevo Grupo</h4>
            <form onSubmit={handleCreateGroup}>
              <div className="form-group">
                <label>Nombre del Grupo *</label>
                <input
                  type="text"
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({...groupFormData, name: e.target.value})}
                  placeholder="Ej: Colección Principal, Detalles, Colores..."
                  required
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={groupFormData.description}
                  onChange={(e) => setGroupFormData({...groupFormData, description: e.target.value})}
                  placeholder="Descripción del grupo de imágenes..."
                  rows="3"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Crear Grupo</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowGroupForm(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Botón para crear grupo */}
        {!showGroupForm && (
          <div className="catalog-pdf-module__actions">
            <button 
              className="catalog-pdf-module__add-btn"
              onClick={() => setShowGroupForm(true)}
            >
              + Crear Nuevo Grupo
            </button>
          </div>
        )}

        {/* Lista de grupos */}
        <div className="catalog-pdf-module__content">
          <div className="catalog-pdf-module__groups-header">
            <h4>Grupos de Imágenes ({imageGroups.length})</h4>
            <p>Haz clic en un grupo para gestionar sus imágenes</p>
          </div>

          {groupsLoading ? (
            <div className="catalog-pdf-module__loading">
              <div className="spinner"></div>
              <p>Cargando grupos...</p>
            </div>
          ) : imageGroups.length === 0 ? (
            <div className="catalog-pdf-module__empty">
              <p>No hay grupos de imágenes creados</p>
              <p>Crea grupos para organizar mejor las imágenes del catálogo</p>
            </div>
          ) : (
            <div className="catalog-pdf-module__groups-grid">
              {imageGroups.map((group) => (
                <div key={group.id} className="catalog-pdf-module__group-card">
                  <div className="catalog-pdf-module__group-info">
                    <h4>{group.name}</h4>
                    <p>{group.description || 'Sin descripción'}</p>
                    <div className="catalog-pdf-module__group-stats">
                      <span>🖼️ {group.images_count || 0} imágenes</span>
                      <span className={`status ${group.is_active ? 'active' : 'inactive'}`}>
                        {group.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                  <div className="catalog-pdf-module__group-actions">
                    <button
                      className="catalog-pdf-module__action-btn"
                      onClick={() => handleSelectImageGroup(group)}
                      title="Gestionar imágenes de este grupo"
                    >
                      📁 Gestionar Imágenes
                    </button>
                    <button
                      className="catalog-pdf-module__action-btn catalog-pdf-module__action-btn--delete"
                      onClick={() => handleDeleteGroup(group.id)}
                      title="Eliminar grupo"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vista de detalle del catálogo (imágenes de un grupo específico)
  return (
    <div className="catalog-pdf-module">
      <div className="catalog-pdf-module__header">
        <div className="catalog-pdf-module__title">
          <button 
            className="catalog-pdf-module__back-btn"
            onClick={handleBackToGroups}
            title="Volver a los grupos"
          >
            ←
          </button>
          <h2>Imágenes: {selectedImageGroup?.name || selectedCatalog?.name}</h2>
        </div>
        <p className="catalog-pdf-module__subtitle">
          {selectedImageGroup 
            ? `Gestiona las imágenes del grupo "${selectedImageGroup.name}"` 
            : 'Sube y gestiona las imágenes del catálogo'
          }
        </p>
        <div className="catalog-pdf-module__header-actions">
          <button 
            className="catalog-pdf-module__view-all-btn"
            onClick={handleBackToList}
            title="Ver todos los catálogos"
          >
            📋 Ver Todos los Catálogos
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

      <div className="catalog-pdf-module__upload-section">
        <div className="catalog-pdf-module__upload-info">
          <h4>Subir Imágenes</h4>
          <p>Sube imágenes (JPG, PNG, GIF, WebP) para crear las páginas del catálogo. Puedes subir múltiples imágenes a la vez.</p>
        </div>
        
        <div className="catalog-pdf-module__upload-actions">
          <label className="catalog-pdf-module__upload-btn catalog-pdf-module__add-btn">
            {uploading ? 'Subiendo...' : '+ Subir Imágenes'}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <div className="catalog-pdf-module__content">
        <div className="catalog-pdf-module__images-header">
          <h4>
            Imágenes del grupo "{selectedImageGroup?.name}" ({groupImages.length || 0})
          </h4>
          <p>Gestiona las imágenes de este grupo. Arrastra y suelta para reordenar.</p>
        </div>

        {groupImagesLoading ? (
          <div className="catalog-pdf-module__loading">
            <p>Cargando imágenes del grupo...</p>
          </div>
        ) : !groupImages || groupImages.length === 0 ? (
          <div className="catalog-pdf-module__empty">
            <p>No hay imágenes en este grupo</p>
            <p>Sube imágenes para agregar contenido al grupo "{selectedImageGroup?.name}"</p>
          </div>
        ) : (
          <div className="catalog-pdf-module__images-grid">
            {groupImages.map((pdf, index) => (
              <div
                key={pdf.id}
                className={`catalog-pdf-module__image-item ${
                  dragIndex === index ? 'dragging' : ''
                } ${dragOverIndex === index ? 'drag-over' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <PdfThumbnail
                  image={pdf}
                  selected={false}
                  onClick={() => {}}
                  onRemove={handleRemovePdf}
                  showRemoveButton={true}
                  isDragging={dragIndex === index}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogPdfModule;
