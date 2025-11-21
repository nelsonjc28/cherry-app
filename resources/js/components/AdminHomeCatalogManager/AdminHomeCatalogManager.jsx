import React, { useState, useEffect } from 'react';
import { catalogService } from '../../services/api';
import api from '../../services/api';
import useUserStore from '../../store/userStore';
import './AdminHomeCatalogManager.css';

const AdminHomeCatalogManager = () => {
  const { user } = useUserStore();
  const [orderedCatalogs, setOrderedCatalogs] = useState([]);
  const [availableCatalogs, setAvailableCatalogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draggedCatalog, setDraggedCatalog] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('ready');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
             // Obtener catálogos del home
       let homeResponse;
       try {
         homeResponse = await api.get('/home-catalogs');
         if (homeResponse.data.success) {
           setOrderedCatalogs(homeResponse.data.catalogs || []);
         } else {
           setOrderedCatalogs([]);
         }
       } catch (error) {
         setOrderedCatalogs([]);
       }
      
             // Obtener todos los catálogos disponibles
       let allCatalogsResponse;
       try {
         allCatalogsResponse = await catalogService.getAll();
         if (allCatalogsResponse.data.success) {
           const allCatalogs = allCatalogsResponse.data.data || [];
           const homeCatalogIds = (homeResponse?.data?.catalogs || []).map(c => c.id);
           const available = allCatalogs.filter(c => !homeCatalogIds.includes(c.id));
           setAvailableCatalogs(available);
         } else {
           setAvailableCatalogs([]);
         }
       } catch (error) {
         try {
           const publicResponse = await api.get('/catalogs');
           if (publicResponse.data.success) {
             const allCatalogs = publicResponse.data.data || [];
             const homeCatalogIds = (homeResponse?.data?.catalogs || []).map(c => c.id);
             const available = allCatalogs.filter(c => !homeCatalogIds.includes(c.id));
             setAvailableCatalogs(available);
           } else {
             setAvailableCatalogs([]);
           }
         } catch (publicError) {
           setAvailableCatalogs([]);
         }
       }
    } catch (error) {
      window.showToast('Error al cargar los catálogos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, catalog, source) => {
    setDraggedCatalog({ ...catalog, source });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetArea) => {
    e.preventDefault();
    
    if (!draggedCatalog) return;
  
    try {
      setStatus('saving');
  
      let updatedOrdered = [...orderedCatalogs];
      let updatedAvailable = [...availableCatalogs];
  
      // --- 1️⃣ Mover catálogo desde "available" hacia "ordered"
      if (targetArea === 'ordered' && draggedCatalog.source === 'available') {
  
        if (orderedCatalogs.length >= 4) {
          window.showToast('No se pueden agregar más de 4 catálogos al home', 'error');
          return;
        }
  
        updatedOrdered.push({ ...draggedCatalog });
  
        updatedAvailable = updatedAvailable.filter(c => c.id !== draggedCatalog.id);
      }
  
      // --- 2️⃣ Mover catálogo desde "ordered" hacia "available"
      else if (targetArea === 'available' && draggedCatalog.source === 'ordered') {
  
        updatedOrdered = updatedOrdered.filter(c => c.id !== draggedCatalog.id);
  
        updatedAvailable.push({ ...draggedCatalog });
      }
  
      // --- 3️⃣ Reordenar dentro de ordered
      else if (targetArea === 'ordered' && draggedCatalog.source === 'ordered') {
  
        const draggedIndex = updatedOrdered.findIndex(c => c.id === draggedCatalog.id);
        const dropIndex = orderedCatalogs.findIndex(
          c => c.id === e.target.closest('[data-catalog-id]')?.dataset.catalogId
        );
  
        if (draggedIndex !== -1 && dropIndex !== -1) {
          const [moved] = updatedOrdered.splice(draggedIndex, 1);
          updatedOrdered.splice(dropIndex, 0, moved);
        }
      }
  
      // -----------------------------------------
      // 🔥 4️⃣ GENERAR ARREGLO FINAL A ENVIAR
      // -----------------------------------------
      const payload = updatedOrdered.map((catalog, index) => ({
        id: catalog.id,
        display_order: index + 1
      }));
  
      // -----------------------------------------
      // 🔥 5️⃣ ENVIAR AL BACKEND EN UN SOLO REQUEST
      // -----------------------------------------
      await api.post('admin/catalogs/update/order', { catalogs: payload });
  
      // -----------------------------------------
      // 🔥 6️⃣ ACTUALIZAR ESTADO LOCAL
      // -----------------------------------------
      setOrderedCatalogs(updatedOrdered);
      setAvailableCatalogs(updatedAvailable);
  
      window.showToast('Catálogos actualizados correctamente', 'success');
      setStatus('saved');
      setTimeout(() => setStatus('ready'), 2000);
  
    } catch (error) {
      window.showToast('Error al actualizar el orden', 'error');
    } finally {
      setDraggedCatalog(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedCatalog(null);
  };

  const handleDropOnItem = async (e, targetCatalog) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedCatalog || draggedCatalog.source !== 'ordered' || draggedCatalog.id === targetCatalog.id) {
      return;
    }

    try {
      setStatus('saving');
      
      const updatedOrdered = [...orderedCatalogs];
      const draggedIndex = updatedOrdered.findIndex(c => c.id === draggedCatalog.id);
      const dropIndex = updatedOrdered.findIndex(c => c.id === targetCatalog.id);
      
      if (draggedIndex !== -1 && dropIndex !== -1 && draggedIndex !== dropIndex) {
        const [removed] = updatedOrdered.splice(draggedIndex, 1);
        updatedOrdered.splice(dropIndex, 0, removed);
        
        // Actualizar UI inmediatamente para mostrar nuevos números
        setOrderedCatalogs(updatedOrdered);
        
        // Generar arreglo completo con todos los catálogos y sus posiciones
        const payload = updatedOrdered.map((catalog, index) => ({
          id: catalog.id,
          display_order: index + 1
        }));
        
        // Enviar arreglo completo en una sola petición
        await api.post('admin/catalogs/update/order', { catalogs: payload });
        
        window.showToast('Orden de catálogos actualizado exitosamente', 'success');
      }
      
      setStatus('saved');
      setTimeout(() => setStatus('ready'), 2000);
    } catch (error) {
      window.showToast('Error al actualizar el orden', 'error');
      setStatus('ready');
      fetchData();
    } finally {
      setDraggedCatalog(null);
    }
  };


  const filteredAvailableCatalogs = availableCatalogs.filter(catalog =>
    catalog.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (catalog.description && catalog.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="admin-home-catalog-manager__loading">
        <p>Cargando catálogos...</p>
      </div>
    );
  }

  return (
    <div className="admin-home-catalog-manager">
      <div className="admin-home-catalog-manager__header">
        <div className="admin-home-catalog-manager__header-left">
          <h2>Ordenar Catálogos del Home</h2>
          <div className={`admin-home-catalog-manager__status admin-home-catalog-manager__status-${status}`}>
            {status === 'ready' && 'Listo para ordenar'}
            {status === 'saving' && 'Guardando cambios...'}
            {status === 'saved' && 'Cambios guardados'}
          </div>
        </div>
                 <div className="admin-home-catalog-manager__actions">
           <button onClick={fetchData} className="btn btn-secondary">
             Recargar
           </button>
         </div>
      </div>

      <div className="admin-home-catalog-manager__description">
        <p>Arrastra los catálogos para ordenarlos en el home. Solo los catálogos activos se mostrarán en la página principal.</p>
        <p><strong>⚠️ Límite máximo:</strong> Solo se pueden mostrar hasta 4 catálogos en el home.</p>
      </div>

      <div className="admin-home-catalog-manager__containers">
        {/* Catálogos del Home */}
        <div className="admin-home-catalog-manager__container">
          <h3>Catálogos del Home ({orderedCatalogs.length}/4)</h3>
          {orderedCatalogs.length >= 4 && (
            <div className="admin-home-catalog-manager__limit-warning">
              <p>✅ Límite máximo alcanzado (4 catálogos)</p>
            </div>
          )}
          <div 
            className={`admin-home-catalog-manager__dropzone ${
              orderedCatalogs.length >= 4 ? 'admin-home-catalog-manager__dropzone--full' : ''
            }`}
            onDragOver={(e) => handleDragOver(e)}
            onDrop={(e) => handleDrop(e, 'ordered')}
          >
            {orderedCatalogs.length === 0 ? (
              <div className="admin-home-catalog-manager__empty">
                <p>No hay catálogos en el home</p>
                <p>Arrastra catálogos desde "Catálogos Disponibles"</p>
              </div>
            ) : (
              orderedCatalogs.map((catalog, index) => (
                <div
                  key={catalog.id}
                  data-catalog-id={catalog.id}
                  className="admin-home-catalog-manager__item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, catalog, 'ordered')}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e)}
                  onDrop={(e) => handleDropOnItem(e, catalog)}
                >
                  <div className="admin-home-catalog-manager__item-content">
                    <div className="admin-home-catalog-manager__item-header">
                      <div className="admin-home-catalog-manager__item-order">
                        {index + 1}
                      </div>
                      <div className="admin-home-catalog-manager__item-name">
                        {catalog.name}
                      </div>
                    </div>
                    {catalog.description && (
                      <div className="admin-home-catalog-manager__item-description">
                        {catalog.description}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Catálogos Disponibles */}
        <div className="admin-home-catalog-manager__container">
          <h3>Catálogos Disponibles ({filteredAvailableCatalogs.length})</h3>
          <div className="admin-home-catalog-manager__search">
            <input
              type="text"
              placeholder="Buscar catálogos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-home-catalog-manager__search-input"
            />
          </div>
          <div 
            className="admin-home-catalog-manager__dropzone"
            onDragOver={(e) => handleDragOver(e)}
            onDrop={(e) => handleDrop(e, 'available')}
          >
            {filteredAvailableCatalogs.length === 0 ? (
              <div className="admin-home-catalog-manager__empty">
                <p>No hay catálogos disponibles</p>
              </div>
            ) : (
              filteredAvailableCatalogs.map((catalog) => (
                <div
                  key={catalog.id}
                  className="admin-home-catalog-manager__item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, catalog, 'available')}
                  onDragEnd={handleDragEnd}
                >
                  <div className="admin-home-catalog-manager__item-content">
                    <div className="admin-home-catalog-manager__item-header">
                      <div className="admin-home-catalog-manager__item-name">
                        {catalog.name}
                      </div>
                    </div>
                    {catalog.description && (
                      <div className="admin-home-catalog-manager__item-description">
                        {catalog.description}
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

export default AdminHomeCatalogManager;
