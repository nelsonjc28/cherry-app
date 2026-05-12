import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import CherryButton from '../CherryButton/CherryButton';
import AccountStatementModal from '../AccountStatementModal/AccountStatementModal';
import useUserStore from '../../store/userStore';
import { fetchSepomexPostalCode } from '../../utils/sepomexPostal';
import { sanitizeStreetNumberDigits } from '../../utils/addressDisplay';
import { formatExternalClienteId } from '../../utils/externalClienteId';
import './ClientManager.css';

const emptyAddressForm = (address, defaultIfFirst) => ({
  street_address: address?.street_address ?? '',
  street_number_ext: sanitizeStreetNumberDigits(address?.street_number_ext ?? ''),
  street_number_int: sanitizeStreetNumberDigits(address?.street_number_int ?? ''),
  city: address?.city ?? '',
  municipality: address?.municipality ?? '',
  colonia: address?.colonia ?? '',
  state: address?.state ?? '',
  postal_code: String(address?.postal_code ?? '')
    .replace(/\D/g, '')
    .slice(0, 5),
  country: address?.country || 'México',
  additional_info: address?.additional_info ?? '',
  is_default: address ? Boolean(address.is_default) : Boolean(defaultIfFirst),
});

const ReqStar = () => <span className="client-manager__req">*</span>;

function formatClientDisplayName(client) {
  return [client.first_name, client.middle_name, client.last_name].filter(Boolean).join(' ').trim();
}

const showClientActionTooltip = (e) => {
  const button = e.currentTarget;
  const tooltipText = button.getAttribute('data-tooltip') || button.getAttribute('aria-label');
  if (!tooltipText) return;
  let tooltip = document.querySelector('.client-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'client-tooltip';
    document.body.appendChild(tooltip);
  }
  tooltip.textContent = tooltipText;
  tooltip.style.display = 'block';
  const rect = button.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
  tooltip.style.top = `${rect.top - tooltipRect.height - 10}px`;
};

const hideClientActionTooltip = () => {
  const tooltip = document.querySelector('.client-tooltip');
  if (tooltip) tooltip.style.display = 'none';
};

/**
 * Dirección admin: mismo flujo que perfil (CP → SEPOMEX → colonia / estado / municipio).
 * `city` queda alineado con colonia (asentamiento), requerido por el backend.
 */
