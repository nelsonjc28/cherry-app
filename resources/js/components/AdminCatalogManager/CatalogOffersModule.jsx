import React, { useState, useEffect } from 'react';
import { catalogService, catalogOfferService } from '../../services/api';
import './CatalogOffersModule.css';

const CatalogOffersModule = ({ onBack, initialCatalog = null }) => {
  const [catalogs, setCatalogs] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCatalog, setSelectedCatalog] = useState(initialCatalog);
  const [currentView, setCurrentView] = useState(initialCatalog ? 'detail' : 'list');
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Estados del formulario
  const [formData, setFormData] = useState({
    catalog_id: '',
    title: '',
    description: '',
    discount_percentage: '',
    discount_type: 'percentage',
    start_date: '',
    end_date: '',
    is_active: true,
    display_order: 0,
    min_purchase_amount: ''
  });

  useEffect(() => {
    if (initialCatalog) {
      setSelectedCatalog(initialCatalog);
      setCurrentView('detail');
      setFormData(prev => ({ ...prev, catalog_id: initialCatalog.id }));
      setLoading(false);
      loadOffers(initialCatalog.id);
    } else {
      fetchCatalogs();
    }
  }, [initialCatalog]);

  const fetchCatalogs = async () => {
    try {
      setLoading(true);
      const response = await catalogService.getAll();
      if (response.data.success) {
        setCatalogs(response.data.data);
      }
    } catch (error) {
      setError('Error al cargar los catálogos');
    } finally {
      setLoading(false);
    }
  };

  const loadOffers = async (catalogId) => {
    try {
      const response = await catalogOfferService.getByCatalog(catalogId);
      if (response.data.success) {
        setOffers(response.data.data);
      }
    } catch (error) {
      setError('Error al cargar las ofertas');
    }
  };

  const handleCatalogSelect = (catalog) => {
    setSelectedCatalog(catalog);
    setCurrentView('detail');
    setFormData(prev => ({ ...prev, catalog_id: catalog.id }));
    loadOffers(catalog.id);
  };

  const handleBackToList = () => {
    setSelectedCatalog(null);
    setCurrentView('list');
    setError('');
    setOffers([]);
  };

  const handleShowForm = (offer = null) => {
    if (offer) {
      setEditingOffer(offer);
             setFormData({
         catalog_id: offer.catalog_id,
         title: offer.title,
         description: offer.description,
         discount_percentage: offer.discount_percentage,
         discount_type: offer.discount_type,
         start_date: offer.start_date.split('T')[0],
         end_date: offer.end_date.split('T')[0],
         is_active: offer.is_active,
         display_order: offer.display_order,
         min_purchase_amount: offer.min_purchase_amount || ''
       });
    } else {
      setEditingOffer(null);
             setFormData({
         catalog_id: selectedCatalog?.id || '',
         title: '',
         description: '',
         discount_percentage: '',
         discount_type: 'percentage',
         start_date: '',
         end_date: '',
         is_active: true,
         display_order: offers.length,
         min_purchase_amount: ''
       });
    }
    setShowForm(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'file' ? files[0] : value
    }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
             const submitData = new FormData();
       Object.keys(formData).forEach(key => {
         if (formData[key] !== null && formData[key] !== '') {
           // Para checkboxes, asegurar que se envíe como boolean
           if (key === 'is_active') {
             submitData.append(key, formData[key] ? '1' : '0');
           } else {
             submitData.append(key, formData[key]);
           }
         }
       });

      let response;
      if (editingOffer) {
        response = await catalogOfferService.update(editingOffer.id, submitData);
      } else {
        response = await catalogOfferService.create(submitData);
      }

      if (response.data.success) {
        window.showToast(
          editingOffer ? 'Oferta actualizada exitosamente' : 'Oferta creada exitosamente',
          'success'
        );
        setShowForm(false);
        setEditingOffer(null);
        loadOffers(selectedCatalog.id);
        await fetchCatalogs(); // Recargar para actualizar contadores
      }
    } catch (error) {
      setError('Error al guardar la oferta');
    }
  };

  const handleDelete = async (offerId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta oferta?')) {
      return;
    }

    try {
      const response = await catalogOfferService.delete(offerId);
      if (response.data.success) {
        window.showToast('Oferta eliminada exitosamente', 'success');
        loadOffers(selectedCatalog.id);
        await fetchCatalogs();
      }
    } catch (error) {
      setError('Error al eliminar la oferta');
    }
  };

  const handleToggleStatus = async (offerId) => {
    try {
      const response = await catalogOfferService.toggleStatus(offerId);
      if (response.data.success) {
        window.showToast('Estado de la oferta actualizado exitosamente', 'success');
        loadOffers(selectedCatalog.id);
        await fetchCatalogs();
      }
    } catch (error) {
      setError('Error al cambiar el estado');
    }
  };

  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newOffers = [...offers];
    const draggedItem = newOffers[dragIndex];
    newOffers.splice(dragIndex, 1);
    newOffers.splice(dropIndex, 0, draggedItem);
    
    setOffers(newOffers);
    
    try {
      const reorderData = newOffers.map((offer, index) => ({
        id: offer.id,
        display_order: index + 1
      }));

      const response = await catalogOfferService.reorder(reorderData);
      if (response.data.success) {
        window.showToast('Orden actualizado exitosamente', 'success');
        await fetchCatalogs();
      }
    } catch (error) {
      setError('Error al actualizar el orden');
      await fetchCatalogs();
    }

    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const getStatusBadge = (offer) => {
    if (!offer.is_active) return 'inactive';
    if (new Date(offer.end_date) < new Date()) return 'expired';
    if (new Date(offer.start_date) > new Date()) return 'pending';
    return 'active';
  };

  const getStatusText = (offer) => {
    if (!offer.is_active) return 'Inactiva';
    if (new Date(offer.end_date) < new Date()) return 'Expirada';
    if (new Date(offer.start_date) > new Date()) return 'Pendiente';
    return 'Activa';
  };

  // Vista de lista de catálogos
  if (currentView === 'list') {
    return (
      <div className="catalog-offers-module">
        <div className="catalog-offers-module__header">
          <div className="catalog-offers-module__title">
            <button 
              className="catalog-offers-module__back-btn"
              onClick={onBack}
              title="Volver al panel principal"
            >
              ←
            </button>
            <h2>Gestión de Ofertas por Catálogos</h2>
          </div>
          <p className="catalog-offers-module__subtitle">
            Crea y gestiona ofertas especiales para cada catálogo
          </p>
        </div>

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

        {loading ? (
          <div className="catalog-offers-module__loading">
            <div className="spinner"></div>
            <p>Cargando catálogos...</p>
          </div>
        ) : catalogs.length === 0 ? (
          <div className="catalog-offers-module__empty">
            <p>No hay catálogos creados</p>
            <p>Crea catálogos primero para poder gestionar sus ofertas</p>
          </div>
        ) : (
          <div className="catalog-offers-module__catalogs">
            <div className="catalog-offers-module__catalogs-grid">
              {catalogs.map((catalog) => (
                <div key={catalog.id} className="catalog-offers-module__catalog-card">
                  <div className="catalog-offers-module__catalog-image">
                    {catalog.image ? (
                      <img src={`/${catalog.image}`} alt={catalog.name} />
                    ) : (
                      <div className="catalog-offers-module__no-image">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  <div className="catalog-offers-module__catalog-info">
                    <h4>{catalog.name}</h4>
                    <p>{catalog.description}</p>
                    
                    <div className="catalog-offers-module__catalog-stats">
                      <span className="catalog-offers-module__stat">
                        🛍️ {catalog.products?.length || 0} productos
                      </span>
                      <span className="catalog-offers-module__stat">
                        🎯 {catalog.offers?.length || 0} ofertas
                      </span>
                    </div>

                    <div className="catalog-offers-module__catalog-status">
                      <span className={`catalog-offers-module__status-badge ${catalog.is_active ? 'active' : 'inactive'}`}>
                        {catalog.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                      <span className="catalog-offers-module__order">
                        Orden: {catalog.display_order}
                      </span>
                    </div>
                  </div>

                  <div className="catalog-offers-module__catalog-actions">
                    <button
                      className="catalog-offers-module__action-btn catalog-offers-module__action-btn--offers"
                      onClick={() => handleCatalogSelect(catalog)}
                      title="Gestionar ofertas de este catálogo"
                    >
                      🎯
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Vista de detalle del catálogo
  return (
    <div className="catalog-offers-module">
      <div className="catalog-offers-module__header">
        <div className="catalog-offers-module__title">
          <button 
            className="catalog-offers-module__back-btn"
            onClick={handleBackToList}
            title="Volver a la lista de catálogos"
          >
            ←
          </button>
          <h2>Gestionar Ofertas: {selectedCatalog?.name}</h2>
        </div>
        <p className="catalog-offers-module__subtitle">
          Crea y gestiona ofertas especiales para este catálogo
        </p>
        <div className="catalog-offers-module__header-actions">
          <button 
            className="catalog-offers-module__view-all-btn"
            onClick={handleBackToList}
            title="Ver todos los catálogos"
          >
            📋 Ver Todos los Catálogos
          </button>
          <button 
            className="catalog-offers-module__add-btn"
            onClick={() => handleShowForm()}
            title="Crear nueva oferta"
          >
            ➕ Nueva Oferta
          </button>
        </div>
      </div>

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

      {/* Formulario de oferta */}
      {showForm && (
        <div className="catalog-offers-module__form-overlay">
          <div className="catalog-offers-module__form">
            <div className="catalog-offers-module__form-header">
              <h3>{editingOffer ? 'Editar Oferta' : 'Nueva Oferta'}</h3>
              <button 
                className="catalog-offers-module__form-close"
                onClick={() => {
                  setShowForm(false);
                  setEditingOffer(null);
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="catalog-offers-module__form-row">
                <div className="catalog-offers-module__form-group">
                  <label>Título de la oferta *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    placeholder="Ej: Descuento de verano"
                  />
                </div>
                <div className="catalog-offers-module__form-group">
                  <label>Descripción *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    placeholder="Describe la oferta"
                    rows="3"
                  />
                </div>
              </div>

                             <div className="catalog-offers-module__form-row">
                 <div className="catalog-offers-module__form-group">
                   <label>Descuento *</label>
                   <div className="catalog-offers-module__discount-inputs">
                     <input
                       type="number"
                       name="discount_percentage"
                       value={formData.discount_percentage}
                       onChange={handleInputChange}
                       required
                       min="0"
                       max="100"
                       step="0.01"
                       placeholder="0.00"
                     />
                     <select
                       name="discount_type"
                       value={formData.discount_type}
                       onChange={handleInputChange}
                     >
                       <option value="percentage">%</option>
                       <option value="fixed">$</option>
                     </select>
                   </div>
                 </div>
                 <div className="catalog-offers-module__form-group">
                   <label>Compra mínima ($)</label>
                   <input
                     type="number"
                     name="min_purchase_amount"
                     value={formData.min_purchase_amount}
                     onChange={handleInputChange}
                     min="0"
                     step="0.01"
                     placeholder="Sin mínimo"
                   />
                 </div>
               </div>

              <div className="catalog-offers-module__form-row">
                <div className="catalog-offers-module__form-group">
                  <label>Fecha de inicio *</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="catalog-offers-module__form-group">
                  <label>Fecha de fin *</label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

                             <div className="catalog-offers-module__form-row">
                 <div className="catalog-offers-module__form-group">
                   <label>Compra mínima ($)</label>
                   <input
                     type="number"
                     name="min_purchase_amount"
                     value={formData.min_purchase_amount}
                     onChange={handleInputChange}
                     min="0"
                     step="0.01"
                     placeholder="Sin mínimo"
                   />
                 </div>
                 <div className="catalog-offers-module__form-group">
                   <label>Orden de visualización</label>
                   <input
                     type="number"
                     name="display_order"
                     value={formData.display_order}
                     min="0"
                   />
                 </div>
               </div>

                             <div className="catalog-offers-module__form-row">
                 <div className="catalog-offers-module__form-group">
                   <label className="catalog-offers-module__checkbox-label">
                     <input
                       type="checkbox"
                       name="is_active"
                       checked={formData.is_active}
                       onChange={handleCheckboxChange}
                     />
                     Oferta activa
                   </label>
                 </div>
               </div>

              <div className="catalog-offers-module__form-actions">
                <button type="submit" className="catalog-offers-module__submit-btn">
                  {editingOffer ? 'Actualizar Oferta' : 'Crear Oferta'}
                </button>
                <button 
                  type="button" 
                  className="catalog-offers-module__cancel-btn"
                  onClick={() => {
                    setShowForm(false);
                    setEditingOffer(null);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de ofertas */}
      <div className="catalog-offers-module__content">
        <div className="catalog-offers-module__offers-header">
          <h4>Ofertas del catálogo</h4>
          <p>Arrastra y suelta para reordenar las ofertas</p>
        </div>

        {offers.length === 0 ? (
          <div className="catalog-offers-module__empty">
            <p>No hay ofertas en este catálogo</p>
            <p>Crea ofertas para promocionar los productos</p>
          </div>
        ) : (
          <div className="catalog-offers-module__offers-grid">
            {offers.map((offer, index) => (
              <div
                key={offer.id}
                className={`catalog-offers-module__offer-item ${
                  dragIndex === index ? 'dragging' : ''
                } ${dragOverIndex === index ? 'drag-over' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                                 <div className="catalog-offers-module__offer-preview">
                   <div className="catalog-offers-module__offer-placeholder">
                     🎯
                   </div>
                 </div>
                
                <div className="catalog-offers-module__offer-info">
                  <div className="catalog-offers-module__offer-details">
                    <h5 className="catalog-offers-module__offer-title">{offer.title}</h5>
                    <p className="catalog-offers-module__offer-description">{offer.description}</p>
                                         <div className="catalog-offers-module__offer-discount">
                       <span className="catalog-offers-module__discount-amount">
                         {offer.discount_type === 'percentage' ? `${offer.discount_percentage}%` : `$${offer.discount_percentage}`}
                       </span>
                     </div>
                  </div>
                  
                  <div className="catalog-offers-module__offer-meta">
                    <div className="catalog-offers-module__offer-dates">
                      <span>Inicio: {formatDate(offer.start_date)}</span>
                      <span>Fin: {formatDate(offer.end_date)}</span>
                    </div>
                                         <div className="catalog-offers-module__offer-usage">
                       {offer.min_purchase_amount && (
                         <span>Mín: ${offer.min_purchase_amount}</span>
                       )}
                     </div>
                  </div>
                  
                  <div className="catalog-offers-module__offer-actions">
                    <span className={`catalog-offers-module__status-badge ${getStatusBadge(offer)}`}>
                      {getStatusText(offer)}
                    </span>
                    <span className="catalog-offers-module__offer-order">
                      Orden: {offer.display_order}
                    </span>
                    <div className="catalog-offers-module__offer-buttons">
                      <button
                        type="button"
                        className="catalog-offers-module__edit-btn"
                        onClick={() => handleShowForm(offer)}
                        title="Editar oferta"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="catalog-offers-module__toggle-btn"
                        onClick={() => handleToggleStatus(offer.id)}
                        title={offer.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {offer.is_active ? '🔴' : '🟢'}
                      </button>
                      <button
                        type="button"
                        className="catalog-offers-module__remove-btn"
                        onClick={() => handleDelete(offer.id)}
                        title="Eliminar oferta"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogOffersModule;
