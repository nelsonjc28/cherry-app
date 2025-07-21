import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import CherryButton from '../CherryButton/CherryButton';
import './CategoryManager.css';

const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener categorías');
      }
      
      const data = await response.json();
      setCategories(data.categories);
    } catch (err) {
      setError(err.message);
      window.showToast('Error al cargar categorías: ' + err.message, 'error');
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

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_active: true
    });
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingCategory 
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle validation errors
        if (data.errors) {
          const errorMessages = Object.values(data.errors).flat().join(', ');
          window.showToast(errorMessages, 'error');
        } else {
          window.showToast(data.message || 'Error en la operación', 'error');
        }
        return;
      }
      
      // Refresh categories list
      await fetchCategories();
      resetForm();
      
      window.showToast(
        editingCategory ? 'Categoría actualizada exitosamente' : 'Categoría creada exitosamente',
        'success',
        4000
      );
    } catch (err) {
      window.showToast('Error: ' + err.message, 'error');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      is_active: category.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (categoryId) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer. La categoría será eliminada permanentemente.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        window.showToast(data.message || 'Error al eliminar categoría', 'error');
        return;
      }
      
      await fetchCategories();
      window.showToast('Categoría eliminada exitosamente', 'success', 4000);
    } catch (err) {
      window.showToast('Error: ' + err.message, 'error');
    }
  };

  if (loading) {
    return <div className="category-manager__loading">Cargando categorías...</div>;
  }

  if (error) {
    return <div className="category-manager__error">Error: {error}</div>;
  }

  return (
    <div className="category-manager">
      <div className="category-manager__header">
        <h2>Gestión de Categorías</h2>
        <CherryButton 
          onClick={() => setShowForm(true)}
          variant="red"
          size="medium"
        >
          Agregar Categoría
        </CherryButton>
      </div>

      {/* Category Form */}
      {showForm && (
        <div className="category-manager__form-overlay">
          <div className="category-manager__form">
            <div className="category-manager__form-header">
              <h3>{editingCategory ? 'Editar Categoría' : 'Crear Nueva Categoría'}</h3>
              <button 
                className="category-manager__form-close"
                onClick={resetForm}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="category-manager__form-content">
              <div className="category-manager__form-group">
                <label htmlFor="name">Nombre *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="category-manager__form-group">
                <label htmlFor="description">Descripción</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                />
              </div>
              
              <div className="category-manager__form-group">
                <label className="category-manager__checkbox-label">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  Activa
                </label>
              </div>
              
              <div className="category-manager__form-actions">
                <CherryButton 
                  type="submit"
                  variant="red"
                  size="medium"
                >
                  {editingCategory ? 'Actualizar' : 'Crear'}
                </CherryButton>
                <CherryButton 
                  type="button"
                  variant="outline"
                  size="medium"
                  onClick={resetForm}
                >
                  Cancelar
                </CherryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="category-manager__list">
        <div className="category-manager__list-header">
          <h3>Categorías ({categories.length})</h3>
        </div>
        
        {categories.length === 0 ? (
          <div className="category-manager__empty">
            No hay categorías registradas
          </div>
        ) : (
          <div className="category-manager__categories">
            {categories.map(category => (
              <div key={category.id} className="category-manager__category-card">
                <div className="category-manager__category-info">
                  <div className="category-manager__category-name">
                    {category.name}
                  </div>
                  <div className="category-manager__category-description">
                    {category.description || 'Sin descripción'}
                  </div>
                  <div className="category-manager__category-meta">
                    <span className={`category-manager__category-status ${category.is_active ? 'active' : 'inactive'}`}>
                      {category.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>
                <div className="category-manager__category-actions">
                  <CherryButton 
                    onClick={() => handleEdit(category)}
                    variant="outline"
                    size="small"
                  >
                    Editar
                  </CherryButton>
                  <CherryButton 
                    onClick={() => handleDelete(category.id)}
                    variant="red"
                    size="small"
                  >
                    Eliminar
                  </CherryButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryManager; 