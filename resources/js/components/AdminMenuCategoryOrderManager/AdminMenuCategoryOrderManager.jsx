import React, { useState, useEffect } from 'react';
import { categoryService } from '../../services/api';
import useUserStore from '../../store/userStore';
import './AdminMenuCategoryOrderManager.css';

const AdminMenuCategoryOrderManager = () => {
  const { user } = useUserStore();
  const [orderedCategories, setOrderedCategories] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draggedCategory, setDraggedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('ready');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Obtener categorías del menú
      const menuResponse = await categoryService.getMenuCategories();
      if (menuResponse.data.success) {
        setOrderedCategories(menuResponse.data.data || []);
      }
      
      // Obtener categorías disponibles
      const availableResponse = await categoryService.getAll();
      if (availableResponse.data.success) {
        const allCategories = availableResponse.data.categories || [];
        const menuCategoryIds = (menuResponse.data.data || []).map(c => c.id);
        const available = allCategories.filter(c => !menuCategoryIds.includes(c.id));
        setAvailableCategories(available);
      }
    } catch (error) {
      window.showToast('Error al cargar las categorías', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, category, source) => {
    setDraggedCategory({ ...category, source });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetArea) => {
    e.preventDefault();
    
    if (!draggedCategory) return;

    try {
      setStatus('saving');
      
      if (targetArea === 'ordered' && draggedCategory.source === 'available') {
        // Agregar categoría al menú
        await categoryService.addCategoryToMenu(draggedCategory.id);
        
        // Mover categoría de disponible a ordenadas
        const updatedOrdered = [...orderedCategories, draggedCategory];
        const updatedAvailable = availableCategories.filter(c => c.id !== draggedCategory.id);
        
        setOrderedCategories(updatedOrdered);
        setAvailableCategories(updatedAvailable);
        
        window.showToast('Categoría agregada al menú exitosamente', 'success');
      } else if (targetArea === 'available' && draggedCategory.source === 'ordered') {
        // Remover categoría del menú
        await categoryService.removeCategoryFromMenu(draggedCategory.id);
        
        // Mover categoría de ordenadas a disponible
        const updatedOrdered = orderedCategories.filter(c => c.id !== draggedCategory.id);
        const updatedAvailable = [...availableCategories, draggedCategory];
        
        setOrderedCategories(updatedOrdered);
        setAvailableCategories(updatedAvailable);
        
        window.showToast('Categoría removida del menú exitosamente', 'success');
      }
      
      setStatus('saved');
      setTimeout(() => setStatus('ready'), 2000);
    } catch (error) {
      window.showToast('Error al actualizar el orden', 'error');
      setStatus('ready');
    } finally {
      setDraggedCategory(null);
    }
  };

  const handleDropOnItem = async (e, targetCategory) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedCategory || draggedCategory.source !== 'ordered' || draggedCategory.id === targetCategory.id) {
      return;
    }

    try {
      setStatus('saving');
      
      const updatedOrdered = [...orderedCategories];
      const draggedIndex = updatedOrdered.findIndex(c => c.id === draggedCategory.id);
      const dropIndex = updatedOrdered.findIndex(c => c.id === targetCategory.id);
      
      if (draggedIndex !== -1 && dropIndex !== -1) {
        const [removed] = updatedOrdered.splice(draggedIndex, 1);
        updatedOrdered.splice(dropIndex, 0, removed);
        
        setOrderedCategories(updatedOrdered);
        
        // Guardar el nuevo orden
        await categoryService.updateMenuOrder(updatedOrdered.map(c => c.id));
        
        window.showToast('Orden del menú actualizado exitosamente', 'success');
      }
      
      setStatus('saved');
      setTimeout(() => setStatus('ready'), 2000);
    } catch (error) {
      window.showToast('Error al actualizar el orden', 'error');
      setStatus('ready');
      // Recargar datos en caso de error
      fetchData();
    } finally {
      setDraggedCategory(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedCategory(null);
  };


  const filteredAvailableCategories = availableCategories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (category.code && category.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="admin-menu-category-order-manager__loading">
        <p>Cargando categorías...</p>
      </div>
    );
  }

  return (
    <div className="admin-menu-category-order-manager">
      <div className="admin-menu-category-order-manager__header">
        <div className="admin-menu-category-order-manager__header-left">
          <h2>Ordenar Categorías del Menú</h2>
          <div className={`admin-menu-category-order-manager__status admin-menu-category-order-manager__status-${status}`}>
            {status === 'ready' && 'Listo para ordenar'}
            {status === 'saving' && 'Guardando cambios...'}
            {status === 'saved' && 'Cambios guardados'}
          </div>
        </div>
        <div className="admin-menu-category-order-manager__actions">
          <button onClick={fetchData} className="btn btn-secondary">
            Recargar
          </button>
        </div>
      </div>

      <div className="admin-menu-category-order-manager__description">
        <p>Arrastra las categorías para ordenarlas en el menú del home. No hay límite de categorías.</p>
      </div>

      <div className="admin-menu-category-order-manager__containers">
        {/* Categorías del Menú */}
        <div className="admin-menu-category-order-manager__container">
          <h3>Categorías del Menú ({orderedCategories.length})</h3>
          <div 
            className="admin-menu-category-order-manager__dropzone"
            onDragOver={(e) => handleDragOver(e)}
            onDrop={(e) => handleDrop(e, 'ordered')}
          >
            {orderedCategories.length === 0 ? (
              <div className="admin-menu-category-order-manager__empty">
                <p>No hay categorías en el menú</p>
                <p>Arrastra categorías desde "Categorías Disponibles"</p>
              </div>
            ) : (
              orderedCategories.map((category, index) => (
                <div
                  key={category.id}
                  data-category-id={category.id}
                  className="admin-menu-category-order-manager__item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, category, 'ordered')}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e)}
                  onDrop={(e) => handleDropOnItem(e, category)}
                >
                  <div className="admin-menu-category-order-manager__item-content">
                    <div className="admin-menu-category-order-manager__item-header">
                      <div className="admin-menu-category-order-manager__item-order">
                        {index + 1}
                      </div>
                      <div className="admin-menu-category-order-manager__item-name">
                        {category.name}
                      </div>
                    </div>
                    {category.code && (
                      <div className="admin-menu-category-order-manager__item-description">
                        Código: {category.code}
                      </div>
                    )}
                    {category.description && (
                      <div className="admin-menu-category-order-manager__item-description">
                        {category.description}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Categorías Disponibles */}
        <div className="admin-menu-category-order-manager__container">
          <h3>Categorías Disponibles ({filteredAvailableCategories.length})</h3>
          <div 
            className="admin-menu-category-order-manager__dropzone"
            onDragOver={(e) => handleDragOver(e)}
            onDrop={(e) => handleDrop(e, 'available')}
          >
            {filteredAvailableCategories.length === 0 ? (
              <div className="admin-menu-category-order-manager__empty">
                <p>No hay categorías disponibles</p>
              </div>
            ) : (
              filteredAvailableCategories.map((category) => (
                <div
                  key={category.id}
                  className="admin-menu-category-order-manager__item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, category, 'available')}
                  onDragEnd={handleDragEnd}
                >
                  <div className="admin-menu-category-order-manager__item-content">
                    <div className="admin-menu-category-order-manager__item-header">
                      <div className="admin-menu-category-order-manager__item-name">
                        {category.name}
                      </div>
                    </div>
                    {category.code && (
                      <div className="admin-menu-category-order-manager__item-description">
                        Código: {category.code}
                      </div>
                    )}
                    {category.description && (
                      <div className="admin-menu-category-order-manager__item-description">
                        {category.description}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMenuCategoryOrderManager;
