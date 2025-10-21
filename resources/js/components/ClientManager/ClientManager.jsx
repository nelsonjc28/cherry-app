import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import CherryButton from '../CherryButton/CherryButton';
import './ClientManager.css';

const ClientManager = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
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
    } catch (err) {
      setError(err.message);
      window.showToast('Error al cargar clientes: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
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
                    onChange={handleInputChange}
                    required
                    pattern="[0-9]{10}"
                    maxLength="10"
                    onInput={(e) => e.target.value = e.target.value.replace(/[^0-9]/g, '')}
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
                  <div className="client-manager__client-name">
                    {client.first_name} {client.last_name}
                  </div>
                  <div className="client-manager__client-email">
                    {client.email}
                  </div>
                  <div className="client-manager__client-role">
                    Cliente
                  </div>
                </div>
                <div className="client-manager__client-actions">
                  <CherryButton 
                    onClick={() => handleEdit(client)}
                    variant="outline"
                    size="small"
                  >
                    Editar
                  </CherryButton>
                  <CherryButton 
                    onClick={() => handleDelete(client.id)}
                    variant="red"
                    size="small"
                  >
                    Eliminar
                  </CherryButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientManager; 
