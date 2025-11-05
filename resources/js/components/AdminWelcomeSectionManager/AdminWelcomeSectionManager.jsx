import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Swal from 'sweetalert2';
import { welcomeSectionService, formDataUtils } from '../../services/api';
import './AdminWelcomeSectionManager.css';

const AdminWelcomeSectionManager = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    button_text: '',
    button_url: '',
    is_active: true,
    display_order: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Memoizar la función fetchSections para evitar recreaciones
  const fetchSections = useCallback(async () => {
    try {
      setLoading(true);
      const response = await welcomeSectionService.getAll();
      // Ordenar secciones por display_order
      const sortedSections = (response.data.sections || [])
        .sort((a, b) => a.display_order - b.display_order);
      setSections(sortedSections);
    } catch (err) {
      setError(err.message);
      if (window.showToast) {
        window.showToast('Error al cargar secciones: ' + err.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  // Memoizar la función handleSubmit
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      // Validar que se haya seleccionado una imagen para nuevas secciones
      if (!editingSection && !imageFile) {
        setError('Por favor selecciona una imagen para la sección');
        if (window.showToast) {
          window.showToast('Por favor selecciona una imagen para la sección', 'error');
        }
        return;
      }
      
      // Validar campos requeridos usando las utilidades
      try {
        const tempFormData = formDataUtils.createFromObject(formData, { trim: true });
        formDataUtils.validateRequired(tempFormData, ['title', 'subtitle', 'button_text', 'button_url']);
      } catch (validationError) {
        setError(validationError.message);
        if (window.showToast) {
          window.showToast(validationError.message, 'error');
        }
        return;
      }
      
      // Crear FormData usando las utilidades
      const formDataObj = formDataUtils.createFromObject(formData, {
        trim: true,
        skipEmpty: false
      });
      
      // Agregar imagen si existe
      if (imageFile) {
        formDataObj.append('image', imageFile);
      }

      let response;
      if (editingSection) {
        // Actualizar sección existente
        response = await welcomeSectionService.update(editingSection.id, formDataObj);
      } else {
        // Crear nueva sección
        response = await welcomeSectionService.create(formDataObj);
      }

      if (response.data.success) {
        if (window.showToast) {
          window.showToast(
            editingSection 
              ? 'Sección actualizada exitosamente' 
              : 'Sección creada exitosamente', 
            'success'
          );
        }
        
        // Actualizar la lista de secciones
        fetchSections();
        resetForm();
      } else {
        setError(response.data.message || 'Error al procesar la sección');
        if (window.showToast) {
          window.showToast(response.data.message || 'Error al procesar la sección', 'error');
        }
      }
    } catch (error) {
      setError('Error al guardar la sección: ' + (error.message || 'Error desconocido'));
      if (window.showToast) {
        window.showToast('Error al guardar la sección: ' + (error.message || 'Error desconocido'), 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }, [editingSection, imageFile, formData, fetchSections]);

  // Memoizar la función handleEdit
  const handleEdit = useCallback((section) => {
    setEditingSection(section);
    setFormData({
      title: section.title,
      subtitle: section.subtitle,
      button_text: section.button_text,
      button_url: section.button_url,
      is_active: section.is_active,
      display_order: section.display_order
    });
    setImagePreview(section.image_path ? `/${section.image_path}` : null);
    setShowForm(true);
    
    if (window.showToast) {
      window.showToast(`Editando sección: ${section.title}`, 'info');
    }
  }, []);

  // Memoizar la función handleDelete
  const handleDelete = useCallback(async (section) => {
    // Mostrar confirmación con SweetAlert2
    const result = await Swal.fire({
      title: '¿Eliminar sección?',
      html: `
        <div class="text-center">
          <p>¿Estás seguro de que quieres eliminar <strong>${section.title}</strong>?</p>
          <p class="text-muted small">Esta acción no se puede deshacer y se eliminará la imagen asociada.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        popup: 'swal-section-delete',
        confirmButton: 'btn btn-danger',
        cancelButton: 'btn btn-secondary'
      }
    });

    // Si el usuario confirma la eliminación
    if (result.isConfirmed) {
      try {
        await welcomeSectionService.delete(section.id);
        
        if (window.showToast) {
          window.showToast('Sección eliminada exitosamente', 'success');
        }
        
        fetchSections();
      } catch (error) {
        if (window.showToast) {
          window.showToast('Error al eliminar la sección: ' + (error.message || 'Error desconocido'), 'error');
        }
      }
    }
  }, [fetchSections]);

  // Memoizar la función handleToggleStatus
  const handleToggleStatus = useCallback(async (id) => {
    try {
      await welcomeSectionService.toggleStatus(id);
      
      if (window.showToast) {
        window.showToast('Estado de la sección actualizado', 'success');
      }
      
      fetchSections();
    } catch (error) {
      window.showToast('Error al cambiar el estado', 'error');
    }
  }, [fetchSections]);

  // Memoizar la función resetForm
  const resetForm = useCallback(() => {
    setEditingSection(null);
    setFormData({
      title: '',
      subtitle: '',
      button_text: '',
      button_url: '',
      is_active: true,
      display_order: ''
    });
    setImageFile(null);
    setImagePreview(null);
    setShowForm(false);
    setError(null);
  }, []);

  // Memoizar la función handleInputChange
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  // Memoizar la función handleImageChange
  const handleImageChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar formato de imagen
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('La imagen no cumple con los formatos permitidos. Formatos permitidos: JPEG, JPG, PNG, GIF, WebP');
        if (window.showToast) {
          window.showToast('La imagen no cumple con los formatos permitidos. Formatos permitidos: JPEG, JPG, PNG, GIF, WebP', 'error');
        }
        return;
      }
      
      // Validar tamaño (10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB en bytes
      if (file.size > maxSize) {
        setError('La imagen excede el tamaño máximo permitido (10MB)');
        if (window.showToast) {
          window.showToast('La imagen excede el tamaño máximo permitido (10MB)', 'error');
        }
        return;
      }
      
      setError(''); // Limpiar error si la validación pasa
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  }, []);

  // Memoizar la función moveSectionUp
  const moveSectionUp = useCallback(async (id) => {
    try {
      const currentSection = sections.find(s => s.id === id);
      const currentIndex = sections.findIndex(s => s.id === id);
      
      if (currentIndex > 0) {
        const prevSection = sections[currentIndex - 1];
        
        // Intercambiar display_order
        const updates = [
          { id: currentSection.id, display_order: prevSection.display_order },
          { id: prevSection.id, display_order: currentSection.display_order }
        ];
        
        // Actualizar en paralelo
      await Promise.all(updates.map(update => 
        welcomeSectionService.update(update.id, formDataUtils.createFromObject(update))
      ));
      
        fetchSections();
      }
    } catch (error) {
      if (window.showToast) {
        window.showToast('Error al mover la sección', 'error');
      }
    }
  }, [sections, fetchSections]);

  // Memoizar la función moveSectionDown
  const moveSectionDown = useCallback(async (id) => {
    try {
      const currentSection = sections.find(s => s.id === id);
      const currentIndex = sections.findIndex(s => s.id === id);
      
      if (currentIndex < sections.length - 1) {
        const nextSection = sections[currentIndex + 1];
        
        // Intercambiar display_order
        const updates = [
          { id: currentSection.id, display_order: nextSection.display_order },
          { id: nextSection.id, display_order: currentSection.display_order }
        ];
        
        // Actualizar en paralelo
      await Promise.all(updates.map(update => 
        welcomeSectionService.update(update.id, formDataUtils.createFromObject(update))
      ));
      
        fetchSections();
      }
    } catch (error) {
      if (window.showToast) {
        window.showToast('Error al mover la sección', 'error');
      }
    }
  }, [sections, fetchSections]);

  // Memoizar la función handleImageError para evitar recreaciones
  const handleImageError = useCallback((e) => {
    // Usar una imagen de placeholder más específica y optimizada
    e.target.src = '/images/welcome-sections/default-welcome.jpg';
    // Prevenir futuros errores
    e.target.onerror = null;
  }, []);

  // Memoizar las secciones ordenadas para evitar recálculos innecesarios
  const sortedSections = useMemo(() => {
    return [...sections].sort((a, b) => a.display_order - b.display_order);
  }, [sections]);

  if (loading) {
    return (
      <div className="admin-welcome-manager">
        <div className="loading-spinner">
          <p>Cargando secciones de bienvenida...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-welcome-manager">
      <div className="admin-welcome-manager__header">
        <h2 className="section-title">Gestión de Secciones de Bienvenida</h2>

      </div>

      {error && (
        <div className="alert alert-danger">
          <strong>Error:</strong> {error}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setError(null)}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      )}

      <div className="admin-welcome-manager__content">
        {/* Lista de secciones */}
        <div className="admin-welcome-manager__sections">
          <div className="admin-welcome-manager__sections-header">
            <h3>Secciones Configuradas</h3>
            <button 
              className="btn btn-danger"
              onClick={() => setShowForm(true)}
            >
              + Nueva Sección
            </button>
          </div>

          {sortedSections.length === 0 ? (
            <div className="admin-welcome-manager__empty">
              <p>No hay secciones configuradas.</p>
              <button 
                className="btn btn-danger"
                onClick={() => setShowForm(true)}
              >
                Crear Primera Sección
              </button>
            </div>
          ) : (
            <div className="admin-welcome-manager__sections-list">
              {sortedSections.map((section, index) => (
                <div key={section.id} className={`admin-welcome-manager__section-card ${!section.is_active ? 'inactive-section' : ''}`}>
                  <div className="admin-welcome-manager__section-header">
                    <div className="section-order-info">
                      <span className="order-number">#{section.display_order}</span>
                      <span className={`status-indicator ${section.is_active ? 'active' : 'inactive'}`}>
                        {section.is_active ? '●' : '○'}
                      </span>
                    </div>
                    <div className="section-order-controls">
                      <button 
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => moveSectionUp(section.id)}
                        disabled={index === 0}
                        title="Mover hacia arriba"
                      >
                        ↑
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => moveSectionDown(section.id)}
                        disabled={index === sortedSections.length - 1}
                        title="Mover hacia abajo"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                  
                  <div className="admin-welcome-manager__section-content">
                    <div className="admin-welcome-manager__section-info">
                      <div className="admin-welcome-manager__section-image">
                        <img 
                          src={`/${section.image_path}`} 
                          alt={section.title}
                          onError={handleImageError}
                        />
                      </div>
                      <div className="admin-welcome-manager__section-details">
                        <h4>{section.title}</h4>
                        <p>{section.subtitle}</p>
                        <div className="admin-welcome-manager__section-meta">
                          <span className={`status-badge ${section.is_active ? 'active' : 'inactive'}`}>
                            {section.is_active ? 'Activa' : 'Inactiva'}
                          </span>
                          <span className="order-badge">Orden: {section.display_order}</span>
                        </div>
                        <div className="admin-welcome-manager__section-button">
                          <strong>Botón:</strong> {section.button_text} → {section.button_url}
                        </div>
                      </div>
                    </div>
                    <div className="admin-welcome-manager__section-actions">
                      <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => handleEdit(section)}
                        title="Editar sección"
                      >
                        <img src="/icons/Edit.svg" alt="Editar" width="16" height="16" />
                      </button>
                      <button 
                        className={`btn btn-sm ${section.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`}
                        onClick={() => handleToggleStatus(section.id)}
                        title={section.is_active ? 'Desactivar sección' : 'Activar sección'}
                      >
                        {section.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button 
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleDelete(section)}
                        title="Eliminar sección"
                      >
                        <img src="/icons/Trash.svg" alt="Eliminar" width="16" height="16" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="admin-welcome-manager__form-overlay">
            <div className="admin-welcome-manager__form-container">
              <div className="admin-welcome-manager__form-header">
                <h3>{editingSection ? 'Editar Sección' : 'Nueva Sección'}</h3>
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={resetForm}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="admin-welcome-manager__form">
                <div className="form-group">
                  <label htmlFor="title">Título de la Sección *</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                    placeholder="Ej: ¡Bienvenida a la moda que te inspira!"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="subtitle">Subtítulo/Descripción *</label>
                  <textarea
                    id="subtitle"
                    name="subtitle"
                    value={formData.subtitle}
                    onChange={handleInputChange}
                    className="form-control"
                    rows="3"
                    required
                    placeholder="Ej: Explora nuestra colección única y actualizada que resalta tu estilo personal..."
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="button_text">Texto del Botón *</label>
                    <input
                      type="text"
                      id="button_text"
                      name="button_text"
                      value={formData.button_text}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                      placeholder="Ej: Explorar Colección"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="button_url">URL del Botón *</label>
                    <input
                      type="text"
                      id="button_url"
                      name="button_url"
                      value={formData.button_url}
                      onChange={handleInputChange}
                      className="form-control"
                      required
                      placeholder="Ej: /catalogo"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
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

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleInputChange}
                      />
                      Sección Activa
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="image">
                    Imagen de la Sección *
                    <span className="image-dimensions-hint">
                      (Tamaño recomendado: 650 × 570 píxeles)
                    </span>
                  </label>
                  <input
                    type="file"
                    id="image"
                    name="image"
                    onChange={handleImageChange}
                    className="form-control"
                    accept="image/*"
                    required={!editingSection}
                  />
                  {!editingSection && (
                    <small className="form-text text-muted">
                      La imagen es obligatoria para nuevas secciones
                    </small>
                  )}
                  {imagePreview && (
                    <div className="image-preview">
                      <img src={imagePreview} alt="Preview" />
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary"
                    onClick={resetForm}
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Guardando...' : (editingSection ? 'Actualizar' : 'Crear')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWelcomeSectionManager;
