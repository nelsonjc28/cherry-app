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
import CherryButton from '../CherryButton/CherryButton';
import './AdminCatalogOrderManager.css';

// Componente para elementos arrastrables de catálogos
const SortableItem = React.memo(({ item, index }) => {
  const itemId = `catalog-${item.id}`;
  
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`catalog-order-manager__item ${isDragging ? 'dragging' : ''} ${!item.is_active ? 'inactive' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="catalog-order-manager__item-content">
        <div className="catalog-order-manager__item-header">
          <span className="catalog-order-manager__item-drag-handle">⋮⋮</span>
          <span className="catalog-order-manager__item-order">#{index + 1}</span>
          <div className="catalog-order-manager__item-info">
            <div className="catalog-order-manager__item-name">
              {item.name}
              {!item.is_active && (
                <span className="catalog-order-manager__item-badge inactive">
                  Inactivo
                </span>
              )}
            </div>
            {item.description && (
              <span className="catalog-order-manager__item-description">
                {item.description}
              </span>
            )}
            {item.code && (
              <span className="catalog-order-manager__item-code">
                Código: {item.code}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

SortableItem.displayName = 'SortableItem';

const AdminCatalogOrderManager = () => {
  const [allCatalogs, setAllCatalogs] = useState([]);
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
    fetchCatalogs();
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

  const fetchCatalogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/ordered-catalogs', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener catálogos');
      }

      const data = await response.json();
      if (data.success) {
        setAllCatalogs(data.catalogs || []);
      }
    } catch (err) {
      setError(err.message);
      window.showToast('Error al cargar catálogos: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    // Extraer el ID real del item (remover prefijo)
    const realActiveId = active.id.replace(/^catalog-/, '');
    const realOverId = over.id.replace(/^catalog-/, '');

    const oldIndex = allCatalogs.findIndex(item => item.id.toString() === realActiveId);
    const newIndex = allCatalogs.findIndex(item => item.id.toString() === realOverId);

    if (oldIndex === -1 || newIndex === -1) return;

    const newCatalogs = arrayMove(allCatalogs, oldIndex, newIndex);
    
    setAllCatalogs(newCatalogs);

    // Guardar automáticamente el nuevo orden con debounce
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const success = await saveOrderAutomatically(newCatalogs);
      if (!success) {
        // Si falla el guardado, revertir los cambios
        setAllCatalogs(allCatalogs);
      }
    }, 300); // 300ms de debounce
  };

  const saveOrderAutomatically = async (catalogsToSave) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/ordered-catalogs/update-order', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          catalogs: catalogsToSave.map((catalog, index) => ({
            id: parseInt(catalog.id),
            display_order: index + 1
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        window.showToast(data.message || 'Error al guardar orden', 'error');
        return false;
      }

      // Mostrar notificación de éxito
      window.showToast('Orden de catálogos guardado exitosamente', 'success');

      // Actualizar timestamp de último guardado
      setLastSaved(new Date());

      return true;
    } catch (err) {
      window.showToast('Error de conexión: ' + err.message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="catalog-order-manager__loading">Cargando catálogos...</div>;
  }

  if (error) {
    return <div className="catalog-order-manager__error">Error: {error}</div>;
  }

  return (
    <div className="catalog-order-manager">
      <div className="catalog-order-manager__header">
        <div className="catalog-order-manager__header-left">
          <h2>Ordenar Catálogos</h2>
          <div className="catalog-order-manager__status">
            {saving ? (
              <span className="catalog-order-manager__status-saving">
                💾 Guardando...
              </span>
            ) : lastSaved ? (
              <span className="catalog-order-manager__status-saved">
                ✅ Guardado automáticamente
              </span>
            ) : (
              <span className="catalog-order-manager__status-ready">
                ✨ Arrastra para ordenar
              </span>
            )}
          </div>
        </div>
        <div className="catalog-order-manager__actions">
          <CherryButton 
            onClick={fetchCatalogs}
            variant="outline"
            size="medium"
          >
            🔄 Recargar
          </CherryButton>
        </div>
      </div>

      <div className="catalog-order-manager__description">
        <p>
          <strong>Instrucciones:</strong> Arrastra los catálogos para cambiar su orden de visualización. 
          Este orden se aplica en todos los selectores de catálogos de la plataforma (filtros, listados, página de catálogos, etc.).
        </p>
        <p>
          <strong>Nota:</strong> El orden se guarda automáticamente al soltar un catálogo. 
          Los catálogos inactivos también pueden ser ordenados y aparecerán en el orden establecido cuando se activen.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="catalog-order-manager__container">
          <h3>Todos los Catálogos ({allCatalogs.length})</h3>
          
          <div className="catalog-order-manager__dropzone">
            <SortableContext
              items={allCatalogs.map(item => `catalog-${item.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {allCatalogs.map((catalog, index) => (
                <SortableItem
                  key={`catalog-${catalog.id}`}
                  item={catalog}
                  index={index}
                />
              ))}
            </SortableContext>
            {allCatalogs.length === 0 && (
              <div className="catalog-order-manager__empty">
                No hay catálogos disponibles
              </div>
            )}
          </div>
        </div>
      </DndContext>
    </div>
  );
};

export default AdminCatalogOrderManager;
