import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { categoryService } from '../../services/api';
import './AdminHomeCategoryOrderManager.css';

const SortableItem = ({ category, order, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`admin-home-category-order-manager__home-category-item ${isDragging ? 'dragging' : ''}`}
    >
      <div className="admin-home-category-order-manager__home-category-content">
        <div className="admin-home-category-order-manager__home-category-order">
          {order}
        </div>
        
        <div className="admin-home-category-order-manager__home-category-info">
          <div className="admin-home-category-order-manager__home-category-icon">
            {category.icon ? (
              <img src={category.icon} alt={category.name} />
            ) : (
              <div className="admin-home-category-order-manager__home-category-icon-placeholder">
                {category.name.charAt(0)}
              </div>
            )}
          </div>
          
          <div className="admin-home-category-order-manager__home-category-details">
            <h4 className="admin-home-category-order-manager__home-category-name">
              {category.name}
            </h4>
            {category.slug && (
              <span className="admin-home-category-order-manager__home-category-slug">
                {category.slug}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="admin-home-category-order-manager__home-category-actions">
        <button
          className="admin-home-category-order-manager__home-drag-handle"
          {...attributes}
          {...listeners}
          title="Arrastrar para reordenar"
        >
          ⋮⋮
        </button>
        
        <button
          className="admin-home-category-order-manager__home-remove-btn"
          onClick={onRemove}
          title="Remover del home"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

const AdminHomeCategoryOrderManager = ({ onClose }) => {
  const [homeCategories, setHomeCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [homeResponse, allResponse] = await Promise.all([
        categoryService.getHomeCategories(),
        categoryService.getAll()
      ]);
      
      if (homeResponse.data.success) {
        setHomeCategories(homeResponse.data.categories || []);
      }
      
      if (allResponse.data.success) {
        setAllCategories(allResponse.data.categories || []);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al cargar las categorías' });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setHomeCategories((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const saveOrder = async () => {
    try {
      setSaving(true);
      const orderData = homeCategories.map((category, index) => ({
        id: category.id,
        display_order: index + 1
      }));

      const response = await categoryService.updateHomeCategoryOrder(orderData);
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Orden de categorías guardado exitosamente' });
        fetchData();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar el orden de categorías' });
    } finally {
      setSaving(false);
    }
  };

  const resetOrder = () => {
    if (window.confirm('¿Estás seguro de que quieres resetear el orden de las categorías?')) {
      fetchData();
      setMessage({ type: 'info', text: 'Orden reseteado al estado original' });
    }
  };

  const addCategoryToHome = async (categoryId) => {
    // Verificar que no se exceda el límite de 6 categorías
    if (homeCategories.length >= 6) {
      setMessage({ type: 'error', text: 'Ya tienes el máximo de 6 categorías en el home' });
      return;
    }
    
    try {
      const response = await categoryService.addCategoryToHome(categoryId);
      if (response.data.success) {
        setMessage({ type: 'success', text: 'Categoría agregada al home exitosamente' });
        fetchData();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al agregar categoría al home' });
    }
  };

  const removeCategoryFromHome = async (categoryId) => {
    if (window.confirm('¿Estás seguro de que quieres remover esta categoría del home?')) {
      try {
        const response = await categoryService.removeCategoryFromHome(categoryId);
        if (response.data.success) {
          setMessage({ type: 'success', text: 'Categoría removida del home exitosamente' });
          fetchData();
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Error al remover categoría del home' });
      }
    }
  };

  const availableCategories = allCategories.filter(
    cat => !homeCategories.find(homeCat => homeCat.id === cat.id)
  );

  if (loading) {
    return (
      <div className="admin-home-category-order-manager">
        <div className="admin-home-category-order-manager__header">
          <h2>Ordenar Categorías del Home</h2>
          <button 
            className="admin-home-category-order-manager__back-btn"
            onClick={onClose}
          >
            ← Volver
          </button>
        </div>
        <div className="admin-home-category-order-manager__loading">
          <div className="spinner"></div>
          <p>Cargando categorías del home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-home-category-order-manager">
      <div className="admin-home-category-order-manager__header">
        <h2>Ordenar Categorías del Home</h2>
        <div className="admin-home-category-order-manager__header-actions">
          <button 
            className="admin-home-category-order-manager__save-order-btn"
            onClick={saveOrder}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar Orden'}
          </button>
          
          <button 
            className="admin-home-category-order-manager__reset-order-btn"
            onClick={resetOrder}
          >
            Resetear
          </button>
          
          <button 
            className="admin-home-category-order-manager__back-btn"
            onClick={onClose}
          >
            ← Volver
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`admin-home-category-order-manager__message admin-home-category-order-manager__message--${message.type}`}>
          {message.text}
          <button 
            className="admin-home-category-order-manager__message-close"
            onClick={() => setMessage({ type: '', text: '' })}
          >
            ×
          </button>
        </div>
      )}

      <div className="admin-home-category-order-manager__home-order-content">
        <div className="admin-home-category-order-manager__home-order-info">
          <div className="admin-home-category-order-manager__home-info-card">
            <h3>📱 Página Principal</h3>
            <p>Las categorías aparecerán en este orden en la sección de categorías del home.</p>
          </div>
          
          <div className="admin-home-category-order-manager__home-info-card">
            <h3>🍔 Menú de Navegación</h3>
            <p>El mismo orden se aplicará al menú desplegable de categorías en el header.</p>
          </div>
          
          <div className="admin-home-category-order-manager__home-info-card">
            <h3>🎯 Límite de Categorías</h3>
            <p>Máximo 6 categorías se mostrarán en el home para mantener un diseño limpio.</p>
          </div>
        </div>

        <div className="admin-home-category-order-manager__home-categories-section">
          <h3>Categorías del Home ({homeCategories.length}/6)</h3>
          
          {homeCategories.length === 0 ? (
            <div className="admin-home-category-order-manager__home-empty">
              <p>No hay categorías configuradas para el home</p>
              <p className="admin-home-category-order-manager__home-empty-hint">
                Agrega categorías desde la lista de disponibles
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={homeCategories.map(cat => cat.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="admin-home-category-order-manager__home-categories">
                  {homeCategories.map((category, index) => (
                    <SortableItem
                      key={category.id}
                      category={category}
                      order={index + 1}
                      onRemove={() => removeCategoryFromHome(category.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {availableCategories.length > 0 && (
          <div className="admin-home-category-order-manager__available-categories-section">
            <h3>Categorías Disponibles</h3>
            
            {homeCategories.length >= 6 && (
              <div className="admin-home-category-order-manager__limit-reached">
                <p>🎯 <strong>Límite alcanzado:</strong> Ya tienes el máximo de 6 categorías en el home.</p>
                <p>Para agregar una nueva categoría, primero debes remover una de las existentes.</p>
              </div>
            )}
            
            <div className="admin-home-category-order-manager__available-categories">
              {availableCategories.map((category) => (
                <div key={category.id} className="admin-home-category-order-manager__available-category">
                  <div className="admin-home-category-order-manager__available-category-info">
                    <h4>{category.name}</h4>
                    <span className="admin-home-category-order-manager__available-category-slug">
                      {category.slug}
                    </span>
                  </div>
                  <button
                    className="admin-home-category-order-manager__add-to-home-btn"
                    onClick={() => addCategoryToHome(category.id)}
                    disabled={homeCategories.length >= 6}
                    title={homeCategories.length >= 6 ? 'Máximo 6 categorías en el home' : 'Agregar al home'}
                  >
                    + Agregar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="admin-home-category-order-manager__home-preview">
          <h3>Vista Previa del Home</h3>
          <div className="admin-home-category-order-manager__home-preview-grid">
            {homeCategories.slice(0, 6).map((category, index) => (
              <div key={category.id} className="admin-home-category-order-manager__home-preview-item">
                <div className="admin-home-category-order-manager__home-preview-icon">
                  {category.icon ? (
                    <img src={category.icon} alt={category.name} />
                  ) : (
                    <div className="admin-home-category-order-manager__home-preview-icon-placeholder">
                      {category.name.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="admin-home-category-order-manager__home-preview-name">
                  {category.name}
                </span>
                <span className="admin-home-category-order-manager__home-preview-order">
                  {index + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHomeCategoryOrderManager;
