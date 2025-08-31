import React, { useState, useEffect } from 'react';
import { catalogService } from '../../services/api';
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

    // Validar tipos de archivo y tamaño - ahora solo PDFs
    const maxSize = 2 * 1024 * 1024; // 2MB en bytes
    const validFiles = [];
    const invalidFiles = [];
    const oversizedFiles = [];

    files.forEach(file => {
      const isValidType = file.type === 'application/pdf';
      const isValidSize = file.size <= maxSize;

      if (!isValidType) {
        invalidFiles.push(file.name);
      } else if (!isValidSize) {
        oversizedFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    // Mostrar errores específicos
    if (invalidFiles.length > 0) {
      window.showToast(`Los siguientes archivos no son PDFs válidos: ${invalidFiles.join(', ')}`, 'error');
      return;
    }

    if (oversizedFiles.length > 0) {
      window.showToast(`Los siguientes archivos exceden el tamaño máximo (2MB): ${oversizedFiles.join(', ')}`, 'error');
      return;
    }

    if (validFiles.length === 0) {
      window.showToast('No hay archivos válidos para subir', 'error');
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
        formData.append('pdfs[]', file);
      });

      const response = await catalogService.addPdfs(selectedCatalog.id, formData);
      
      if (response.data.success) {
        const count = files.length;
        const message = count === 1 ? 'PDF subido exitosamente' : `${count} PDFs subidos exitosamente`;
        window.showToast(message, 'success');
        
        // Actualizar el estado local inmediatamente con los nuevos PDFs
        const newPdfs = response.data.data || [];
        setSelectedCatalog(prev => ({
          ...prev,
          pdfs: [...(prev.pdfs || []), ...newPdfs]
        }));
        
        // También actualizar la lista de catálogos para mantener sincronizados los contadores
        await fetchCatalogs();
      } else {
        setError(response.data.message || 'Error al subir archivos');
      }
    } catch (error) {
      if (error.response && error.response.data) {
        setError(`Error al subir PDFs: ${error.response.data.message || error.message}`);
      } else {
        setError('Error al subir PDFs. Verifica que sean archivos válidos.');
      }
    } finally {
      setUploading(false);
      // Limpiar el input de archivos
      if (event && event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRemovePdf = async (pdfId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este PDF?')) {
      return;
    }

    try {
      const response = await catalogService.removePdf(selectedCatalog.id, pdfId);
      
      if (response.data.success) {
        window.showToast('PDF eliminado exitosamente', 'success');
        
        // Actualizar el estado local inmediatamente removiendo el PDF
        setSelectedCatalog(prev => ({
          ...prev,
          pdfs: prev.pdfs.filter(pdf => pdf.id !== pdfId)
        }));
        
        // También actualizar la lista de catálogos para mantener sincronizados los contadores
        await fetchCatalogs();
      } else {
        setError(response.data.message || 'Error al eliminar PDF');
      }
    } catch (error) {
      setError('Error al eliminar PDF');
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
            <h2>Gestión de Catálogos PDF</h2>
          </div>
                     <p className="catalog-pdf-module__subtitle">
             Gestiona los PDFs de todos tus catálogos
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
                    {catalog.image ? (
                      <img src={`/${catalog.image}`} alt={catalog.name} />
                    ) : (
                      <div className="catalog-pdf-module__no-image">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  <div className="catalog-pdf-module__catalog-info">
                    <h4>{catalog.name}</h4>
                    <p>{catalog.description}</p>
                    
                                         <div className="catalog-pdf-module__catalog-stats">
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
          <h2>Gestionar PDF: {selectedCatalog?.name}</h2>
        </div>
                 <p className="catalog-pdf-module__subtitle">
           Sube y gestiona los PDFs del catálogo
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
          <h4>Subir PDFs</h4>
          <p>Sube archivos PDF para crear el catálogo</p>
        </div>
        
        <div className="catalog-pdf-module__upload-actions">
          <label className="catalog-pdf-module__upload-btn catalog-pdf-module__add-btn">
            {uploading ? 'Subiendo...' : '+ Subir PDFs'}
            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <div className="catalog-pdf-module__content">
                 <div className="catalog-pdf-module__images-header">
           <h4>PDFs del catálogo</h4>
           <p>Arrastra y suelta para reordenar los PDFs del catálogo</p>
         </div>

                 {!selectedCatalog?.pdfs || selectedCatalog.pdfs.length === 0 ? (
           <div className="catalog-pdf-module__empty">
             <p>No hay PDFs en este catálogo</p>
             <p>Sube PDFs para crear el catálogo</p>
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
                <div className="catalog-pdf-module__image-preview">
                  <div className="catalog-pdf-module__image-placeholder">
                    📄
                  </div>
                </div>
                
                <div className="catalog-pdf-module__image-info">
                  <div className="catalog-pdf-module__image-details">
                    <span className="catalog-pdf-module__image-name">
                      {pdf.pdf_name || `PDF ${index + 1}`}
                    </span>
                    <span className="catalog-pdf-module__image-type">
                      PDF
                    </span>
                  </div>
                  
                  <div className="catalog-pdf-module__image-actions">
                    <span className="catalog-pdf-module__image-order">
                      Orden: {pdf.display_order || index + 1}
                    </span>
                    <button
                      type="button"
                      className="catalog-pdf-module__remove-btn"
                      onClick={() => handleRemovePdf(pdf.id)}
                      title="Eliminar archivo"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogPdfModule;
