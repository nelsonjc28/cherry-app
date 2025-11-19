import React, { useState, useRef, useEffect } from 'react';
import { catalogService } from '../../services/api';
import PdfThumbnail from '../PdfThumbnail/PdfThumbnail';
import Swal from 'sweetalert2';
import './CatalogPdfManager.css';

const CatalogPdfManager = ({ catalog, onClose, onPdfUpdated }) => {
  const [catalogImages, setCatalogImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [catalogName, setCatalogName] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (catalog) {
      loadCatalogImages();
      setCatalogName(catalog.name);
    }
  }, [catalog]);

  const loadCatalogImages = async () => {
    if (!catalog?.pdfs) return;
    setCatalogImages([...catalog.pdfs]);
  };

  const handleFileSelect = (event) => {
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
      
      // Agregar nombre del catálogo si se especificó
      if (catalogName) {
        formData.append('catalog_name', catalogName);
      }

      const response = await catalogService.addPdfs(catalog.id, formData);
      
      if (response.data.success) {
        window.showToast(`${files.length} imagen(es) subida(s) exitosamente`, 'success');
        await loadCatalogImages();
        if (onPdfUpdated) {
          onPdfUpdated();
        }
      } else {
        setError(response.data.message || 'Error al subir imágenes');
        window.showToast(response.data.message || 'Error al subir imágenes', 'error');
      }
    } catch (error) {
      
      let errorMessage = 'Error al subir imágenes';
      
      if (error.response?.status === 413) {
        errorMessage = 'El archivo es demasiado grande. El tamaño máximo permitido es 2MB por imagen.';
      } else if (error.response?.status === 422) {
        errorMessage = error.response.data?.message || 'Error de validación en los archivos';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setError(errorMessage);
      window.showToast(errorMessage, 'error');
    } finally {
      setUploading(false);
      // Limpiar el input de archivos después de un pequeño delay para asegurar que se procese
      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 100);
    }
  };

  const handleRemoveImage = async (imageId) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: '¿Quieres eliminar esta imagen? Esta acción no se puede deshacer.',
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

    setLoading(true);
    try {
      const response = await catalogService.removePdf(catalog.id, imageId);
      
      if (response.data.success) {
        window.showToast('Imagen eliminada exitosamente', 'success');
        await loadCatalogImages();
        if (onPdfUpdated) {
          onPdfUpdated();
        }
      } else {
        setError(response.data.message || 'Error al eliminar imagen');
      }
    } catch (error) {
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

    const newImages = [...catalogImages];
    const draggedItem = newImages[dragIndex];
    
    // Remover el elemento arrastrado
    newImages.splice(dragIndex, 1);
    // Insertar en la nueva posición
    newImages.splice(dropIndex, 0, draggedItem);
    
    // Actualizar el estado local
    setCatalogImages(newImages);
    
    // Actualizar el orden en el backend
    try {
      const reorderData = newImages.map((image, index) => ({
        id: image.id,
        display_order: index + 1
      }));

      const response = await catalogService.reorder(catalog.id, {
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
        await loadCatalogImages();
      }
    } catch (error) {
      setError('Error al actualizar el orden');
      await loadCatalogImages();
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

  const resetUploadState = () => {
    setUploading(false);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = () => {
    return '🖼️';
  };

  const getFileTypeName = () => {
    return 'Imagen';
  };

  return (
    <div className="catalog-pdf-manager">
      <div className="catalog-pdf-manager__header">
        <div className="catalog-pdf-manager__title">
          <h3>Gestión de Imágenes del Catálogo</h3>
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
          <h4>Subir Imágenes del Catálogo</h4>
          <p>Sube imágenes (JPG, PNG, GIF, WebP) para crear las páginas del catálogo</p>
          
          <div className="catalog-pdf-manager__catalog-name-input">
            <label htmlFor="catalog-name">Nombre del catálogo (opcional):</label>
            <input
              id="catalog-name"
              type="text"
              value={catalogName}
              onChange={(e) => setCatalogName(e.target.value)}
              placeholder="Ej: Catálogo Primavera 2024"
              className="catalog-pdf-manager__name-input"
            />
          </div>
        </div>
        
        <div className="catalog-pdf-manager__upload-actions">
          <button
            type="button"
            className="catalog-pdf-manager__upload-btn catalog-pdf-manager__add-btn"
            onClick={openFileDialog}
            disabled={uploading}
          >
            {uploading ? 'Subiendo...' : '+ Subir Imágenes'}
          </button>
          
          {error && (
            <button
              type="button"
              className="catalog-pdf-manager__retry-btn"
              onClick={resetUploadState}
            >
              Reintentar
            </button>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <div className="catalog-pdf-manager__content">
        <div className="catalog-pdf-manager__images-header">
          <h4>Imágenes del Catálogo ({catalogImages.length})</h4>
          <p>Arrastra y suelta para reordenar las imágenes del catálogo</p>
        </div>

        {catalogImages.length === 0 ? (
          <div className="catalog-pdf-manager__empty">
            <p>No hay imágenes en este catálogo</p>
            <p>Sube imágenes para crear las páginas del catálogo</p>
          </div>
        ) : (
          <div className="catalog-pdf-manager__images-grid">
            {catalogImages.map((image, index) => (
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
                <PdfThumbnail
                  image={image}
                  selected={false}
                  onClick={() => {}}
                  onRemove={handleRemoveImage}
                  showRemoveButton={true}
                  isDragging={dragIndex === index}
                />
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
