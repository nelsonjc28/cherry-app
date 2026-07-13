import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import CherryButton from '../CherryButton/CherryButton';
import './OperatorManager.css';

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

const OperatorManager = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    email: '',
    phone: '',
    password: ''
  });

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/operators', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener operadores');
      }
      
      const data = await response.json();
      // Filter only operator users
      const operatorUsers = data.users.filter(user => user.role?.name === 'operador');
      setAllUsers(operatorUsers);
      setAllUsers(operatorUsers);
      setUsers(operatorUsers);
    } catch (err) {
      setError(err.message);
      window.showToast('Error al cargar operadores: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar operadores según el término de búsqueda (nombre, email, teléfono, id)
  useEffect(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      setUsers(allUsers);
      return;
    }
    const filtered = allUsers.filter((user) => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''} ${user.middle_name || ''}`.toLowerCase();
      const email = (user.email || '').toLowerCase();
      const phone = (user.phone || '').toLowerCase();
      const idStr = String(user.id);
      return fullName.includes(q) || email.includes(q) || phone.includes(q) || idStr.includes(q);
    });
    setUsers(filtered);
  }, [searchTerm, allUsers]);

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

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      middle_name: '',
      email: '',
      phone: '',
      password: ''
    });
    setEditingUser(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingUser 
        ? `/api/admin/operators/${editingUser.id}`
        : '/api/admin/operators';
      
      const method = 'POST';
      
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
      
      // Refresh users list
      await fetchUsers();
      resetForm();
      
      window.showToast(
        editingUser ? 'Operador actualizado exitosamente' : 'Operador registrado exitosamente',
        'success',
        4000
      );
    } catch (err) {
      window.showToast('Error: ' + err.message, 'error');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      middle_name: user.middle_name,
      email: user.email,
      phone: user.phone || '',
      password: ''
    });
    setShowForm(true);
  };

  const handleDelete = async (userId) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer. El operador será eliminado permanentemente.',
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
      const response = await fetch(`/api/admin/operators/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        window.showToast(data.message || 'Error al eliminar operador', 'error');
        return;
      }
      
      await fetchUsers();
      window.showToast('Operador eliminado exitosamente', 'success', 4000);
    } catch (err) {
      window.showToast('Error: ' + err.message, 'error');
    }
  };

  if (loading) {
    return <div className="operator-manager__loading">Cargando operadores...</div>;
  }

  if (error) {
    return <div className="operator-manager__error">Error: {error}</div>;
  }

  return (
    <div className="operator-manager">
      <div className="operator-manager__header">
        <h2>Gestión de Operadores</h2>
        <CherryButton 
          onClick={() => setShowForm(true)}
          variant="red"
          size="medium"
        >
          Agregar Operador
        </CherryButton>
      </div>

      {/* User Form */}
      {showForm && (
        <div className="operator-manager__form-overlay">
          <div className="operator-manager__form">
            <div className="operator-manager__form-header">
              <h3>{editingUser ? 'Editar Operador' : 'Crear Nuevo Operador'}</h3>
              <button 
                className="operator-manager__form-close"
                onClick={resetForm}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="operator-manager__form-content">
              <div className="operator-manager__form-row">
                <div className="operator-manager__form-group">
                  <label htmlFor="first_name">Nombre *</label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="operator-manager__form-group">
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
              
              <div className="operator-manager__form-group">
                <label htmlFor="last_name">Apellido *</label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="operator-manager__form-row">
                <div className="operator-manager__form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="operator-manager__form-group">
                  <label htmlFor="phone">Teléfono *</label>
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
                      handleInputChange(e);
                    }}
                  />
                </div>
              </div>
              
              <div className="operator-manager__form-row">
                <div className="operator-manager__form-group">
                  <label htmlFor="password">
                    {editingUser ? 'Nueva Contraseña (dejar vacío para mantener)' : 'Contraseña *'}
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingUser}
                    minLength="8"
                  />
                  {!editingUser && (
                    <p className="operator-manager__password-hint">
                      Tu contraseña debe tener mínimo 8 caracteres y al menos una letra y un número
                    </p>
                  )}
                </div>
              </div>
              
              <div className="operator-manager__form-actions">
                <CherryButton 
                  type="submit"
                  variant="red"
                  size="medium"
                >
                  {editingUser ? 'Actualizar' : 'Crear'}
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

      {/* Users List */}
      <div className="operator-manager__list">
        <div className="operator-manager__list-header">
          <h3>Operadores ({users.length})</h3>
        </div>

        {/* Search Bar */}
        <div className="operator-manager__search">
          <div className="operator-manager__search-group">
            <label htmlFor="operator-search">Buscar Operador:</label>
            <input
              id="operator-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, email, teléfono o ID..."
              className="operator-manager__search-input"
            />
          </div>
        </div>

        {users.length === 0 ? (
          <div className="operator-manager__empty">
            No hay operadores registrados
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
                    <th className="client-manager__actions-header">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="client-manager__id-cell">#{user.id}</td>
                      <td className="order-customer-cell client-manager__name-cell">
                        {user.first_name} {user.last_name}
                      </td>
                      <td className="client-manager__email-cell" title={user.email || ''}>
                        {user.email || '—'}
                      </td>
                      <td className="client-manager__email-cell">{user.phone || '—'}</td>
                      <td>
                        <span className="vendor-category-badge vendor-category-badge--none">
                          Operador
                        </span>
                      </td>
                      <td className="client-manager__actions-cell">
                        <div className="client-manager__actions-grid">
                          <div className="client-manager__actions-grid-col">
                            <button
                              type="button"
                              className="order-action-btn client-manager__table-icon-btn client-manager__table-icon-btn--edit"
                              onClick={() => handleEdit(user)}
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
                              onClick={() => handleDelete(user.id)}
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
    </div>
  );
};

export default OperatorManager;
