import React, { useState, useEffect } from 'react';
import { catalogService } from '../../services/api';
import PdfThumbnail from '../PdfThumbnail/PdfThumbnail';
import './CatalogPdfModule.css';

const CatalogPdfModule = ({ onBack, initialCatalog = null }) => {
  const [catalogs, setCatalogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCatalog, setSelectedCatalog] = useState(initialCatalog);
  const [currentView, setCurrentView] = useState(initialCatalog ? 'detail' : 'list'); // 'list' o 'detail'
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    if (initialCatalog) {
      // Si tenemos un catálogo inicial, ir directo a la gestión
      setSelectedCatalog(initialCatalog);
      setCurrentView('detail');
      setLoading(false);
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
    setCurrentView('detail');
  };

  const handleBackToList = () => {
    setSelectedCatalog(null);
    setCurrentView('list');
    setError('');
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

      const response = await catalogService.addPdfs(selectedCatalog.id, formData);
      
      if (response.data.success) {
        window.showToast(`${files.length} imagen(es) subida(s) exitosamente`, 'success');
        
        // Actualizar el estado local inmediatamente con las nuevas imágenes
        const newImages = response.data.data || [];
        setSelectedCatalog(prev => ({
          ...prev,
          pdfs: [...(prev.pdfs || []), ...newImages]
        }));
        
        // También actualizar la lista de catálogos para mantener sincronizados los contadores
        await fetchCatalogs();
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
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta imagen?')) {
      return;
    }

    try {
      const response = await catalogService.removePdf(selectedCatalog.id, pdfId);
      
      if (response.data.success) {
        window.showToast('Imagen eliminada exitosamente', 'success');
        
        // Actualizar el estado local inmediatamente removiendo la imagen
        setSelectedCatalog(prev => ({
          ...prev,
          pdfs: prev.pdfs.filter(pdf => pdf.id !== pdfId)
        }));
        
        // También actualizar la lista de catálogos para mantener sincronizados los contadores
        await fetchCatalogs();
      } else {
        setError(response.data.message || 'Error al eliminar imagen');
      }
    } catch (error) {
      setError('Error al eliminar imagen');
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

    const pdfs = selectedCatalog.pdfs || [];
    const newPdfs = [...pdfs];
    const draggedItem = newPdfs[dragIndex];
    
    // Remover el elemento arrastrado
    newPdfs.splice(dragIndex, 1);
    // Insertar en la nueva posición
    newPdfs.splice(dropIndex, 0, draggedItem);
    
    // Actualizar el estado local
    setSelectedCatalog(prev => ({
      ...prev,
      pdfs: newPdfs
    }));
    
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
        await fetchCatalogs(); // Recargar para actualizar contadores
      } else {
        setError('Error al actualizar el orden');
        // Revertir cambios si falla
        await fetchCatalogs();
      }
    } catch (error) {
      setError('Error al actualizar el orden');
      await fetchCatalogs();
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

  // Vista de detalle del catálogo
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
          <h2>Gestionar Imágenes: {selectedCatalog?.name}</h2>
        </div>
                 <p className="catalog-pdf-module__subtitle">
           Sube y gestiona las imágenes del catálogo
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
           <h4>Imágenes del catálogo ({selectedCatalog?.pdfs?.length || 0})</h4>
           <p>Gestiona las imágenes del catálogo. Arrastra y suelta para reordenar.</p>
         </div>

                 {!selectedCatalog?.pdfs || selectedCatalog.pdfs.length === 0 ? (
           <div className="catalog-pdf-module__empty">
             <p>No hay imágenes en este catálogo</p>
             <p>Sube imágenes para crear las páginas del catálogo</p>
           </div>
         ) : (
          <div className="catalog-pdf-module__images-grid">
            {selectedCatalog.pdfs.map((pdf, index) => (
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
