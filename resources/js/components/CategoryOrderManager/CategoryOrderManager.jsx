import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Swal from 'sweetalert2';
import CherryButton from '../CherryButton/CherryButton';
import './CategoryOrderManager.css';

// Componente para elementos arrastrables (memoizado para mejor rendimiento)
const SortableItem = React.memo(({ item, index, onRemove, isOrdered = false }) => {
  const itemId = isOrdered ? `ordered-${item.id}` : `all-${item.id}`;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: itemId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleRemove = React.useCallback(() => {
    onRemove(index);
  }, [onRemove, index]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`category-order-manager__item ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="category-order-manager__item-content">
        {isOrdered && (
          <div className="category-order-manager__item-header">
            <span className="category-order-manager__item-order">#{index + 1}</span>
            <span className="category-order-manager__item-name">
              {item.category?.name || item.name}
            </span>
          </div>
        )}
        {!isOrdered && (
          <span className="category-order-manager__item-name">{item.name}</span>
        )}
        {(item.category?.description || item.description) && (
          <span className="category-order-manager__item-description">
            {item.category?.description || item.description}
          </span>
        )}
      </div>
      {isOrdered && onRemove && (
        <button
          className="category-order-manager__remove-btn"
          onClick={handleRemove}
          title="Remover de la lista"
        >
          ✕
        </button>
      )}
    </div>
  );
});

const CategoryOrderManager = () => {
  const [availableCategories, setAvailableCategories] = useState([]);
  const [orderedCategories, setOrderedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const saveTimeoutRef = React.useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Solo activar después de 8px de movimiento
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  // Limpiar el indicador de "guardado" después de 3 segundos
  useEffect(() => {
    if (lastSaved) {
      const timer = setTimeout(() => {
        setLastSaved(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved]);

  // Cleanup del timeout al desmontar el componente
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/ordered-categories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener categorías');
      }
      
      const data = await response.json();
      setAvailableCategories(data.available_categories);
      setOrderedCategories(data.ordered_categories);
    } catch (err) {
      setError(err.message);
      window.showToast('Error al cargar categorías: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Extraer el ID real del item (remover prefijo)
    const realActiveId = active.id.replace(/^(all-|ordered-)/, '');
    const realOverId = over.id.replace(/^(all-|ordered-)/, '');
    
        // Determinar de qué contenedor viene y a cuál va
    const activeItem = [...availableCategories, ...orderedCategories].find(item => item.id.toString() === realActiveId);
    
    if (activeItem) {
      let newOrderedCategories = [];
      
      // Si el elemento está en orderedCategories, solo reordenar
      const isFromOrdered = orderedCategories.find(item => item.id.toString() === realActiveId);
      
      if (isFromOrdered) {
        newOrderedCategories = (() => {
          const oldIndex = orderedCategories.findIndex(item => item.id.toString() === realActiveId);
          const newIndex = orderedCategories.findIndex(item => item.id.toString() === realOverId);
          
          if (oldIndex === -1 || newIndex === -1) return orderedCategories;
          
          const newItems = arrayMove(orderedCategories, oldIndex, newIndex);
          return newItems.map((item, index) => ({
            ...item,
            display_order: index
          }));
        })();
        
        setOrderedCategories(newOrderedCategories);
      } else {
        // Mover desde availableCategories a orderedCategories
        // Remover de availableCategories
        setAvailableCategories(prev => prev.filter(item => item.id.toString() !== realActiveId));
        
        newOrderedCategories = (() => {
          const newItems = [...orderedCategories, { ...activeItem, display_order: orderedCategories.length }];
          return newItems.map((item, index) => ({
            ...item,
            display_order: index
          }));
        })();
        
        setOrderedCategories(newOrderedCategories);
      }

      // Guardar automáticamente el nuevo orden con debounce
      if (newOrderedCategories.length > 0) {
        // Limpiar timeout anterior si existe
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        
        // Usar debounce para evitar múltiples llamadas
        saveTimeoutRef.current = setTimeout(async () => {
          const success = await saveOrderAutomatically(newOrderedCategories);
          if (!success) {
            // Si falla el guardado, revertir los cambios
            if (isFromOrdered) {
              setOrderedCategories(orderedCategories);
            } else {
              setAllCategories(prev => [...prev, activeItem]);
              setOrderedCategories(orderedCategories);
            }
          }
        }, 300); // 300ms de debounce
      }
    }
  };

  const handleSaveOrder = async () => {
    if (orderedCategories.length === 0) {
      window.showToast('No hay categorías ordenadas para guardar', 'warning');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/ordered-categories/update-order', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ordered_categories: orderedCategories.map((item, index) => ({
            category_id: item.category_id || item.id,
            display_order: index
          }))
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        window.showToast(data.message || 'Error al guardar orden', 'error');
        return;
      }
      
      window.showToast('Orden guardado exitosamente', 'success');
    } catch (err) {
      window.showToast('Error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClearOrder = async () => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción eliminará todas las categorías ordenadas.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch('/api/admin/ordered-categories/clear', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        window.showToast(data.message || 'Error al limpiar orden', 'error');
        return;
      }
      
      // Recargar las categorías desde el servidor
      await fetchCategories();
      window.showToast('Orden limpiado exitosamente', 'success');
    } catch (err) {
      window.showToast('Error: ' + err.message, 'error');
    }
  };

  const saveOrderAutomatically = async (categoriesToSave) => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/ordered-categories/update-order', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ordered_categories: categoriesToSave.map((item, index) => ({
            category_id: parseInt(item.category_id || item.id),
            display_order: index
          }))
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        window.showToast(data.message || 'Error al guardar orden automáticamente', 'error');
        return false;
      }
      
      // Actualizar timestamp de último guardado
      setLastSaved(new Date());
      
      // Recargar las categorías desde el servidor para mantener sincronización
      await fetchCategories();
      
      return true;
    } catch (err) {
      window.showToast('Error de conexión: ' + err.message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const removeFromOrdered = (index) => {
    const updatedOrdered = orderedCategories.filter((_, i) => i !== index);
    const removedItem = orderedCategories[index];
    
    // Agregar la categoría removida de vuelta a availableCategories
    if (removedItem.category) {
      setAvailableCategories(prev => [...prev, removedItem.category]);
    } else {
      // Si no hay category anidada, usar el item directamente
      setAvailableCategories(prev => [...prev, removedItem]);
    }
    
    // Actualizar display_order
    const reorderedItems = updatedOrdered.map((item, i) => ({
      ...item,
      display_order: i
    }));
    
    setOrderedCategories(reorderedItems);
    
    // Guardar automáticamente después de remover con debounce
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        if (reorderedItems.length > 0) {
          const success = await saveOrderAutomatically(reorderedItems);
          if (!success) {
            // Si falla el guardado, revertir los cambios
            setAllCategories(prev => prev.filter(item => item.id !== removedItem.id));
            setOrderedCategories(orderedCategories);
          }
        } else {
          // Si no quedan categorías, limpiar el orden
          await handleClearOrder();
        }
      } catch (error) {
        window.showToast('Error al remover categoría: ' + error.message, 'error');
      }
    }, 300);
  };

  if (loading) {
    return <div className="category-order-manager__loading">Cargando categorías...</div>;
  }

  if (error) {
    return <div className="category-order-manager__error">Error: {error}</div>;
  }

  return (
    <div className="category-order-manager">
      <div className="category-order-manager__header">
        <div className="category-order-manager__header-left">
          <h2>Ordenar Categorías para el Home</h2>
          <div className="category-order-manager__status">
            {saving ? (
              <span className="category-order-manager__status-saving">
                💾 Guardando...
              </span>
            ) : lastSaved ? (
              <span className="category-order-manager__status-saved">
                ✅ Guardado automáticamente
              </span>
            ) : (
              <span className="category-order-manager__status-ready">
                ✨ Arrastra para ordenar
              </span>
            )}
          </div>
        </div>
        <div className="category-order-manager__actions">
          <CherryButton 
            onClick={handleClearOrder}
            variant="outline"
            size="medium"
            disabled={orderedCategories.length === 0}
          >
            Limpiar Todo
          </CherryButton>
        </div>
      </div>

      <div className="category-order-manager__description">
        <p>
          <strong>Instrucciones:</strong> Arrastra las categorías desde "Categorías Disponibles" 
          hacia "Categorías para el Home" para ordenarlas. Las categorías ya ordenadas no aparecen 
          en la lista de disponibles. El orden se guarda automáticamente al soltar las categorías.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="category-order-manager__containers">
          {/* Contenedor de categorías disponibles */}
          <div className="category-order-manager__container">
            <h3>Categorías Disponibles ({availableCategories.length})</h3>
            <div className="category-order-manager__dropzone">
              <SortableContext
                items={availableCategories.map(item => `all-${item.id}`)}
                strategy={verticalListSortingStrategy}
              >
                {availableCategories.map((category, index) => (
                  <SortableItem
                    key={`all-${category.id}`}
                    item={category}
                    index={index}
                    isOrdered={false}
                  />
                ))}
              </SortableContext>
              {availableCategories.length === 0 && (
                <div className="category-order-manager__empty">
                  Todas las categorías han sido ordenadas
                </div>
              )}
            </div>
          </div>

          {/* Contenedor de categorías ordenadas */}
          <div className="category-order-manager__container">
            <h3>Categorías para el Home ({orderedCategories.length})</h3>
            <div className="category-order-manager__dropzone">
              <SortableContext
                items={orderedCategories.map(item => `ordered-${item.id}`)}
                strategy={verticalListSortingStrategy}
              >
                {orderedCategories.map((item, index) => (
                  <SortableItem
                    key={`ordered-${item.id}`}
                    item={item}
                    index={index}
                    isOrdered={true}
                    onRemove={removeFromOrdered}
                  />
                ))}
              </SortableContext>
              {orderedCategories.length === 0 && (
                <div className="category-order-manager__empty">
                  Arrastra categorías aquí para ordenarlas
                </div>
              )}
            </div>
          </div>
        </div>
      </DndContext>
    </div>
  );
};

export default CategoryOrderManager; 