import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import CherryButton from '../CherryButton/CherryButton';
import AccountStatementModal from '../AccountStatementModal/AccountStatementModal';
import { getIconPath } from '../../utils/assetPaths';
import useUserStore from '../../store/userStore';
import './ClientManager.css';

// Función helper para formatear ID de cliente: DM + 5 dígitos (con ceros a la izquierda)
const formatClientId = (clientId) => {
  if (!clientId) return '';
  return 'DM' + String(clientId).padStart(5, '0');
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
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    email: '',
    phone: '',
    password: '',
    role_id: '2' // Default to client role (ID: 2)
  });

  // Fetch clients on component mount
  useEffect(() => {
    fetchClients();
  }, []);

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
    } catch (err) {
      setError(err.message);
      window.showToast('Error al cargar clientes: ' + err.message, 'error');
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingClient 
        ? `/api/admin/clients/${editingClient.id}`
        : '/api/admin/clients';
      
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
      
      // Refresh clients list
      await fetchClients();
      resetForm();
      setSearchTerm(''); // Limpiar búsqueda después de crear/editar
      
      window.showToast(
        editingClient ? 'Cliente actualizado exitosamente' : 'Cliente registrado exitosamente',
        'success',
        4000
      );
    } catch (err) {
      window.showToast('Error: ' + err.message, 'error');
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
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
  };

  // Filtrar clientes según el término de búsqueda
  useEffect(() => {
    if (!searchTerm.trim()) {
      setClients(allClients);
      return;
    }

    const filtered = allClients.filter(client => {
      const searchLower = searchTerm.toLowerCase();
      const fullName = `${client.first_name} ${client.last_name} ${client.middle_name || ''}`.toLowerCase();
      const email = (client.email || '').toLowerCase();
      const phone = (client.phone || '').toLowerCase();
      
      return fullName.includes(searchLower) || 
             email.includes(searchLower) || 
             phone.includes(searchLower);
    });

    setClients(filtered);
  }, [searchTerm, allClients]);

  const handleViewAccountStatement = (clientId) => {
    setSelectedClientId(clientId);
    setShowAccountStatementModal(true);
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
      const categoryLabels = { oro: 'Oro', bronce: 'Bronce', diamante: 'Diamante' };
      window.showToast(`Categoría actualizada a ${categoryLabels[newCategory] || newCategory}`, 'success');
    } catch (err) {
      window.showToast('Error: ' + err.message, 'error');
    }
  };

  const handleUpdateCredit = async (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client || !['oro', 'diamante'].includes(client.seller_category)) {
      window.showToast('Solo los clientes con categoría Oro o Diamante pueden tener crédito', 'warning');
      return;
    }

    // Calcular crédito usado
    const creditLimit = parseFloat(client.credit_limit || 0);
    const creditBalance = parseFloat(client.credit_balance || 0);
    const creditUsed = creditLimit - creditBalance;
    
    const { value: creditAmount } = await Swal.fire({
      title: 'Asignar Crédito',
      text: `Cliente: ${client.first_name} ${client.last_name}`,
      html: `
        <div style="text-align: left;">
          <p><strong>Crédito total asignado:</strong> $${creditLimit.toFixed(2)}</p>
          <p><strong>Crédito disponible:</strong> $${creditBalance.toFixed(2)}</p>
          ${creditUsed > 0 ? `<p><strong>Crédito usado:</strong> $${creditUsed.toFixed(2)}</p>` : ''}
          <p style="color: #666; font-size: 12px; margin-top: 10px;">Ingresa el nuevo crédito total asignado. El crédito disponible se calculará automáticamente restando lo usado.</p>
        </div>
      `,
      input: 'number',
      inputLabel: 'Crédito total asignado',
      inputValue: creditLimit, // Mostrar el límite total, no el disponible
      inputAttributes: {
        min: 0,
        step: 0.01
      },
      showCancelButton: true,
      confirmButtonText: 'Asignar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d32f2f',
      cancelButtonColor: '#6c757d',
      inputValidator: (value) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
          return 'El monto debe ser mayor o igual a 0';
        }
      }
    });

    if (creditAmount === undefined) return;

    try {
      // Actualizar el crédito disponible (el backend también actualizará el límite al mismo valor)
      const creditValue = parseFloat(creditAmount);
      
      const response = await fetch(`/api/admin/clients/${clientId}/credit-balance`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ credit_balance: creditValue })
      });

      const data = await response.json();

      if (!response.ok) {
        window.showToast(data.message || 'Error al actualizar crédito', 'error');
        return;
      }

      await fetchClients();
      window.showToast(`Crédito asignado: $${creditValue.toFixed(2)}`, 'success');
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
          onClick={() => setShowForm(true)}
          variant="red"
          size="medium"
        >
          Agregar Cliente
        </CherryButton>
      </div>

      {/* Client Form */}
      {showForm && (
        <div className="client-manager__form-overlay">
          <div className="client-manager__form">
            <div className="client-manager__form-header">
              <h3>{editingClient ? 'Editar Cliente' : 'Crear Nuevo Cliente'}</h3>
              <button 
                className="client-manager__form-close"
                onClick={resetForm}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="client-manager__form-content">
              <div className="client-manager__form-row">
                <div className="client-manager__form-group">
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
              
              <div className="client-manager__form-row">
                <div className="client-manager__form-group">
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
                <div className="client-manager__form-group">
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
                      handleInputChange({ target: { name: 'phone', value: e.target.value } });
                    }}
                  />
                </div>
              </div>
              
              <div className="client-manager__form-row">
                <div className="client-manager__form-group">
                  <label htmlFor="password">
                    {editingClient ? 'Nueva Contraseña (dejar vacío para mantener)' : 'Contraseña *'}
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
              
              <div className="client-manager__form-actions">
                <CherryButton 
                  type="submit"
                  variant="red"
                  size="medium"
                >
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
            placeholder="Buscar por nombre, email o teléfono..."
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
          <div className="client-manager__clients">
            {clients.map(client => (
              <div key={client.id} className="client-manager__client-card">
                <div className="client-manager__client-info">
                  <div className="client-manager__client-id" style={{
                    fontSize: '12px',
                    color: '#666',
                    marginBottom: '4px',
                    fontWeight: '500'
                  }}>
                    ID: {formatClientId(client.id)}
                  </div>
                  <div className="client-manager__client-name">
                    {client.first_name} {client.last_name}
                  </div>
                  <div className="client-manager__client-email">
                    {client.email}
                  </div>
                  <div className="client-manager__client-role">
                    Cliente
                  </div>
                  {!isOperator ? (
                    <select
                      value={client.seller_category}
                      onChange={(e) => handleUpdateCategory(client.id, e.target.value)}
                      style={{
                        marginTop: '8px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        display: 'inline-block',
                        fontSize: '12px',
                        fontWeight: '600',
                        border: '1px solid',
                        borderColor: client.seller_category === 'diamante' ? '#00BCD4' : client.seller_category === 'oro' ? '#FFD700' : '#CD7F32',
                        backgroundColor: client.seller_category === 'diamante' ? '#00BCD4' : client.seller_category === 'oro' ? '#FFD700' : '#CD7F32',
                        color: '#fff',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <option value="bronce">🥉 Bronce</option>
                      <option value="oro">🥇 Oro</option>
                      <option value="diamante">💎 Diamante</option>
                    </select>
                  ) : (
                    <div className="client-manager__client-category" style={{
                      marginTop: '8px',
                      padding: '3px 4px',
                      borderRadius: '4px',
                      display: 'inline-block',
                      fontSize: '12px',
                      fontWeight: '600',
                      backgroundColor: client.seller_category === 'diamante' ? '#00BCD4' : client.seller_category === 'oro' ? '#FFD700' : '#CD7F32',
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      lineHeight: '1.2'
                    }}>
                      {client.seller_category === 'diamante' ? '💎 Diamante' : client.seller_category === 'oro' ? '🥇 Oro' : '🥉 Bronce'}
                    </div>
                  )}
                  {['oro', 'diamante'].includes(client.seller_category) && (
                    <div style={{ marginTop: '4px' }}>
                      <div className="client-manager__client-credit" style={{
                        fontSize: '12px',
                        color: '#28a745',
                        fontWeight: '600'
                      }}>
                        Crédito: ${parseFloat(client.credit_balance || 0).toFixed(2)}
                      </div>
                      <div className="client-manager__client-credit-limit" style={{
                        fontSize: '11px',
                        color: '#666',
                        marginTop: '2px'
                      }}>
                        Límite: ${parseFloat(client.credit_limit || 0).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="client-manager__client-actions">
                  <button
                    className="client-manager__action-btn client-manager__action-btn--outline"
                    onClick={() => handleViewAccountStatement(client.id)}
                    data-tooltip="Estados de Cuenta"
                    onMouseEnter={(e) => {
                      const button = e.currentTarget;
                      const tooltipText = button.getAttribute('data-tooltip');
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
                    }}
                    onMouseLeave={() => {
                      const tooltip = document.querySelector('.client-tooltip');
                      if (tooltip) tooltip.style.display = 'none';
                    }}
                  >
                    <span className="client-manager__btn-icon">📊</span>
                    <span className="client-manager__btn-text">Estados de Cuenta</span>
                  </button>
                  {!isOperator && ['oro', 'diamante'].includes(client.seller_category) && (
                    <button
                      className="client-manager__action-btn client-manager__action-btn--red"
                      onClick={() => handleUpdateCredit(client.id)}
                      data-tooltip="Asignar Crédito"
                      onMouseEnter={(e) => {
                        const button = e.currentTarget;
                        const tooltipText = button.getAttribute('data-tooltip');
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
                      }}
                      onMouseLeave={() => {
                        const tooltip = document.querySelector('.client-tooltip');
                        if (tooltip) tooltip.style.display = 'none';
                      }}
                    >
                      <span className="client-manager__btn-icon">💰</span>
                      <span className="client-manager__btn-text">Asignar Crédito</span>
                    </button>
                  )}
                  <button
                    className="client-manager__action-btn client-manager__action-btn--outline"
                    onClick={() => handleEdit(client)}
                    data-tooltip="Editar"
                    onMouseEnter={(e) => {
                      const button = e.currentTarget;
                      const tooltipText = button.getAttribute('data-tooltip');
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
                    }}
                    onMouseLeave={() => {
                      const tooltip = document.querySelector('.client-tooltip');
                      if (tooltip) tooltip.style.display = 'none';
                    }}
                  >
                    <span className="client-manager__btn-icon">✏️</span>
                    <span className="client-manager__btn-text">Editar</span>
                  </button>
                  <button
                    className="client-manager__action-btn client-manager__action-btn--red"
                    onClick={() => handleDelete(client.id)}
                    data-tooltip="Eliminar"
                    onMouseEnter={(e) => {
                      const button = e.currentTarget;
                      const tooltipText = button.getAttribute('data-tooltip');
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
                    }}
                    onMouseLeave={() => {
                      const tooltip = document.querySelector('.client-tooltip');
                      if (tooltip) tooltip.style.display = 'none';
                    }}
                  >
                    <span className="client-manager__btn-icon">🗑️</span>
                    <span className="client-manager__btn-text">Eliminar</span>
                  </button>
                </div>
              </div>
            ))}
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
