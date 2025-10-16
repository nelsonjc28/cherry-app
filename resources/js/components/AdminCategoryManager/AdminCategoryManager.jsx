import React, { useState, useEffect } from 'react';
import { categoryService } from '../../services/api';
import useUserStore from '../../store/userStore';
import CategoryProductManager from './CategoryProductManager';
import './AdminCategoryManager.css';

const AdminCategoryManager = () => {
  const { user } = useUserStore();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    is_active: true
  });
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryService.getAll();
      if (response.data.success) {
        setCategories(response.data.categories || []);
      }
    } catch (error) {
      window.showToast('Error al cargar las categorías', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingCategory && editingCategory.id) {
        const response = await categoryService.update(editingCategory.id, formData);
        if (response.data.success) {
          window.showToast('Categoría actualizada exitosamente', 'success');
          await fetchCategories();
          resetForm();
        }
      } else {
        const response = await categoryService.create(formData);
        if (response.data.success) {
          window.showToast('Categoría creada exitosamente', 'success');
          await fetchCategories();
          resetForm();
        }
      }
    } catch (error) {
      console.error('Error al guardar categoría:', error);
      if (error.response?.data?.errors) {
        const errorMessages = Object.values(error.response.data.errors).flat();
        setError(errorMessages.join(', '));
      } else {
        setError('Error al guardar la categoría');
      }
    }
  };

  const handleEdit = (category) => {
    setError('');
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      code: category.code || '',
      is_active: category.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (category) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar la categoría "${category.name}"?`)) {
      try {
        const response = await categoryService.delete(category.id);
        if (response.data.success) {
          window.showToast('Categoría eliminada exitosamente', 'success');
          fetchCategories();
        }
          } catch (error) {
      window.showToast('Error al eliminar la categoría', 'error');
    }
    }
  };

  const handleToggleStatus = async (category) => {
    try {
      const response = await categoryService.toggleStatus(category.id);
      if (response.data.success) {
        window.showToast('Estado de la categoría actualizado exitosamente', 'success');
        fetchCategories();
      }
    } catch (error) {
      window.showToast('Error al cambiar el estado de la categoría', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      code: '',
      is_active: true
    });
    setEditingCategory(null);
    setShowForm(false);
    setError('');
  };

  const openProductManager = (category) => {
    setSelectedCategory(category);
    setCurrentView('products');
  };

  const handleBackToCategories = () => {
    setCurrentView('categories');
    setSelectedCategory(null);
  };

  const handleProductsUpdated = () => {
    // Aquí podrías actualizar algo si es necesario
  };

  if (currentView === 'products') {
    return (
      <CategoryProductManager
        category={selectedCategory}
        onClose={handleBackToCategories}
        onProductsUpdated={handleProductsUpdated}
      />
    );
  }

  return (
    <div className="admin-category-manager">
      <div className="admin-category-manager__header">
        <h2>Gestionar Categorías</h2>
                 <button 
           className="admin-category-manager__add-btn"
           onClick={() => {
             resetForm();
             setShowForm(true);
           }}
           data-tooltip="Crear nueva categoría"
         >
           + Nueva Categoría
         </button>
      </div>

      {showForm && (
        <div className="admin-category-manager__form-container">
          <form onSubmit={handleSubmit} className="admin-category-manager__form">
            <h3>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
            
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

                         <div className="admin-category-manager__form-group">
               <label htmlFor="name">
                 Nombre <span className="text-danger">*</span>
               </label>
               <input
                 type="text"
                 id="name"
                 name="name"
                 value={formData.name}
                 onChange={handleInputChange}
                 required
                 className="admin-category-manager__form-input"
                 placeholder="Nombre de la categoría"
               />
             </div>
 
             <div className="admin-category-manager__form-group">
               <label htmlFor="code">Código</label>
               <input
                 type="text"
                 id="code"
                 name="code"
                 value={formData.code}
                 onChange={handleInputChange}
                 className="admin-category-manager__form-input"
                 placeholder="Código de la categoría (opcional)"
               />
             </div>
 
             <div className="admin-category-manager__form-group">
               <label htmlFor="description">Descripción</label>
               <textarea
                 id="description"
                 name="description"
                 value={formData.description}
                 onChange={handleInputChange}
                 className="admin-category-manager__form-textarea"
                 placeholder="Descripción de la categoría"
                 rows="3"
               />
             </div>

            <div className="admin-category-manager__form-group">
              <label className="admin-category-manager__checkbox-label">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="admin-category-manager__checkbox"
                />
                <span className="admin-category-manager__checkbox-text">
                  Categoría activa
                </span>
              </label>
            </div>

            <div className="admin-category-manager__form-actions">
              <button 
                type="submit" 
                className="admin-category-manager__submit-btn"
              >
                {editingCategory ? 'Actualizar' : 'Crear'}
              </button>
              <button 
                type="button" 
                className="admin-category-manager__cancel-btn"
                onClick={resetForm}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="admin-category-manager__loading">
          <div className="spinner"></div>
          <p>Cargando categorías...</p>
        </div>
      ) : (
        <div className="admin-category-manager__categories">
          {categories.length === 0 ? (
            <div className="admin-category-manager__empty">
              <p>No hay categorías creadas</p>
            </div>
          ) : (
            categories.map((category) => (
                               <div key={category.id} className="admin-category-manager__category-card">
                   <div className="admin-category-manager__category-info">
                     <h4>{category.name}</h4>
                     {category.description && (
                       <p>{category.description}</p>
                     )}
                     <div className="admin-category-manager__category-meta">
                       <span className={`admin-category-manager__status admin-category-manager__status--${category.is_active ? 'active' : 'inactive'}`}>
                         {category.is_active ? 'Activa' : 'Inactiva'}
                       </span>
                       {category.code && (
                         <span className="admin-category-manager__code">
                           Código: {category.code}
                         </span>
                       )}
                       <span className="admin-category-manager__slug">
                         {category.slug}
                       </span>
                     </div>
                   </div>
                
                <div className="admin-category-manager__category-actions">
                                     <button
                     className="admin-category-manager__action-btn admin-category-manager__action-btn--products"
                     onClick={() => openProductManager(category)}
                     data-tooltip="Gestionar productos"
                   >
                     📦
                   </button>
                   
                   <button
                     className="admin-category-manager__action-btn admin-category-manager__action-btn--edit"
                     onClick={() => handleEdit(category)}
                     data-tooltip="Editar categoría"
                   >
                     ✏️
                   </button>
                   
                   <button
                     className="admin-category-manager__action-btn admin-category-manager__action-btn--toggle"
                     onClick={() => handleToggleStatus(category)}
                     data-tooltip={category.is_active ? 'Desactivar' : 'Activar'}
                   >
                     {category.is_active ? '🔴' : '🟢'}
                   </button>
                   
                   <button
                     className="admin-category-manager__action-btn admin-category-manager__action-btn--delete"
                     onClick={() => handleDelete(category)}
                     data-tooltip="Eliminar categoría"
                   >
                     🗑️
                   </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCategoryManager;
