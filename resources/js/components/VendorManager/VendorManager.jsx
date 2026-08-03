import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import CherryButton from '../CherryButton/CherryButton';
import {
  listVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  toggleVendorCategoryPermission,
} from '../../api/adminVendors';
import VendorBuyersManager from './VendorBuyersManager';
import './VendorManager.css';

// Helpers de tooltip (mismo patrón que ClientManager)
const showActionTooltip = (e) => {
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
  tooltip.style.left = `${rect.left + rect.width / 2}px`;
  tooltip.style.top = `${rect.top - 10}px`;
  tooltip.style.transform = 'translate(-50%, -100%)';
  const tooltipRect = tooltip.getBoundingClientRect();
  tooltip.style.top = `${rect.top - tooltipRect.height - 10}px`;
};
const hideActionTooltip = () => {
  const tooltip = document.querySelector('.client-tooltip');
  if (tooltip) tooltip.style.display = 'none';
};

const emptyForm = {
  first_name: '',
  last_name: '',
  middle_name: '',
  email: '',
  phone: '',
  idvendedor: '',
  password: '',
};

const VendorManager = () => {
  const [allVendors, setAllVendors] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [managingBuyersFor, setManagingBuyersFor] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchVendors();
  }, []);

  // Filtrar vendedores según el término de búsqueda (nombre, email, teléfono, id)
  useEffect(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      setVendors(allVendors);
      return;
    }
    const filtered = allVendors.filter((v) => {
      const fullName = `${v.first_name || ''} ${v.last_name || ''} ${v.middle_name || ''}`.toLowerCase();
      const email = (v.email || '').toLowerCase();
      const phone = (v.phone || '').toLowerCase();
      const idStr = String(v.id);
      return fullName.includes(q) || email.includes(q) || phone.includes(q) || idStr.includes(q);
    });
    setVendors(filtered);
  }, [searchTerm, allVendors]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const data = await listVendors();
      setAllVendors(data.users || []);
      setVendors(data.users || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      if (window.showToast) {
        window.showToast('Error al cargar vendedores: ' + err.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const numericValue = value.replace(/[^0-9]/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingVendor(null);
    setShowForm(false);
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      first_name: vendor.first_name || '',
      last_name: vendor.last_name || '',
      middle_name: vendor.middle_name || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      idvendedor: vendor.idvendedor || '',
      password: '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones mínimas en frontend
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      Swal.fire('Datos incompletos', 'Nombre y apellido son obligatorios.', 'warning');
      return;
    }
    if (!editingVendor && !formData.password) {
      Swal.fire('Datos incompletos', 'La contraseña es obligatoria para nuevos vendedores.', 'warning');
      return;
    }
    if (formData.password && formData.password.length < 8) {
      Swal.fire('Contraseña débil', 'La contraseña debe tener mínimo 8 caracteres.', 'warning');
      return;
    }

    try {
      const payload = { ...formData };
      // Si editamos y no se escribió password, no enviarlo
      if (editingVendor && !formData.password) {
        delete payload.password;
      }

      if (editingVendor) {
        await updateVendor(editingVendor.id, payload);
      } else {
        await createVendor(payload);
      }

      if (window.showToast) {
        window.showToast(
          editingVendor ? 'Vendedor actualizado exitosamente' : 'Vendedor registrado exitosamente',
          'success',
          4000,
        );
      }
      resetForm();
      await fetchVendors();
    } catch (err) {
      const message = err.errors
        ? Object.values(err.errors).flat().join('\n')
        : err.message;
      Swal.fire('Error', message, 'error');
    }
  };

  const handleToggleCategoryPermission = async (vendor) => {
    const newValue = !vendor.can_change_category;
    const result = await Swal.fire({
      title: '¿Confirmar cambio de permiso?',
      html: `Vas a ${newValue ? 'otorgar' : 'revocar'} a <strong>${vendor.first_name} ${vendor.last_name}</strong> el permiso para cambiar las categorías de sus clientes.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: newValue ? '#1DA534' : '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: newValue ? 'Sí, otorgar permiso' : 'Sí, revocar permiso',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await toggleVendorCategoryPermission(vendor.id, newValue);
      if (window.showToast) {
        window.showToast(
          newValue
            ? `Permiso otorgado a ${vendor.first_name} ${vendor.last_name}`
            : `Permiso revocado a ${vendor.first_name} ${vendor.last_name}`,
          'success',
          4000,
        );
      }
      await fetchVendors();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const handleDelete = async (vendor) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      html: `Vas a eliminar al vendedor <strong>${vendor.first_name} ${vendor.last_name}</strong>.<br/>Esta acción no se puede deshacer y eliminará también las asociaciones con sus compradores.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    try {
      await deleteVendor(vendor.id);
      if (window.showToast) {
        window.showToast('Vendedor eliminado exitosamente', 'success', 4000);
      }
      await fetchVendors();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  if (loading) {
    return <div className="vendor-manager__loading">Cargando vendedores...</div>;
  }

  if (error) {
    return <div className="vendor-manager__error">Error: {error}</div>;
  }

  return (
    <div className="vendor-manager">
      <div className="vendor-manager__header">
        <h2>Gestión de Vendedores</h2>
        <CherryButton
          onClick={() => setShowForm(true)}
          variant="red"
          size="medium"
        >
          Agregar Vendedor
        </CherryButton>
      </div>

      {showForm && (
        <div className="vendor-manager__form-overlay">
          <div className="vendor-manager__form">
            <div className="vendor-manager__form-header">
              <h3>{editingVendor ? 'Editar Vendedor' : 'Crear Nuevo Vendedor'}</h3>
              <button
                type="button"
                className="vendor-manager__form-close"
                onClick={resetForm}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="vendor-manager__form-content">
              <div className="vendor-manager__form-row">
                <div className="vendor-manager__form-group">
                  <label htmlFor="first_name">Nombre *</label>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="vendor-manager__form-group">
                  <label htmlFor="middle_name">Segundo Nombre</label>
                  <input
                    id="middle_name"
                    name="middle_name"
                    type="text"
                    value={formData.middle_name}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="vendor-manager__form-group">
                <label htmlFor="last_name">Apellido *</label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="vendor-manager__form-row">
                <div className="vendor-manager__form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="vendor-manager__form-group">
                  <label htmlFor="phone">Teléfono *</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    pattern="[0-9]{10}"
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              <div className="vendor-manager__form-row">
                <div className="vendor-manager__form-group">
                  <label htmlFor="idvendedor">ID Vendedor (externo) *</label>
                  <input
                    id="idvendedor"
                    name="idvendedor"
                    type="text"
                    value={formData.idvendedor}
                    onChange={handleInputChange}
                    required
                    maxLength={64}
                    placeholder="Ej. 111, VEN-001"
                    autoComplete="off"
                  />
                  <p className="vendor-manager__field-hint">
                    ID único del vendedor en el sistema.
                  </p>
                </div>
              </div>

              <div className="vendor-manager__form-row">
                <div className="vendor-manager__form-group">
                  <label htmlFor="password">
                    {editingVendor
                      ? 'Nueva Contraseña (dejar vacío para mantener)'
                      : 'Contraseña *'}
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    minLength={editingVendor ? 0 : 8}
                  />
                  {!editingVendor && (
                    <p className="vendor-manager__password-hint">
                      Mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número.
                    </p>
                  )}
                </div>
              </div>

              <div className="vendor-manager__form-actions">
                <CherryButton type="submit" variant="red" size="medium">
                  {editingVendor ? 'Guardar Cambios' : 'Crear Vendedor'}
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

      <div className="vendor-manager__list">
        <div className="vendor-manager__list-header">
          <h3>Vendedores ({vendors.length})</h3>
        </div>

        {/* Search Bar */}
        <div className="vendor-manager__search">
          <div className="vendor-manager__search-group">
            <label htmlFor="vendor-search">Buscar Vendedor:</label>
            <input
              id="vendor-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, email, teléfono o ID..."
              className="vendor-manager__search-input"
            />
          </div>
        </div>

        {vendors.length === 0 ? (
          <div className="vendor-manager__empty">
            No hay vendedores registrados. Crea uno para empezar.
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
                    <th>Teléfono</th>
                    <th>Rol</th>
                    <th>ID Vendedor</th>
                    <th>Compradores</th>
                    <th>Cambiar Categoría</th>
                    <th className="client-manager__actions-header">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor) => (
                    <tr key={vendor.id}>
                      <td className="client-manager__id-cell">#{vendor.id}</td>
                      <td className="order-customer-cell client-manager__name-cell">
                        {vendor.first_name} {vendor.last_name}
                      </td>
                      <td className="client-manager__email-cell" title={vendor.email || ''}>
                        {vendor.email || '—'}
                      </td>
                      <td className="client-manager__email-cell">{vendor.phone || '—'}</td>
                      <td>
                        <span className="vendor-category-badge vendor-category-badge--none">
                          Vendedor
                        </span>
                      </td>
                      <td className="client-manager__email-cell">
                        {vendor.idvendedor ? (
                          <code className="vendor-idvendedor-cell">{vendor.idvendedor}</code>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <span className="vendor-orders__buyer">
                          <strong>{vendor.active_buyers_count ?? 0}</strong>
                        </span>
                      </td>
                      <td className="vendor-manager__permission-cell">
                        <button
                          type="button"
                          className={`vendor-manager__permission-btn vendor-manager__permission-btn--${vendor.can_change_category ? 'granted' : 'denied'}`}
                          onClick={() => handleToggleCategoryPermission(vendor)}
                          data-tooltip={
                            vendor.can_change_category
                              ? 'Tiene permiso para cambiar categorías. Haz clic para revocar.'
                              : 'Sin permiso para cambiar categorías. Haz clic para otorgar.'
                          }
                          aria-label={
                            vendor.can_change_category
                              ? 'Revocar permiso de cambio de categoría'
                              : 'Otorgar permiso de cambio de categoría'
                          }
                          onMouseEnter={showActionTooltip}
                          onMouseLeave={hideActionTooltip}
                        >
                          {vendor.can_change_category ? '🔓 Con permiso' : '🔒 Sin permiso'}
                        </button>
                      </td>
                      <td className="client-manager__actions-cell">
                        <div className="client-manager__actions-grid">
                          <div className="client-manager__actions-grid-col">
                            <button
                              type="button"
                              className="order-action-btn order-action-btn--detail client-manager__table-icon-btn"
                              onClick={() => setManagingBuyersFor(vendor)}
                              data-tooltip="Compradores"
                              aria-label="Compradores"
                              onMouseEnter={showActionTooltip}
                              onMouseLeave={hideActionTooltip}
                            >
                              👥
                            </button>
                          </div>
                          <div className="client-manager__actions-grid-col">
                            <button
                              type="button"
                              className="order-action-btn client-manager__table-icon-btn client-manager__table-icon-btn--edit"
                              onClick={() => handleEdit(vendor)}
                              data-tooltip="Editar"
                              aria-label="Editar"
                              onMouseEnter={showActionTooltip}
                              onMouseLeave={hideActionTooltip}
                            >
                              ✏️
                            </button>
                          </div>
                          <div className="client-manager__actions-grid-col">
                            <button
                              type="button"
                              className="order-action-btn client-manager__table-icon-btn client-manager__table-icon-btn--delete"
                              onClick={() => handleDelete(vendor)}
                              data-tooltip="Eliminar"
                              aria-label="Eliminar"
                              onMouseEnter={showActionTooltip}
                              onMouseLeave={hideActionTooltip}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {managingBuyersFor && (
        <VendorBuyersManager
          vendor={managingBuyersFor}
          onClose={() => setManagingBuyersFor(null)}
          onChanged={fetchVendors}
        />
      )}
    </div>
  );
};

export default VendorManager;