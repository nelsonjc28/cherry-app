import React, { useState, useRef, useEffect } from 'react';
import { catalogService } from '../../services/api';
import './CatalogPdfManager.css';

const CatalogPdfManager = ({ catalog, onClose, onPdfUpdated }) => {
  const [pdfImages, setPdfImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (catalog) {
      loadPdfImages();
    }
  }, [catalog]);

  const loadPdfImages = async () => {
    if (!catalog?.pdf_images) return;
    setPdfImages([...catalog.pdf_images]);
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // Validar tipos de archivo
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    );

    if (validFiles.length !== files.length) {
      window.showToast('Algunos archivos no son imágenes o PDF válidos', 'error');
      return;
    }

    uploadFiles(validFiles);
  };

  const uploadFiles = async (files) => {
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images[]', file);
      });

      const response = await catalogService.addPdfImages(catalog.id, formData);
      
      if (response.data.success) {
        window.showToast(`${files.length} archivo(s) subido(s) exitosamente`, 'success');
        await loadPdfImages();
        if (onPdfUpdated) {
          onPdfUpdated();
        }
      } else {
        setError(response.data.message || 'Error al subir archivos');
      }
    } catch (error) {
      console.error('Error al subir archivos:', error);
      setError('Error al subir archivos. Verifica que no excedan el tamaño máximo.');
    } finally {
      setUploading(false);
      // Limpiar el input de archivos
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async (imageId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta imagen?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await catalogService.removePdfImage(catalog.id, imageId);
      
      if (response.data.success) {
        window.showToast('Imagen eliminada exitosamente', 'success');
        await loadPdfImages();
        if (onPdfUpdated) {
          onPdfUpdated();
        }
      } else {
        setError(response.data.message || 'Error al eliminar imagen');
      }
    } catch (error) {
      console.error('Error al eliminar imagen:', error);
      setError('Error al eliminar imagen');
    } finally {
      setLoading(false);
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

    const newImages = [...pdfImages];
    const draggedItem = newImages[dragIndex];
    
    // Remover el elemento arrastrado
    newImages.splice(dragIndex, 1);
    // Insertar en la nueva posición
    newImages.splice(dropIndex, 0, draggedItem);
    
    // Actualizar el estado local
    setPdfImages(newImages);
    
    // Actualizar el orden en el backend
    try {
      const reorderData = newImages.map((image, index) => ({
        id: image.id,
        display_order: index + 1
      }));

      const response = await catalogService.reorderPdfImages(catalog.id, {
        type: 'pdf_images',
        items: reorderData
      });

      if (response.data.success) {
        window.showToast('Orden actualizado exitosamente', 'success');
        if (onPdfUpdated) {
          onPdfUpdated();
        }
      } else {
        setError('Error al actualizar el orden');
        // Revertir cambios si falla
        await loadPdfImages();
      }
    } catch (error) {
      console.error('Error al reordenar:', error);
      setError('Error al actualizar el orden');
      await loadPdfImages();
    }

    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
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

  return (
    <div className="catalog-pdf-manager">
      <div className="catalog-pdf-manager__header">
        <div className="catalog-pdf-manager__title">
          <h3>Gestión de PDF</h3>
          <span className="catalog-pdf-manager__catalog-name">{catalog?.name}</span>
        </div>
        <button 
          className="catalog-pdf-manager__close-btn"
          onClick={onClose}
        >
          ×
        </button>
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

      <div className="catalog-pdf-manager__upload-section">
        <div className="catalog-pdf-manager__upload-info">
          <h4>Subir Archivos PDF</h4>
          <p>Sube imágenes (JPG, PNG, GIF) o archivos PDF para crear las páginas del catálogo</p>
        </div>
        
        <div className="catalog-pdf-manager__upload-actions">
          <button
            type="button"
            className="catalog-pdf-manager__upload-btn catalog-pdf-manager__add-btn"
            onClick={openFileDialog}
            disabled={uploading}
          >
            {uploading ? 'Subiendo...' : '+ Subir Archivos PDF'}
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <div className="catalog-pdf-manager__content">
        <div className="catalog-pdf-manager__images-header">
          <h4>Páginas del PDF ({pdfImages.length})</h4>
          <p>Arrastra y suelta para reordenar las páginas del catálogo</p>
        </div>

        {pdfImages.length === 0 ? (
          <div className="catalog-pdf-manager__empty">
            <p>No hay páginas PDF en este catálogo</p>
            <p>Sube archivos para crear las páginas del catálogo</p>
          </div>
        ) : (
          <div className="catalog-pdf-manager__images-grid">
            {pdfImages.map((image, index) => (
              <div
                key={image.id}
                className={`catalog-pdf-manager__image-item ${
                  dragIndex === index ? 'dragging' : ''
                } ${dragOverIndex === index ? 'drag-over' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <div className="catalog-pdf-manager__image-preview">
                  {image.image_path ? (
                    <img 
                      src={`/${image.image_path}`} 
                      alt={`Página ${index + 1}`}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <div className="catalog-pdf-manager__image-placeholder">
                    {getFileIcon(image.image_path?.includes('.pdf') ? 'application/pdf' : 'image')}
                  </div>
                </div>
                
                <div className="catalog-pdf-manager__image-info">
                  <div className="catalog-pdf-manager__image-details">
                    <span className="catalog-pdf-manager__image-name">
                      {image.image_name || `Página ${index + 1}`}
                    </span>
                    <span className="catalog-pdf-manager__image-type">
                      {getFileTypeName(image.image_path?.includes('.pdf') ? 'application/pdf' : 'image')}
                    </span>
                  </div>
                  
                  <div className="catalog-pdf-manager__image-actions">
                    <span className="catalog-pdf-manager__image-order">
                      Orden: {image.display_order || index + 1}
                    </span>
                    <button
                      type="button"
                      className="catalog-pdf-manager__remove-btn"
                      onClick={() => handleRemoveImage(image.id)}
                      disabled={loading}
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

      <div className="catalog-pdf-manager__footer">
        <button
          type="button"
          className="catalog-pdf-manager__done-btn catalog-pdf-manager__back-btn"
          onClick={onClose}
        >
          Volver a Catálogos
        </button>
      </div>
    </div>
  );
};

export default CatalogPdfManager;
