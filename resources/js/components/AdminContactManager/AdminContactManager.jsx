import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import CherryButton from '../CherryButton/CherryButton';
import './AdminContactManager.css';

const AdminContactManager = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    type: '',
    title: '',
    value: '',
    description: '',
    icon: '',
    is_active: true,
    order: 0
  });

  // Fetch contacts on component mount
  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/admin/contacts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener contactos');
      }
      
      const data = await response.json();
      setContacts(data.contacts);
    } catch (err) {
      setError(err.message);
      window.showToast('Error al cargar contactos: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const resetForm = () => {
    setFormData({
      type: '',
      title: '',
      value: '',
      description: '',
      icon: '',
      is_active: true,
      order: 0
    });
    setEditingContact(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingContact 
        ? `/api/admin/contacts/${editingContact.id}`
        : '/api/admin/contacts';
      
      const method = editingContact ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar contacto');
      }

      const data = await response.json();
      
      if (editingContact) {
        setContacts(contacts.map(contact => 
          contact.id === editingContact.id ? data.contact : contact
        ));
        window.showToast('Contacto actualizado exitosamente', 'success');
      } else {
        setContacts([...contacts, data.contact]);
        window.showToast('Contacto creado exitosamente', 'success');
      }
      
      resetForm();
    } catch (err) {
      window.showToast('Error: ' + err.message, 'error');
    }
  };

  const handleEdit = (contact) => {
    setFormData({
      type: contact.type,
      title: contact.title,
      value: contact.value,
      description: contact.description || '',
      icon: contact.icon || '',
      is_active: contact.is_active,
      order: contact.order
    });
    setEditingContact(contact);
    setShowForm(true);
  };

  const handleDelete = async (contact) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Deseas eliminar el contacto "${contact.title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/admin/contacts/${contact.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Error al eliminar contacto');
        }

        setContacts(contacts.filter(c => c.id !== contact.id));
        window.showToast('Contacto eliminado exitosamente', 'success');
      } catch (err) {
        window.showToast('Error al eliminar contacto: ' + err.message, 'error');
      }
    }
  };

  const handleToggleStatus = async (contact) => {
    try {
      const response = await fetch(`/api/admin/contacts/${contact.id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cambiar estado');
      }

      const data = await response.json();
      setContacts(contacts.map(c => 
        c.id === contact.id ? data.contact : c
      ));
      
      window.showToast(
        `Contacto ${data.contact.is_active ? 'activado' : 'desactivado'} exitosamente`, 
        'success'
      );
    } catch (err) {
      window.showToast('Error al cambiar estado: ' + err.message, 'error');
    }
  };

  const getTypeLabel = (type) => {
    const types = {
      'phone': 'Teléfono',
      'email': 'Email',
      'whatsapp': 'WhatsApp',
      'address': 'Dirección',
      'social': 'Red Social'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="admin-contact-manager">
        <div className="loading">Cargando contactos...</div>
      </div>
    );
  }

  return (
    <div className="admin-contact-manager">
      <div className="admin-contact-manager__header">
        <h2 className="section-title">Gestión de Contactos</h2>
        <CherryButton 
          onClick={() => setShowForm(true)} 
          variant="red" 
          size="medium"
        >
          Agregar Contacto
        </CherryButton>
      </div>

      {showForm && (
        <div className="admin-contact-manager__form-container">
          <h3>{editingContact ? 'Editar Contacto' : 'Nuevo Contacto'}</h3>
          <form onSubmit={handleSubmit} className="admin-contact-manager__form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="type">Tipo *</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                  className="form-select"
                >
                  <option value="">Seleccionar tipo</option>
                  <option value="phone">Teléfono</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="address">Dirección</option>
                  <option value="social">Red Social</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="title">Título *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  placeholder="Ej: Teléfono Principal"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="value">Valor *</label>
              <input
                type="text"
                id="value"
                name="value"
                value={formData.value}
                onChange={handleInputChange}
                required
                className="form-input"
                placeholder="Ej: +52 (55) 1234-5678"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Descripción</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="form-textarea"
                placeholder="Ej: Lun - Vie: 9:00 AM - 6:00 PM"
                rows="3"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="icon">Icono</label>
                <input
                  type="text"
                  id="icon"
                  name="icon"
                  value={formData.icon}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Ej: Phone.svg"
                />
              </div>

              <div className="form-group">
                <label htmlFor="order">Orden</label>
                <input
                  type="number"
                  id="order"
                  name="order"
                  value={formData.order}
                  onChange={handleInputChange}
                  className="form-input"
                  min="0"
                />
              </div>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="form-checkbox"
                />
                <span>Activo</span>
              </label>
            </div>

            <div className="form-actions">
              <CherryButton type="submit" variant="red" size="medium">
                {editingContact ? 'Actualizar' : 'Crear'} Contacto
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
      )}

      <div className="admin-contact-manager__list">
        {contacts.length === 0 ? (
          <div className="empty-state">
            <p>No hay contactos registrados</p>
          </div>
        ) : (
          contacts.map(contact => (
            <div key={contact.id} className={`contact-item ${!contact.is_active ? 'inactive' : ''}`}>
              <div className="contact-info">
                <div className="contact-header">
                  <h4>{contact.title}</h4>
                  <span className={`status-badge ${contact.is_active ? 'active' : 'inactive'}`}>
                    {contact.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="contact-details">
                  <p><strong>Tipo:</strong> {getTypeLabel(contact.type)}</p>
                  <p><strong>Valor:</strong> {contact.value}</p>
                  {contact.description && (
                    <p><strong>Descripción:</strong> {contact.description}</p>
                  )}
                  {contact.icon && (
                    <p><strong>Icono:</strong> {contact.icon}</p>
                  )}
                  <p><strong>Orden:</strong> {contact.order}</p>
                </div>
              </div>
              
              <div className="contact-actions">
                <CherryButton 
                  onClick={() => handleEdit(contact)} 
                  variant="outline" 
                  size="small"
                >
                  Editar
                </CherryButton>
                <CherryButton 
                  onClick={() => handleToggleStatus(contact)} 
                  variant={contact.is_active ? "outline" : "red"} 
                  size="small"
                >
                  {contact.is_active ? 'Desactivar' : 'Activar'}
                </CherryButton>
                <CherryButton 
                  onClick={() => handleDelete(contact)} 
                  variant="red" 
                  size="small"
                >
                  Eliminar
                </CherryButton>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminContactManager; 