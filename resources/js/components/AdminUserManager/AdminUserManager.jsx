import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import CherryButton from '../CherryButton/CherryButton';
import './AdminUserManager.css';

const AdminUserManager = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    email: '',
    phone: '',
    password: '',
    role_id: '1' // Default to admin role (ID: 1)
  });

  // Fetch users and roles on component mount
  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener usuarios');
      }
      
      const data = await response.json();
      // Filter only admin users
      const adminUsers = data.users.filter(user => user.role?.name === 'admin');
      setUsers(adminUsers);
    } catch (err) {
      setError(err.message);
      window.showToast('Error al cargar usuarios: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener roles');
      }
      
      const data = await response.json();
      setRoles(data.roles);
    } catch (err) {
      setError(err.message);
      window.showToast('Error al cargar roles: ' + err.message, 'error');
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
      role_id: '1' // Default to admin role (ID: 1)
    });
    setEditingUser(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingUser 
        ? `/api/admin/users/${editingUser.id}`
        : '/api/admin/users';
      
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
        editingUser ? 'Administrador actualizado exitosamente' : 'Administrador registrado exitosamente',
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
      password: '',
      role_id: user.role_id
    });
    setShowForm(true);
  };

  const handleDelete = async (userId) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer. El administrador será eliminado permanentemente.',
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
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        window.showToast(data.message || 'Error al eliminar administrador', 'error');
        return;
      }
      
      await fetchUsers();
      window.showToast('Administrador eliminado exitosamente', 'success', 4000);
    } catch (err) {
      window.showToast('Error: ' + err.message, 'error');
    }
  };

  if (loading) {
    return <div className="admin-user-manager__loading">Cargando usuarios...</div>;
  }

  if (error) {
    return <div className="admin-user-manager__error">Error: {error}</div>;
  }

  return (
    <div className="admin-user-manager">
      <div className="admin-user-manager__header">
        <h2>Gestión de Usuarios Administradores</h2>
        <CherryButton 
          onClick={() => setShowForm(true)}
          variant="red"
          size="medium"
        >
          Agregar Administrador
        </CherryButton>
      </div>

      {/* User Form */}
      {showForm && (
        <div className="admin-user-manager__form-overlay">
          <div className="admin-user-manager__form">
            <div className="admin-user-manager__form-header">
              <h3>{editingUser ? 'Editar Administrador' : 'Crear Nuevo Administrador'}</h3>
              <button 
                className="admin-user-manager__form-close"
                onClick={resetForm}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="admin-user-manager__form-content">
              <div className="admin-user-manager__form-row">
                <div className="admin-user-manager__form-group">
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
                <div className="admin-user-manager__form-group">
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
              
              <div className="admin-user-manager__form-group">
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
              
              <div className="admin-user-manager__form-row">
                <div className="admin-user-manager__form-group">
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
                <div className="admin-user-manager__form-group">
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
                    onInput={(e) => {
                      e.target.value = e.target.value.replace(/[^0-9]/g, '');
                      if (e.target.value.length > 10) {
                        e.target.value = e.target.value.slice(0, 10);
                      }
                    }}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="admin-user-manager__form-row">
                <div className="admin-user-manager__form-group">
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
                    <p className="admin-user-manager__password-hint">
                      Tu contraseña debe tener mínimo 8 caracteres y al menos una letra y un número
                    </p>
                  )}
                </div>
              </div>
              
              <div className="admin-user-manager__form-actions">
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
      <div className="admin-user-manager__list">
        <div className="admin-user-manager__list-header">
          <h3>Administradores ({users.length})</h3>
        </div>
        
        {users.length === 0 ? (
          <div className="admin-user-manager__empty">
            No hay administradores registrados
          </div>
        ) : (
          <div className="admin-user-manager__users">
            {users.map(user => (
              <div key={user.id} className="admin-user-manager__user-card">
                <div className="admin-user-manager__user-info">
                  <div className="admin-user-manager__user-name">
                    {user.first_name} {user.last_name}
                  </div>
                  <div className="admin-user-manager__user-email">
                    {user.email}
                  </div>
                  <div className="admin-user-manager__user-role">
                    Administrador
                  </div>
                </div>
                <div className="admin-user-manager__user-actions">
                  <CherryButton 
                    onClick={() => handleEdit(user)}
                    variant="outline"
                    size="small"
                  >
                    Editar
                  </CherryButton>
                  <CherryButton 
                    onClick={() => handleDelete(user.id)}
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

export default AdminUserManager; 
