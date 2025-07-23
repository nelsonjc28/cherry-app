import React, { useState, useEffect } from 'react';
import { welcomeSectionService } from '../../services/api';
import './AdminWelcomeSectionManager.css';

const AdminWelcomeSectionManager = () => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
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
    
    console.log('=== HANDLE SUBMIT ===');
    console.log('editingSection:', editingSection);
    console.log('formData:', formData);
    console.log('imageFile:', imageFile);
    
    try {
      const response = await welcomeSectionService.createOrUpdate(editingSection, formData, imageFile);
      
      setShowForm(false);
      setEditingSection(null);
      resetForm();
      fetchSections();
      
      if (window.showToast) {
        window.showToast(
          editingSection ? 'Sección actualizada exitosamente' : 'Sección creada exitosamente',
          'success'
        );
      }
    } catch (err) {
      console.error('Error en handleSubmit:', err);
      if (window.showToast) {
        window.showToast('Error: ' + err.message, 'error');
      }
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
    if (!confirm('¿Estás seguro de que quieres eliminar esta sección? Esta acción no se puede deshacer.')) {
      return;
    }

    if (window.showToast) {
      window.showToast('Eliminando sección...', 'info');
    }

    try {
      await welcomeSectionService.delete(id);
      fetchSections();
      if (window.showToast) {
        window.showToast('Sección eliminada exitosamente', 'success');
      }
    } catch (err) {
      if (window.showToast) {
        window.showToast('Error: ' + err.message, 'error');
      }
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await welcomeSectionService.toggleStatus(id);
      fetchSections();
      if (window.showToast) {
        window.showToast('Estado de sección actualizado exitosamente', 'success');
      }
    } catch (err) {
      if (window.showToast) {
        window.showToast('Error: ' + err.message, 'error');
      }
    }
  };

  const resetForm = () => {
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
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      
      if (window.showToast) {
        window.showToast('Imagen seleccionada exitosamente', 'success');
      }
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  if (loading) {
    return <div className="admin-welcome-section-manager__loading">Cargando...</div>;
  }

  if (error) {
    return <div className="admin-welcome-section-manager__error">Error: {error}</div>;
  }

  return (
    <div className="admin-welcome-section-manager">
      <div className="admin-welcome-section-manager__header">
        <h2>Gestionar Secciones de Bienvenida</h2>
        <button 
          className="admin-welcome-section-manager__add-button"
          onClick={() => {
            setShowForm(true);
            setEditingSection(null);
            resetForm();
            if (window.showToast) {
              window.showToast('Creando nueva sección de bienvenida', 'info');
            }
          }}
        >
          Agregar Nueva Sección
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="admin-welcome-section-manager__form-overlay">
          <div className="admin-welcome-section-manager__form">
            <h3>{editingSection ? 'Editar Sección' : 'Nueva Sección'}</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Título:</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setFormData({...formData, title: newValue});
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label>Subtítulo/Descripción:</label>
                <textarea
                  value={formData.subtitle}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setFormData({...formData, subtitle: newValue});
                  }}
                  required
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Texto del Botón:</label>
                <input
                  type="text"
                  value={formData.button_text}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setFormData({...formData, button_text: newValue});
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label>URL del Botón:</label>
                <input
                  type="url"
                  value={formData.button_url}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setFormData({...formData, button_url: newValue});
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label>Imagen:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  required={!editingSection}
                />
                {imagePreview && (
                  <div className="image-preview">
                    <img src={imagePreview} alt="Preview" />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  />
                  Activa
                </label>
              </div>

              <div className="form-group">
                <label>Orden de Visualización:</label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({...formData, display_order: parseInt(e.target.value)})}
                  min="0"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingSection ? 'Actualizar' : 'Crear'}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingSection(null);
                    resetForm();
                    if (window.showToast) {
                      window.showToast('Formulario cancelado', 'info');
                    }
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de secciones */}
      <div className="admin-welcome-section-manager__list">
        {sections.length === 0 ? (
          <div className="admin-welcome-section-manager__empty">
            <p>No hay secciones de bienvenida creadas.</p>
            {window.showToast && (
              <button 
                className="btn-primary"
                onClick={() => {
                  window.showToast('Haz clic en "Agregar Nueva Sección" para crear la primera', 'info');
                }}
              >
                ¿Cómo empezar?
              </button>
            )}
          </div>
        ) : (
          sections.map((section) => (
            <div key={section.id} className="admin-welcome-section-manager__item">
              <div className="section-info">
                <h4>{section.title}</h4>
                <p className="section-subtitle">{section.subtitle}</p>
                <div className="section-details">
                  <span>Botón: {section.button_text}</span>
                  <span>URL: {section.button_url}</span>
                  <span>Orden: {section.display_order}</span>
                  <span className={`status ${section.is_active ? 'active' : 'inactive'}`}>
                    {section.is_active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>
              
              <div className="section-image">
                {section.image_path && (
                  <img src={`/${section.image_path}`} alt={section.title} />
                )}
              </div>

              <div className="section-actions">
                <button 
                  onClick={() => handleEdit(section)}
                  className="btn-edit"
                >
                  Editar
                </button>
                <button 
                  onClick={() => handleToggleStatus(section.id)}
                  className={`btn-toggle ${section.is_active ? 'deactivate' : 'activate'}`}
                >
                  {section.is_active ? 'Desactivar' : 'Activar'}
                </button>
                <button 
                  onClick={() => handleDelete(section.id)}
                  className="btn-delete"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminWelcomeSectionManager;