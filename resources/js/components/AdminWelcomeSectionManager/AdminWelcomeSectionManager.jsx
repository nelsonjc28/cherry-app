import React, { useState, useEffect } from 'react';
import { welcomeSectionService } from '../../services/api';
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
    display_order: 0
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      setLoading(true);
      const response = await welcomeSectionService.getAll();
      setSections(response.data.sections || []);
    } catch (err) {
      setError(err.message);
      if (window.showToast) {
        window.showToast('Error al cargar secciones: ' + err.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      const formDataObj = new FormData();
      Object.keys(formData).forEach(key => {
        let value = formData[key];
        if (key === 'is_active') {
          value = value ? '1' : '0';
        } else if (key === 'display_order') {
          value = value.toString();
        }
        formDataObj.append(key, value);
      });

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
      }
    } catch (error) {
      console.error('Error saving welcome section:', error);
      setError('Error al guardar la sección');
      if (window.showToast) {
        window.showToast('Error al guardar la sección', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (section) => {
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
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta sección?')) {
      return;
    }

    try {
      await welcomeSectionService.delete(id);
      
      if (window.showToast) {
        window.showToast('Sección eliminada exitosamente', 'success');
      }
      
      fetchSections();
    } catch (error) {
      console.error('Error deleting section:', error);
      if (window.showToast) {
        window.showToast('Error al eliminar la sección', 'error');
      }
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await welcomeSectionService.toggleStatus(id);
      
      if (window.showToast) {
        window.showToast('Estado de la sección actualizado', 'success');
      }
      
      fetchSections();
    } catch (error) {
      console.error('Error toggling status:', error);
      if (window.showToast) {
        window.showToast('Error al cambiar el estado', 'error');
      }
    }
  };

  const resetForm = () => {
    setEditingSection(null);
    setFormData({
      title: '',
      subtitle: '',
      button_text: '',
      button_url: '',
      is_active: true,
      display_order: 0
    });
    setImageFile(null);
    setImagePreview(null);
    setShowForm(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

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
        <p className="section-description">
          Administra los mensajes de bienvenida que se muestran en la página principal.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="admin-welcome-manager__content">
        {/* Lista de secciones */}
        <div className="admin-welcome-manager__sections">
          <div className="admin-welcome-manager__sections-header">
            <h3>Secciones Configuradas</h3>
            <button 
              className="btn btn-primary"
              onClick={() => setShowForm(true)}
            >
              + Nueva Sección
            </button>
          </div>

          {sections.length === 0 ? (
            <div className="admin-welcome-manager__empty">
              <p>No hay secciones configuradas.</p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
              >
                Crear Primera Sección
              </button>
            </div>
          ) : (
            <div className="admin-welcome-manager__sections-list">
              {sections.map((section) => (
                <div key={section.id} className="admin-welcome-manager__section-card">
                  <div className="admin-welcome-manager__section-info">
                    <div className="admin-welcome-manager__section-image">
                      <img 
                        src={`/${section.image_path}`} 
                        alt={section.title}
                        onError={(e) => {
                          e.target.src = '/images/placeholder.jpg';
                        }}
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
                    >
                      Editar
                    </button>
                    <button 
                      className={`btn btn-sm ${section.is_active ? 'btn-outline-warning' : 'btn-outline-success'}`}
                      onClick={() => handleToggleStatus(section.id)}
                    >
                      {section.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button 
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleDelete(section.id)}
                    >
                      Eliminar
                    </button>
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
                  <label htmlFor="image">Imagen de la Sección</label>
                  <input
                    type="file"
                    id="image"
                    name="image"
                    onChange={handleImageChange}
                    className="form-control"
                    accept="image/*"
                  />
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