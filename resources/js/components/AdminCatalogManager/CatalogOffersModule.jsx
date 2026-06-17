import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { catalogOfferService } from '../../services/api';
import ProductMultiSelect from '../ProductMultiSelect/ProductMultiSelectInline';
import UserMultiSelect from '../UserMultiSelect/UserMultiSelectInline';
import { formatBuyXGetYOfferLabel } from '../../utils/buyXGetYUtils';
import './CatalogOffersModule.css';

const TARGET_SCOPES = [
  { id: 'category', label: 'Categoría', hint: 'Uno o más grupos de categoría (ej. Chamarras, Blusas).' },
  { id: 'catalog', label: 'Catálogo', hint: 'Uno o más catálogos.' },
  { id: 'new', label: 'Nuevos', hint: 'Productos que califican como nuevos.' },
  { id: 'rebajas', label: 'Rebajas', hint: 'Productos en rebaja (desc_promo > 0).' },
  { id: 'products', label: 'Productos específicos', hint: 'Selección manual producto por producto.' },
];

const DEFAULT_FORM_SCOPES = {
  target_scopes: ['category'],
  target_category_codes: [],
  target_catalog_ids: [],
  target_products: [],
};

function parseOfferScopes(offer) {
  if (Array.isArray(offer?.target_scopes) && offer.target_scopes.length > 0) {
    return offer.target_scopes;
  }
  if (offer?.target_scope) {
    return [offer.target_scope];
  }
  return ['products'];
}

function parseOfferCategoryCodes(offer) {
  if (Array.isArray(offer?.target_category_codes) && offer.target_category_codes.length > 0) {
    return offer.target_category_codes.map(String);
  }
  if (offer?.target_category_code) {
    return [String(offer.target_category_code)];
  }
  return [];
}

function parseOfferCatalogIds(offer) {
  if (Array.isArray(offer?.target_catalog_ids) && offer.target_catalog_ids.length > 0) {
    return offer.target_catalog_ids.map(String);
  }
  if (offer?.target_catalog_id) {
    return [String(offer.target_catalog_id)];
  }
  return [];
}

function describeOfferScope(offer, categories = [], catalogs = []) {
  const scopes = parseOfferScopes(offer);
  const parts = [];

  if (scopes.includes('category')) {
    const codes = parseOfferCategoryCodes(offer);
    const names = codes.map((code) => {
      const cat = categories.find((c) => String(c.code) === String(code));
      return cat?.name || code;
    });
    parts.push(`Categorías: ${names.length ? names.join(', ') : '—'}`);
  }
  if (scopes.includes('catalog')) {
    const ids = parseOfferCatalogIds(offer);
    const names = ids.map((id) => {
      const catalog = catalogs.find((c) => String(c.code ?? c.id) === String(id));
      return catalog?.name || id;
    });
    parts.push(`Catálogos: ${names.length ? names.join(', ') : '—'}`);
  }
  if (scopes.includes('new')) parts.push('Nuevos');
  if (scopes.includes('rebajas')) parts.push('Rebajas');
  if (scopes.includes('products')) {
    const count = offer?.target_products?.length ?? offer?.products_info?.length ?? 0;
    parts.push(`Productos (${count})`);
  }

  return parts.length ? parts.join(' · ') : 'Sin alcance';
}