const AdminClientAddressFields = ({ form, onAddressChange, settlements, loadingPostal }) => {
  const fromSepomex = settlements.length > 0;
  return (
    <div className="client-manager__addresses-wrap client-manager__addresses-wrap--in-form">
      <div className="client-manager__form-row client-manager__form-row--grid-12">
        <div className="client-manager__form-group client-manager__form-col-6">
          <label htmlFor="addr_street_address">
            Calle / vialidad <ReqStar />
          </label>
          <input
            id="addr_street_address"
            name="street_address"
            value={form.street_address}
            onChange={onAddressChange}
            required
            maxLength={500}
          />
        </div>
      </div>
      <div className="client-manager__form-row">
        <div className="client-manager__form-group">
          <label htmlFor="addr_street_number_ext">No. exterior</label>
          <input
            id="addr_street_number_ext"
            name="street_number_ext"
            value={form.street_number_ext}
            onChange={onAddressChange}
            maxLength={20}
            inputMode="numeric"
          />
        </div>
        <div className="client-manager__form-group">
          <label htmlFor="addr_street_number_int">No. interior</label>
          <input
            id="addr_street_number_int"
            name="street_number_int"
            value={form.street_number_int}
            onChange={onAddressChange}
            maxLength={20}
            inputMode="numeric"
          />
        </div>
      </div>
      <div className="client-manager__form-group">
        <label htmlFor="addr_postal_code">
          Código postal <ReqStar />
        </label>
        <input
          id="addr_postal_code"
          name="postal_code"
          value={form.postal_code}
          onChange={onAddressChange}
          placeholder="CP (5 dígitos)"
          maxLength={5}
          inputMode="numeric"
          autoComplete="postal-code"
          required
        />
        {loadingPostal && (
          <span className="client-manager__postal-loading">Consultando SEPOMEX…</span>
        )}
      </div>
      <div className="client-manager__form-group">
        <label htmlFor="addr_settlement_picker">Colonia</label>
        {fromSepomex ? (
          <select
            id="addr_settlement_picker"
            name="settlement_picker"
            value={form.colonia || form.city || ''}
            onChange={onAddressChange}
            required
          >
            <option value="">Selecciona una colonia</option>
            {settlements.map((s, i) => (
              <option key={`${i}-${s}`} value={s}>
                {s}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="addr_settlement_picker"
            name="colonia"
            value={form.colonia}
            onChange={onAddressChange}
            placeholder="Colonia"
            maxLength={255}
            required
            disabled={!form.postal_code || form.postal_code.length !== 5}
          />
        )}
      </div>
      <div className="client-manager__form-row">
        <div className="client-manager__form-group">
          <label htmlFor="addr_municipality">Alcaldía / municipio</label>
          <input
            id="addr_municipality"
            name="municipality"
            value={form.municipality}
            onChange={onAddressChange}
            maxLength={255}
            readOnly={fromSepomex}
            className={fromSepomex ? 'client-manager__input-readonly' : undefined}
            placeholder="Municipio"
          />
        </div>
        <div className="client-manager__form-group">
          <label htmlFor="addr_state">Estado</label>
          <input
            id="addr_state"
            name="state"
            value={form.state}
            onChange={onAddressChange}
            maxLength={255}
            readOnly={fromSepomex}
            className={fromSepomex ? 'client-manager__input-readonly' : undefined}
            placeholder="Estado"
          />
        </div>
      </div>
      <div className="client-manager__form-group">
        <label htmlFor="addr_country">País</label>
        <input
          id="addr_country"
          name="country"
          value={form.country}
          onChange={onAddressChange}
          maxLength={255}
          readOnly={fromSepomex}
          className={fromSepomex ? 'client-manager__input-readonly' : undefined}
        />
      </div>
      <div className="client-manager__form-group">
        <label htmlFor="addr_additional_info">Referencias / piso / entre calles</label>
        <textarea
          id="addr_additional_info"
          name="additional_info"
          value={form.additional_info}
          onChange={onAddressChange}
          rows={2}
          maxLength={1000}
          className="client-manager__textarea"
        />
      </div>
      <label className="client-manager__checkbox-row">
        <input type="checkbox" name="is_default" checked={form.is_default} onChange={onAddressChange} />
        <span>Marcar como dirección predeterminada</span>
      </label>
    </div>
  );
};

const ClientManager = () => {
  const { user } = useUserStore();
  const isOperator = user?.role?.name === 'operador';
  const [clients, setClients] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAccountStatementModal, setShowAccountStatementModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [addressForm, setAddressForm] = useState(() => emptyAddressForm(null, true));
  const [postalSettlements, setPostalSettlements] = useState([]);
  const [loadingPostal, setLoadingPostal] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    email: '',
    phone: '',
    password: '',
    role_id: '2' // Default to client role (ID: 2)
  });
  /** Descuentos informativos desde la API externa (solo al editar). */
  const [externalApiDiscounts, setExternalApiDiscounts] = useState({
    loading: false,
    descuento1: '',
    descuento2: '',
  });

  // Fetch clients on component mount
  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (!editingClient) {
      setAddressForm(emptyAddressForm(null, true));
      setPostalSettlements([]);
      setLoadingPostal(false);
      return;
    }
    const addrList = editingClient.addresses || [];
    const defaultAddr =
      addrList.find((a) => a.is_default) ?? (addrList.length ? addrList[0] : null);
    setAddressForm(emptyAddressForm(defaultAddr, !defaultAddr));
    const cp = String(defaultAddr?.postal_code || '')
      .replace(/\D/g, '')
      .slice(0, 5);
    if (cp.length === 5) {
      setLoadingPostal(true);
      (async () => {
        try {
          const result = await fetchSepomexPostalCode(cp);
          if (result.ok) {
            setPostalSettlements(result.settlements);
            setAddressForm((prev) => {
              const c = (prev.colonia || prev.city || '').trim();
              const pick = result.settlements.includes(c) ? c : result.firstSettlement;
              return {
                ...prev,
                postal_code: cp,
                state: result.state,
                municipality: result.municipality,
                city: pick,
                colonia: pick,
              };
            });
          } else {
            setPostalSettlements([]);
          }
        } catch {
          setPostalSettlements([]);
        } finally {
          setLoadingPostal(false);
        }
      })();
    } else {
      setPostalSettlements([]);
    }
  }, [editingClient]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/admin/clients', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener clientes');
      }
      
      const data = await response.json();
      setClients(data.users);
      setAllClients(data.users);
      return data.users;
    } catch (err) {
      setError(err.message);
      window.showToast('Error al cargar clientes: ' + err.message, 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Limitar teléfono a 10 dígitos numéricos
    if (name === 'phone') {
      const numericValue = value.replace(/[^0-9]/g, '').slice(0, 10);
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddressChange = (e) => {
    const { name, value, type, checked, tagName } = e.target;

    if (name === 'is_default' && type === 'checkbox') {
      setAddressForm((prev) => ({ ...prev, is_default: checked }));
      return;
    }

    if (name === 'settlement_picker' && tagName === 'SELECT') {
      setAddressForm((prev) => ({ ...prev, colonia: value, city: value }));
      return;
    }

    if (name === 'colonia' && tagName === 'INPUT') {
      setAddressForm((prev) => ({ ...prev, colonia: value, city: value }));
      return;
    }

    if (name === 'street_number_ext' || name === 'street_number_int') {
      const nums = sanitizeStreetNumberDigits(value);
      setAddressForm((prev) => ({ ...prev, [name]: nums }));
      return;
    }

    if (name === 'postal_code') {
      const digits = value.replace(/\D/g, '').slice(0, 5);
      if (digits.length < 5) {
        setPostalSettlements([]);
        setAddressForm((prev) => ({
          ...prev,
          postal_code: digits,
          state: '',
          municipality: '',
          city: '',
          colonia: '',
        }));
        return;
      }
      setAddressForm((prev) => ({ ...prev, postal_code: digits }));
      setLoadingPostal(true);
      (async () => {
        try {
          const result = await fetchSepomexPostalCode(digits);
          if (result.ok) {
            setPostalSettlements(result.settlements);
            setAddressForm((prev) => ({
              ...prev,
              state: result.state,
              municipality: result.municipality,
              city: result.firstSettlement,
              colonia: result.firstSettlement,
            }));
          } else {
            setPostalSettlements([]);
            if (window.showToast) {
              window.showToast('Código postal no encontrado', 'warning');
            }
            setAddressForm((prev) => ({
              ...prev,
              state: '',
              municipality: '',
              city: '',
              colonia: '',
            }));
          }
        } catch {
          setPostalSettlements([]);
          if (window.showToast) {
            window.showToast('Error al consultar el código postal', 'error');
          }
        } finally {
          setLoadingPostal(false);
        }
      })();
      return;
    }

    if (
      (name === 'municipality' || name === 'state' || name === 'country') &&
      postalSettlements.length > 0
    ) {
      return;
    }

    setAddressForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      middle_name: '',
      email: '',
      phone: '',
      password: '',
      role_id: '2' // Default to client role (ID: 2)
    });
    setEditingClient(null);
    setShowForm(false);
    setAddressForm(emptyAddressForm(null, true));
    setPostalSettlements([]);
    setLoadingPostal(false);
    setExternalApiDiscounts({ loading: false, descuento1: '', descuento2: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = editingClient
        ? `/api/admin/clients/${editingClient.id}`
        : '/api/admin/clients';

      const payload = { ...formData };
      if (editingClient) {
        payload.default_address = {
          street_address: addressForm.street_address,
          street_number_ext: addressForm.street_number_ext || null,
          street_number_int: addressForm.street_number_int || null,
          city: addressForm.city,
          municipality: addressForm.municipality || null,
          colonia: addressForm.colonia || null,
          state: addressForm.state || null,
          postal_code: addressForm.postal_code || null,
          country: addressForm.country || 'México',
          additional_info: addressForm.additional_info || null,
          is_default: Boolean(addressForm.is_default),
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          const errorMessages = Object.values(data.errors).flat().join(', ');
          window.showToast(errorMessages, 'error');
        } else {
          window.showToast(data.message || 'Error en la operación', 'error');
        }
        return;
      }

      await fetchClients();
      resetForm();
      setSearchTerm('');

      window.showToast(
        editingClient ? 'Cliente actualizado exitosamente' : 'Cliente registrado exitosamente',
        'success',
        4000
      );
    } catch (err) {
      window.showToast('Error: ' + err.message, 'error');
    }
  };

  const handleEdit = async (client) => {
    setExternalApiDiscounts({ loading: true, descuento1: '', descuento2: '' });
    setEditingClient({ ...client, addresses: client.addresses || [] });
    setFormData({
      first_name: client.first_name,
      last_name: client.last_name,
      middle_name: client.middle_name,
      email: client.email,
      phone: client.phone || '',
      password: '',
      role_id: client.role_id
    });
    setShowForm(true);
    const token = localStorage.getItem('token');
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(`/api/admin/clients/${client.id}`, { headers });
      const data = await response.json();
      if (response.ok && data.success && data.user) {
        setEditingClient(data.user);
      }
    } catch {
      /* mantener datos del listado */
    }

    try {
      const discRes = await fetch(
        `/api/admin/clients/${client.id}/external-discounts`,
        { headers }
      );
      const discData = await discRes.json();
      if (discRes.ok && discData.success) {
        const d1 = discData.descuento1;
        const d2 = discData.descuento2;
        setExternalApiDiscounts({
          loading: false,
          descuento1: d1 != null && String(d1) !== '' ? String(d1) : '—',
          descuento2: d2 != null && String(d2) !== '' ? String(d2) : '—',
        });
      } else {
        setExternalApiDiscounts({
          loading: false,
          descuento1: '—',
          descuento2: '—',
        });
      }
    } catch {
      setExternalApiDiscounts({
        loading: false,
        descuento1: '—',
        descuento2: '—',
      });
    }
  };

  // Filtrar clientes según el término de búsqueda (nombre, email, teléfono, id numérico, id DM00004)
  useEffect(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      setClients(allClients);
      return;
    }

    const qCompact = q.replace(/\s+/g, '');

    const filtered = allClients.filter((client) => {
      const fullName = `${client.first_name} ${client.last_name} ${client.middle_name || ''}`.toLowerCase();
      const email = (client.email || '').toLowerCase();
      const phone = (client.phone || '').toLowerCase();
      const externalId = formatExternalClienteId(client.id).toLowerCase();
      const idStr = String(client.id);

      return (
        fullName.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        externalId.includes(q) ||
        externalId.includes(qCompact) ||
        idStr.includes(q) ||
        idStr.includes(qCompact)
      );
    });

    setClients(filtered);
  }, [searchTerm, allClients]);

  const handleViewAccountStatement = (clientId) => {
    setSelectedClientId(clientId);
    setShowAccountStatementModal(true);
  };

  const categoryLabels = { oro: 'Oro', bronce: 'Bronce', diamante: 'Diamante' };

  const handleCategoryChangeWithConfirm = (clientId, newCategory, currentCategory) => {
    if (newCategory === currentCategory) return;
    const categoryName = categoryLabels[newCategory] || newCategory;
    Swal.fire({
      title: '¿Confirmar cambio de categoría?',
      text: `El usuario pasará a la categoría ${categoryName}. Esto afectará sus reglas de descuento en el carrito automáticamente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#EA2630',
      cancelButtonColor: '#6c757d',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        handleUpdateCategory(clientId, newCategory);
      } else {
        setClients(prev => [...prev]);
      }
    });
  };

  const handleUpdateCategory = async (clientId, newCategory) => {
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/seller-category`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ seller_category: newCategory })
      });

      const data = await response.json();

      if (!response.ok) {
        window.showToast(data.message || 'Error al actualizar categoría', 'error');
        return;
      }

      await fetchClients();
      window.showToast('Categoría actualizada correctamente', 'success');
    } catch (err) {
      window.showToast('Error: ' + err.message, 'error');
    }
  };

  const handleDelete = async (clientId) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer. El cliente será eliminado permanentemente.',
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
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        window.showToast(data.message || 'Error al eliminar cliente', 'error');
        return;
      }
      
      await fetchClients();
      window.showToast('Cliente eliminado exitosamente', 'success', 4000);
    } catch (err) {
      window.showToast('Error: ' + err.message, 'error');
    }
  };

  if (loading) {
    return <div className="client-manager__loading">Cargando clientes...</div>;
  }

  if (error) {
    return <div className="client-manager__error">Error: {error}</div>;
  }

  return (
    <div className="client-manager">
      <div className="client-manager__header">
        <h2>Gestión de Clientes</h2>
        <CherryButton 
          onClick={() => {
            setEditingClient(null);
            setExternalApiDiscounts({ loading: false, descuento1: '', descuento2: '' });
            setFormData({
              first_name: '',
              last_name: '',
              middle_name: '',
              email: '',
              phone: '',
              password: '',
              role_id: '2',
            });
            setShowForm(true);
          }}
          variant="red"
          size="medium"
        >
          Agregar Cliente
        </CherryButton>
      </div>

      {/* Client Form */}
      {showForm && (
        <div className="client-manager__form-overlay">
          <div
            className={`client-manager__form${editingClient ? ' client-manager__form--with-addresses' : ''}`}
          >
            <div className="client-manager__form-header">
              <h3>{editingClient ? 'Editar Cliente' : 'Crear Nuevo Cliente'}</h3>
              <button 
                className="client-manager__form-close"
                onClick={resetForm}
              >
                ✕
              </button>
            </div>
            
            <form
              id="client-manager-client-form"
              onSubmit={handleSubmit}
              className="client-manager__form-content"
            >
              <div className="client-manager__form-row">
                <div className="client-manager__form-group">
                  <label htmlFor="first_name">
                    Nombre <ReqStar />
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="client-manager__form-group">
                  <label htmlFor="middle_name">Segundo Nombre</label>
                  <input
                    type="text"
                    id="middle_name"
                    name="middle_name"
                    value={formData.middle_name}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="client-manager__form-group">
                <label htmlFor="last_name">
                  Apellido <ReqStar />
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="client-manager__form-row">
                <div className="client-manager__form-group">
                  <label htmlFor="email">
                    Email <ReqStar />
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="client-manager__form-group">
                  <label htmlFor="phone">
                    Teléfono <ReqStar />
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    required
                    pattern="[0-9]{10}"
                    maxLength="10"
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/[^0-9]/g, '');
                      if (e.target.value.length > 10) {
                        e.target.value = e.target.value.slice(0, 10);
                      }
                      handleInputChange({ target: { name: 'phone', value: e.target.value } });
                    }}
                  />
                </div>
              </div>
              
              <div className="client-manager__form-row">
                <div className="client-manager__form-group">
                  <label htmlFor="password">
                    {editingClient ? (
                      'Nueva Contraseña (dejar vacío para mantener)'
                    ) : (
                      <>
                        Contraseña <ReqStar />
                      </>
                    )}
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingClient}
                    minLength="8"
                  />
                  {!editingClient && (
                    <p className="client-manager__password-hint">
                      Tu contraseña debe tener mínimo 8 caracteres y al menos una letra y un número
                    </p>
                  )}
                </div>
              </div>

              {editingClient && (
                <div className="client-manager__external-api-discounts" aria-live="polite">
                  <div className="client-manager__form-row">
                    <div className="client-manager__form-group">
                      <label htmlFor="external_descuento1">descuento1</label>
                      <input
                        id="external_descuento1"
                        type="text"
                        readOnly
                        tabIndex={-1}
                        value={externalApiDiscounts.loading ? 'Consultando…' : externalApiDiscounts.descuento1}
                        className="client-manager__input-readonly"
                      />
                    </div>
                    <div className="client-manager__form-group">
                      <label htmlFor="external_descuento2">descuento2</label>
                      <input
                        id="external_descuento2"
                        type="text"
                        readOnly
                        tabIndex={-1}
                        value={externalApiDiscounts.loading ? 'Consultando…' : externalApiDiscounts.descuento2}
                        className="client-manager__input-readonly"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editingClient && (
                <AdminClientAddressFields
                  form={addressForm}
                  onAddressChange={handleAddressChange}
                  settlements={postalSettlements}
                  loadingPostal={loadingPostal}
                />
              )}

              <div className="client-manager__form-actions client-manager__form-actions--modal-footer">
                <CherryButton type="submit" variant="red" size="medium">
                  {editingClient ? 'Actualizar' : 'Crear'}
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

      {/* Search Bar */}
      <div className="client-manager__search">
        <div className="client-manager__search-group">
          <label htmlFor="client-search">Buscar Cliente:</label>
          <input
            id="client-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, email, teléfono o ID (ej. DM00004)..."
            className="client-manager__search-input"
          />
        </div>
      </div>

      {/* Clients List */}
      <div className="client-manager__list">
        <div className="client-manager__list-header">
          <h3>Clientes ({clients.length})</h3>
        </div>
        
        {clients.length === 0 ? (
          <div className="client-manager__empty">
            No hay clientes registrados
          </div>
        ) : (
          <div className="admin-orders__table-container">
            <div className="table-scroll-wrapper">
              <table className="admin-orders__table client-manager__data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Categoría</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => {
                    const cat = client.seller_category || 'bronce';
                    const creditBal = parseFloat(client.credit_balance || 0);
                    const creditLim = parseFloat(client.credit_limit || 0);
                    const creditOrLimitNonZero =
                      Math.round(creditBal * 100) !== 0 ||
                      Math.round(creditLim * 100) !== 0;
                    const showCreditBlock =
                      ['oro', 'diamante'].includes(cat) && creditOrLimitNonZero;
                    return (
                      <tr key={client.id}>
                        <td className="client-manager__id-cell">
                          <span
                            className="client-manager__external-client-id"
                            title="ID cliente (API / ventas)"
                          >
                            {formatExternalClienteId(client.id)}
                          </span>
                        </td>
                        <td className="order-customer-cell client-manager__name-cell">
                          {formatClientDisplayName(client) || '—'}
                        </td>
                        <td className="client-manager__email-cell" title={client.email || ''}>
                          {client.email || '—'}
                        </td>
                        <td className="client-manager__category-cell">
                          {!isOperator ? (
                            <select
                              className={`client-manager__category-select client-manager__category-select--${cat}`}
                              value={cat}
                              onChange={(e) =>
                                handleCategoryChangeWithConfirm(
                                  client.id,
                                  e.target.value,
                                  client.seller_category || 'bronce'
                                )
                              }
                              aria-label="Categoría del cliente"
                            >
                              <option value="bronce">Bronce</option>
                              <option value="oro">Oro</option>
                              <option value="diamante">Diamante</option>
                            </select>
                          ) : (
                            <span
                              className={`client-manager__category-badge client-manager__category-badge--${cat}`}
                            >
                              {cat === 'diamante' ? 'Diamante' : cat === 'oro' ? 'Oro' : 'Bronce'}
                            </span>
                          )}
                          {showCreditBlock && (
                            <div className="client-manager__credit-inline">
                              <span>{`Crédito: $${creditBal.toFixed(2)}`}</span>
                              <span className="client-manager__credit-inline-limit">
                                {`Límite: $${creditLim.toFixed(2)}`}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="order-actions-cell">
                          <div className="client-manager__table-actions">
                            <button
                              type="button"
                              className="order-action-btn order-action-btn--detail client-manager__table-icon-btn"
                              onClick={() => handleViewAccountStatement(client.id)}
                              data-tooltip="Estados de cuenta"
                              aria-label="Estados de cuenta"
                              onMouseEnter={showClientActionTooltip}
                              onMouseLeave={hideClientActionTooltip}
                            >
                              📊
                            </button>
                            <button
                              type="button"
                              className="order-action-btn client-manager__table-icon-btn client-manager__table-icon-btn--edit"
                              onClick={() => handleEdit(client)}
                              data-tooltip="Editar"
                              aria-label="Editar"
                              onMouseEnter={showClientActionTooltip}
                              onMouseLeave={hideClientActionTooltip}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="order-action-btn client-manager__table-icon-btn client-manager__table-icon-btn--delete"
                              onClick={() => handleDelete(client.id)}
                              data-tooltip="Eliminar"
                              aria-label="Eliminar"
                              onMouseEnter={showClientActionTooltip}
                              onMouseLeave={hideClientActionTooltip}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Estados de Cuenta */}
      {showAccountStatementModal && (
        <AccountStatementModal
          isOpen={showAccountStatementModal}
          onClose={() => {
            setShowAccountStatementModal(false);
            setSelectedClientId(null);
          }}
          userId={selectedClientId}
        />
      )}
    </div>
  );
};

export default ClientManager; 