const CatalogOffersModule = ({ onBack }) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDiscountType, setSelectedDiscountType] = useState(null);
  const [currentView, setCurrentView] = useState('list');
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Estados para el multiselect de usuarios
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [catalogs, setCatalogs] = useState([]);
  const [categories, setCategories] = useState([]);

  // Estados del formulario
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discount_percentage: '',
    discount_type: 'percentage',
    discount_category: 'product_discount',
    ...DEFAULT_FORM_SCOPES,
    start_date: '',
    end_date: '',
    is_active: true,
    display_order: 0,
    buy_quantity: '', // Cantidad a comprar para Buy X Get Y
    get_quantity: '', // Cantidad gratis para Buy X Get Y
    min_purchase_amount: '', // Monto mínimo del pedido para descuentos de pedido
    target_users: [], // Array de IDs de usuarios seleccionados
    target_products: [] // Array de productos seleccionados para descuento
  });

  useEffect(() => {
    loadAllOffers();
    loadCatalogs();
    loadCategories();
  }, []);


  const loadAllOffers = async () => {
    try {
      setLoading(true);
      const response = await catalogOfferService.getAll();
      if (response.data.success) {
        setOffers(response.data.data);
      }
    } catch (error) {
      setError('Error al cargar las ofertas');
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar usuarios completos basándose en IDs
  const loadSelectedUsers = async (userIds) => {
    try {

      const response = await axios.get('/api/admin/clients', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.data.success && response.data.users) {
        // Filtrar solo los usuarios que están en la lista de IDs
        const selectedUsers = response.data.users.filter(user =>
          userIds.includes(user.id)
        );

        setSelectedUsers(selectedUsers);
      } else {
        setSelectedUsers([]);
      }
    } catch (error) {
      setSelectedUsers([]);
    }
  };

  const loadCatalogs = async () => {
    try {

      const response = await axios.get('/api/admin/catalogs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });


      if (response.data.success && response.data.data) {
        setCatalogs(response.data.data);
      } else {
        setCatalogs([]);
      }
    } catch (error) {
      setCatalogs([]);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await axios.get('/api/admin/categories', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.data.success) {
        setCategories(response.data.categories || []);
      } else {
        setCategories([]);
      }
    } catch (error) {
      setCategories([]);
    }
  };

  const handleUsersChange = (users) => {
    // Filtrar usuarios válidos antes de actualizar el estado
    const validUsers = users.filter(user => user && user.id);
    setSelectedUsers(validUsers);
    setFormData(prev => ({
      ...prev,
      target_users: validUsers.map(user => user.id)
    }));
  };

  // Función para obtener usuarios por categoría
  const handleDiscountTypeSelect = (discountType) => {
    setSelectedDiscountType(discountType);
    setCurrentView('detail');
    setError('');
  };

  const handleBackToList = () => {
    setSelectedDiscountType(null);
    setCurrentView('list');
    setError('');
  };

  const handleShowForm = async (offer = null) => {
    if (offer) {
      setEditingOffer(offer);

      // Configurar productos: usar información completa si está disponible
      const targetProducts = offer.products_info && offer.products_info.length > 0
        ? offer.products_info
        : offer.target_products || [];

      // Configurar el formData
      setFormData({
        title: offer.title,
        description: offer.description,
        discount_percentage: offer.discount_percentage,
        discount_type: offer.discount_type,
        discount_category: offer.discount_category || 'product_discount',
        target_scopes: parseOfferScopes(offer),
        target_category_codes: parseOfferCategoryCodes(offer),
        target_catalog_ids: parseOfferCatalogIds(offer),
        start_date: offer.start_date.split('T')[0],
        end_date: offer.end_date.split('T')[0],
        is_active: offer.is_active,
        display_order: offer.display_order,
        min_purchase_amount: offer.min_purchase_amount || '',
        buy_quantity: offer.buy_quantity || '',
        get_quantity: offer.get_quantity || '',
        target_users: offer.target_users || [],
        target_products: targetProducts
      });

      // Cargar usuarios seleccionados para edición
      // offer.target_users contiene IDs, necesitamos cargar los usuarios completos
      if (offer.target_users && offer.target_users.length > 0) {
        await loadSelectedUsers(offer.target_users);
      } else {
        setSelectedUsers([]);
      }

      // Abrir modal después de cargar usuarios
      setShowForm(true);
    } else {
      setEditingOffer(null);
      setFormData({
        title: '',
        description: '',
        discount_percentage: '',
        discount_type: 'percentage',
        discount_category: selectedDiscountType || 'product_discount',
        ...DEFAULT_FORM_SCOPES,
        start_date: '',
        end_date: '',
        is_active: true,
        display_order: offers.length,
        buy_quantity: '',
        get_quantity: '',
        min_purchase_amount: '',
        target_users: [],
        target_products: []
      });
      setSelectedUsers([]);

      // Abrir modal para nueva oferta
      setShowForm(true);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : type === 'file' ? files[0] : value
      };

      // Si se cambia a "Envío gratis", limpiar solo campos de descuento numérico
      if (name === 'discount_category' && value === 'free_shipping') {
        newData.discount_percentage = 0;
        newData.discount_type = 'percentage';
      }

      return newData;
    });
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };



  // Función para manejar cambios en productos seleccionados
  const handleScopeToggle = (scopeId, checked) => {
    setFormData((prev) => {
      const nextScopes = checked
        ? [...new Set([...(prev.target_scopes || []), scopeId])]
        : (prev.target_scopes || []).filter((scope) => scope !== scopeId);

      return {
        ...prev,
        target_scopes: nextScopes,
        target_category_codes: nextScopes.includes('category') ? (prev.target_category_codes || []) : [],
        target_catalog_ids: nextScopes.includes('catalog') ? (prev.target_catalog_ids || []) : [],
        target_products: nextScopes.includes('products') ? (prev.target_products || []) : [],
      };
    });
  };

  const handleScopeListToggle = (field, value, checked) => {
    const stringValue = String(value);
    setFormData((prev) => {
      const current = Array.isArray(prev[field]) ? prev[field].map(String) : [];
      const next = checked
        ? [...new Set([...current, stringValue])]
        : current.filter((item) => item !== stringValue);

      return { ...prev, [field]: next };
    });
  };

  const handleProductsChange = (selectedProducts) => {
    setFormData(prev => ({
      ...prev,
      target_products: Array.isArray(selectedProducts) ? selectedProducts : []
    }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.discount_category !== 'order_discount') {
      const scopes = formData.target_scopes || [];
      if (scopes.length === 0) {
        setError('Selecciona al menos un alcance para esta oferta.');
        return;
      }
      if (scopes.includes('category') && (!formData.target_category_codes || formData.target_category_codes.length === 0)) {
        setError('Selecciona al menos una categoría.');
        return;
      }
      if (scopes.includes('catalog') && (!formData.target_catalog_ids || formData.target_catalog_ids.length === 0)) {
        setError('Selecciona al menos un catálogo.');
        return;
      }
      if (scopes.includes('products') && (!formData.target_products || formData.target_products.length === 0)) {
        setError('Selecciona al menos un producto o quita el alcance de productos específicos.');
        return;
      }
    }

    try {

      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'target_products') {
          const productsArray = Array.isArray(formData[key]) ? formData[key] : [];
          submitData.append(key, JSON.stringify(productsArray));
        } else if (key === 'target_scopes' || key === 'target_category_codes' || key === 'target_catalog_ids') {
          const arr = Array.isArray(formData[key]) ? formData[key] : [];
          submitData.append(key, JSON.stringify(arr));
        } else if (key === 'target_users') {
          const usersArray = selectedUsers
            .filter(user => user && user.id) // Filtrar usuarios válidos
            .map(user => user.id);
          submitData.append(key, JSON.stringify(usersArray));
        } else if (formData[key] !== null && formData[key] !== '') {
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
        loadAllOffers();
      } else {
        setError('Error al guardar la oferta: ' + (response.data.message || 'Error desconocido'));
      }
    } catch (error) {
      setError('Error al guardar la oferta: ' + error.message);
    }
  };

  const handleDelete = async (offerId) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'No podrás revertir esta acción',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const response = await catalogOfferService.delete(offerId);
        if (response.data.success) {
          window.showToast('La oferta ha sido eliminada exitosamente', 'success');
          loadAllOffers();
        }
      } catch (error) {
        setError('Error al eliminar la oferta');
      }
    }
  };

  const handleToggleStatus = async (offerId) => {
    try {
      const response = await catalogOfferService.toggleStatus(offerId);
      if (response.data.success) {
        window.showToast('Estado de la oferta actualizado exitosamente', 'success');
        loadAllOffers();
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

    const sortedTypeOffers = [...getOffersByType(selectedDiscountType)];
    const draggedItem = sortedTypeOffers[dragIndex];
    sortedTypeOffers.splice(dragIndex, 1);
    sortedTypeOffers.splice(dropIndex, 0, draggedItem);

    const reorderData = sortedTypeOffers.map((offer, index) => ({
      id: offer.id,
      display_order: index + 1,
    }));

    setOffers((prev) => {
      const others = prev.filter((o) => o.discount_category !== selectedDiscountType);
      const updatedTypeOffers = sortedTypeOffers.map((offer, index) => ({
        ...offer,
        display_order: index + 1,
      }));
      return [...others, ...updatedTypeOffers].sort(
        (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
      );
    });

    try {
      const response = await catalogOfferService.reorder(reorderData);
      if (response.data.success) {
        window.showToast('Orden actualizado exitosamente', 'success');
        loadAllOffers();
      }
    } catch (error) {
      setError('Error al actualizar el orden');
      loadAllOffers();
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

  const getOffersByType = (discountType) => {
    return offers
      .filter(offer => offer.discount_category === discountType)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  };

  /** Vigente = activa en admin + fechas inclusive (misma regla que backend). */
  const isOfferVigente = (offer) => {
    if (!offer?.is_active) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(offer.start_date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(offer.end_date);
    end.setHours(23, 59, 59, 999);
    return start <= today && end >= today;
  };

  const getStatusBadge = (offer) => {
    if (!offer.is_active) return 'inactive';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(offer.end_date);
    end.setHours(23, 59, 59, 999);
    const start = new Date(offer.start_date);
    start.setHours(0, 0, 0, 0);
    if (end < today) return 'expired';
    if (start > today) return 'pending';
    return 'active';
  };

  const getStatusText = (offer) => {
    if (!offer.is_active) return 'Inactiva';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(offer.end_date);
    end.setHours(23, 59, 59, 999);
    const start = new Date(offer.start_date);
    start.setHours(0, 0, 0, 0);
    if (end < today) return 'Expirada';
    if (start > today) return 'Pendiente';
    return 'Activa';
  };

  const getDiscountTypeInfo = (type) => {
    const types = {
      'product_discount': { name: 'Descuento en productos', icon: '🛍️', color: '#28a745' },
      'buy_x_get_y': { name: 'Buy X Get Y', icon: '🎁', color: '#ffc107' },
      'free_shipping': { name: 'Envío gratis', icon: '🚚', color: '#6f42c1' }
    };
    return types[type] || { name: 'Desconocido', icon: '❓', color: '#6c757d' };
  };

  // Vista de lista de tipos de descuento
  if (currentView === 'list') {
    const discountTypes = ['product_discount', 'buy_x_get_y', 'free_shipping'];

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
            <h2>Gestión de Descuentos</h2>
          </div>
          <p className="catalog-offers-module__subtitle">
            Crea y gestiona ofertas por tipo de descuento
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
            <p>Cargando descuentos...</p>
          </div>
        ) : (
          <div className="catalog-offers-module__catalogs">
            <div className="catalog-offers-module__catalogs-grid">
              {discountTypes.map((type) => {
                const typeInfo = getDiscountTypeInfo(type);
                const typeOffers = getOffersByType(type);
                const activeOffers = typeOffers.filter(isOfferVigente);

                return (
                  <div key={type} className="catalog-offers-module__catalog-card">
                    <div className="catalog-offers-module__catalog-image">
                      <div
                        className="catalog-offers-module__no-image"
                        style={{
                          display: 'flex',
                          backgroundColor: typeInfo.color + '20',
                          color: typeInfo.color,
                          fontSize: '48px'
                        }}
                      >
                        {typeInfo.icon}
                      </div>
                    </div>

                    <div className="catalog-offers-module__catalog-info">
                      <h4>{typeInfo.name}</h4>
                      <p>Gestiona ofertas de {typeInfo.name.toLowerCase()}</p>

                      <div className="catalog-offers-module__catalog-stats">
                        <span className="catalog-offers-module__stat">
                          🎯 {typeOffers.length} ofertas totales
                        </span>
                        <span className="catalog-offers-module__stat">
                          ✅ {activeOffers.length} ofertas activas
                        </span>
                      </div>

                      <div className="catalog-offers-module__catalog-status">
                        <span className="catalog-offers-module__status-badge active">
                          Disponible
                        </span>
                      </div>
                    </div>

                    <div className="catalog-offers-module__catalog-actions">
                      <button
                        className="catalog-offers-module__action-btn catalog-offers-module__action-btn--offers"
                        onClick={() => handleDiscountTypeSelect(type)}
                        title={`Gestionar ofertas de ${typeInfo.name}`}
                      >
                        🎯
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Vista de detalle del tipo de descuento
  const typeInfo = getDiscountTypeInfo(selectedDiscountType);
  const filteredOffers = getOffersByType(selectedDiscountType);

  return (
    <div className="catalog-offers-module">
      <div className="catalog-offers-module__header">
        <div className="catalog-offers-module__title">
          <button
            className="catalog-offers-module__back-btn"
            onClick={handleBackToList}
            title="Volver a la lista de tipos de descuento"
          >
            ←
          </button>
          <h2>Gestionar Ofertas: {typeInfo.name}</h2>
        </div>
        <p className="catalog-offers-module__subtitle">
          Crea y gestiona ofertas de {typeInfo.name.toLowerCase()}
        </p>
        <div className="catalog-offers-module__header-actions">
          <button
            className="catalog-offers-module__view-all-btn"
            onClick={handleBackToList}
            title="Ver todos los tipos de descuento"
          >
            📋 Ver Todos los Tipos
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
                  <label>Tipo de descuento *</label>
                  <select
                    name="discount_category"
                    value={formData.discount_category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="product_discount">Descuento en productos</option>
                    <option value="buy_x_get_y">Buy X Get Y</option>
                    <option value="free_shipping">Envío gratis</option>
                  </select>
                </div>
              </div>

              <div className="catalog-offers-module__form-row">
                <div className="catalog-offers-module__form-group catalog-offers-module__form-group--full">
                  <label>Usuarios objetivo *</label>
                  <UserMultiSelect
                    selectedUsers={selectedUsers}
                    onUsersChange={handleUsersChange}
                    placeholder="Buscar usuarios clientes..."
                    maxHeight="300px"
                  />
                  <small className="catalog-offers-module__form-help">
                    Selecciona los usuarios específicos que tendrán acceso a este descuento. Puedes seleccionar todos, por categoría (Oro/Bronce) o usuarios individuales. Los usuarios se cargan desde la base de datos.
                  </small>
                </div>
              </div>

              {/* Alcance de la oferta (categoría, catálogo, nuevos, rebajas o productos) */}
              {formData.discount_category !== 'order_discount' && (
                <div className="catalog-offers-module__form-row">
                  <div className="catalog-offers-module__form-group catalog-offers-module__form-group--full">
                    <label>¿A qué aplica esta oferta? *</label>
                    <div className="catalog-offers-module__scope-radios">
                      {TARGET_SCOPES.map((scope) => (
                        <label key={scope.id} className="catalog-offers-module__scope-radio">
                          <input
                            type="checkbox"
                            checked={(formData.target_scopes || []).includes(scope.id)}
                            onChange={(e) => handleScopeToggle(scope.id, e.target.checked)}
                          />
                          <span>{scope.label}</span>
                        </label>
                      ))}
                    </div>
                    <small className="catalog-offers-module__form-help">
                      Puedes combinar varios alcances. Un producto que cumpla más de uno recibe el descuento una sola vez.
                    </small>

                    {(formData.target_scopes || []).includes('category') && (
                      <div className="catalog-offers-module__scope-multi-list">
                        <div className="catalog-offers-module__scope-multi-title">Categorías</div>
                        {categories.map((category) => (
                          <label key={category.id} className="catalog-offers-module__scope-radio">
                            <input
                              type="checkbox"
                              checked={(formData.target_category_codes || []).includes(String(category.code))}
                              onChange={(e) => handleScopeListToggle('target_category_codes', category.code, e.target.checked)}
                            />
                            <span>{category.name} ({category.code})</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {(formData.target_scopes || []).includes('catalog') && (
                      <div className="catalog-offers-module__scope-multi-list">
                        <div className="catalog-offers-module__scope-multi-title">Catálogos</div>
                        {catalogs.map((catalog) => {
                          const catalogKey = String(catalog.code ?? catalog.id);
                          return (
                            <label key={catalog.id} className="catalog-offers-module__scope-radio">
                              <input
                                type="checkbox"
                                checked={(formData.target_catalog_ids || []).includes(catalogKey)}
                                onChange={(e) => handleScopeListToggle('target_catalog_ids', catalogKey, e.target.checked)}
                              />
                              <span>{catalog.name} ({catalogKey})</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {(formData.target_scopes || []).includes('products') && (
                      <>
                        <ProductMultiSelect
                          selectedProducts={formData.target_products}
                          onProductsChange={handleProductsChange}
                          placeholder="Buscar productos de Cherry API..."
                          maxHeight="400px"
                        />
                        <small className="catalog-offers-module__form-help">
                          Selecciona los productos específicos que tendrán esta oferta.
                        </small>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Campos específicos para Buy X Get Y */}
              {formData.discount_category === 'buy_x_get_y' && (
                <div className="catalog-offers-module__form-row">
                  <div className="catalog-offers-module__form-group">
                    <label>Cantidad a comprar (X) *</label>
                    <input
                      type="number"
                      name="buy_quantity"
                      value={formData.buy_quantity || ''}
                      onChange={handleInputChange}
                      required
                      min="1"
                      placeholder="Ej: 10"
                    />
                    <small className="catalog-offers-module__form-help">
                      Cantidad mínima de productos que debe comprar el cliente
                    </small>
                  </div>
                  <div className="catalog-offers-module__form-group">
                    <label>Cantidad gratis (Y) *</label>
                    <input
                      type="number"
                      name="get_quantity"
                      value={formData.get_quantity || ''}
                      onChange={handleInputChange}
                      required
                      min="1"
                      placeholder="Ej: 2"
                    />
                    <small className="catalog-offers-module__form-help">
                      Cantidad de productos que recibirá gratis
                    </small>
                  </div>
                </div>
              )}

              {/* Campos de descuento para descuento en productos */}
              {formData.discount_category === 'product_discount' && (
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
                    <label>Compra mínima en productos de la promo (opcional)</label>
                    <input
                      type="number"
                      name="min_purchase_amount"
                      value={formData.min_purchase_amount}
                      onChange={handleInputChange}
                      min="0"
                      step="1"
                      placeholder="Ej: 1000"
                    />
                    <small className="catalog-offers-module__form-help">
                      Subtotal mínimo de productos elegibles para activar el descuento (ej. 10% con mínimo $1,000).
                    </small>
                  </div>
                </div>
              )}

              {formData.discount_category === 'buy_x_get_y' && (
                <div className="catalog-offers-module__form-row">
                  <div className="catalog-offers-module__form-group">
                    <label>Compra mínima en productos de la promo (opcional)</label>
                    <input
                      type="number"
                      name="min_purchase_amount"
                      value={formData.min_purchase_amount}
                      onChange={handleInputChange}
                      min="0"
                      step="1"
                      placeholder="Ej: 1000"
                    />
                    <small className="catalog-offers-module__form-help">
                      Subtotal mínimo de productos elegibles para activar la oferta Buy X Get Y.
                    </small>
                  </div>
                </div>
              )}

              {/* Campo para Envío gratis: Monto mínimo para aplicar */}
              {formData.discount_category === 'free_shipping' && (
                <div className="catalog-offers-module__form-row">
                  <div className="catalog-offers-module__form-group">
                    <label>Monto mínimo para envío gratis (máx $3000) *</label>
                    <input
                      type="number"
                      name="min_purchase_amount"
                      value={formData.min_purchase_amount}
                      onChange={(e) => {
                        const v = e.target.value;
                        let num = parseFloat(v || '0');
                        if (isNaN(num)) num = 0;
                        if (num > 3000) num = 3000;
                        setFormData(prev => ({ ...prev, min_purchase_amount: num }));
                      }}
                      required
                      min="0"
                      max="3000"
                      step="1"
                      placeholder="Ej: 2000"
                    />
                    <small className="catalog-offers-module__form-help">
                      Si el total del pedido es mayor o igual a este monto, el envío será gratis.
                    </small>
                  </div>
                </div>
              )}

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
                  <label>Orden de visualización</label>
                  <input
                    type="number"
                    name="display_order"
                    value={formData.display_order}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
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
          <h4>Ofertas de {typeInfo.name}</h4>
          <p>Arrastra y suelta para reordenar las ofertas</p>
        </div>

        {filteredOffers.length === 0 ? (
          <div className="catalog-offers-module__empty">
            <p>No hay ofertas de {typeInfo.name.toLowerCase()}</p>
            <p>Crea ofertas para promocionar este tipo de descuento</p>
          </div>
        ) : (
          <div className="catalog-offers-module__offers-grid">
            {filteredOffers.map((offer, index) => (
              <div
                key={offer.id}
                className={`catalog-offers-module__offer-item ${dragIndex === index ? 'dragging' : ''
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
                    <div className="catalog-offers-module__offer-category">
                      <span className="catalog-offers-module__category-badge">
                        {offer.discount_category === 'product_discount' && '🛍️ Descuento en productos'}
                        {offer.discount_category === 'buy_x_get_y' && '🎁 Buy X Get Y'}
                        {offer.discount_category === 'free_shipping' && '🚚 Envío gratis'}
                      </span>
                      <span className="catalog-offers-module__scope-badge">
                        {describeOfferScope(offer, categories, catalogs)}
                      </span>
                    </div>
                    {offer.discount_category !== 'buy_x_get_y' && offer.discount_category !== 'free_shipping' && (
                      <div className="catalog-offers-module__offer-discount">
                        <span className="catalog-offers-module__discount-amount">
                          {offer.discount_type === 'percentage' ? `${offer.discount_percentage}%` : `$${offer.discount_percentage}`}
                        </span>
                      </div>
                    )}
                    {offer.discount_category === 'buy_x_get_y' && (
                      <div className="catalog-offers-module__offer-discount">
                        <span className="catalog-offers-module__discount-amount">
                          {formatBuyXGetYOfferLabel(offer.buy_quantity, offer.get_quantity).replace(/^🎁\s*/, '')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="catalog-offers-module__offer-meta">
                    <div className="catalog-offers-module__offer-dates">
                      <span>Inicio: {formatDate(offer.start_date)}</span>
                      <span>Fin: {formatDate(offer.end_date)}</span>
                    </div>
                    <div className="catalog-offers-module__offer-usage">
                      {offer.min_purchase_amount && offer.discount_category === 'free_shipping' && (
                        <span>Envío gratis desde: ${offer.min_purchase_amount}</span>
                      )}
                      {offer.min_purchase_amount && (offer.discount_category === 'product_discount' || offer.discount_category === 'buy_x_get_y') && (
                        <span>Compra mín. promo: ${offer.min_purchase_amount}</span>
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

