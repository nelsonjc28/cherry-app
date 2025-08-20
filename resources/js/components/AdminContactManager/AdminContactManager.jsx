import React, { useState, useEffect } from 'react';
import './AdminContactManager.css';

const AdminContactManager = () => {
  const [contactInfo, setContactInfo] = useState({
    address_street: 'José María Izazaga 127 piso 2 Col.',
    address_city: 'Centros México D.F. C.P. 06080',
    phone: '55-5542-4442',
    email: 'cherryonline@cherry.com.mx',
    map_url: 'https://www.google.com/maps/embed?pb=!1m12!1m8!1m3!1d3830947.253725377!2d-99.1779212!3d20.3350315!3m2!1i1024!2i768!4f13.1!2m1!1scherry%20tienda%20mx%20direccion!5e0!3m2!1ses-419!2sve!4v1753274350284!5m2!1ses-419!2sve',
    store_hours: {
      monday: { open: '9:30 am', close: '7:00 pm', closed: false },
      tuesday: { open: '9:30 am', close: '7:00 pm', closed: false },
      wednesday: { open: '9:30 am', close: '7:00 pm', closed: false },
      thursday: { open: '9:30 am', close: '7:00 pm', closed: false },
      friday: { open: '9:30 am', close: '5:00 pm', closed: false },
      saturday: { open: '', close: '', closed: true },
      sunday: { open: '', close: '', closed: true }
    },
    online_hours: {
      monday: { open: '9:30 am', close: '7:00 pm', closed: false },
      tuesday: { open: '9:30 am', close: '7:00 pm', closed: false },
      wednesday: { open: '9:30 am', close: '7:00 pm', closed: false },
      thursday: { open: '9:30 am', close: '7:00 pm', closed: false },
      friday: { open: '9:30 am', close: '5:00 pm', closed: false },
      saturday: { open: '', close: '', closed: true },
      sunday: { open: '', close: '', closed: true }
    }
  });

  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const daysOfWeek = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
  ];

  // Cargar información de contacto al montar el componente
  useEffect(() => {
    fetchContactInfo();
  }, []);

  const fetchContactInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contact-info');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Asegurar que store_hours y online_hours tengan la estructura completa
          const defaultStoreHours = {
            monday: { open: '9:30 am', close: '7:00 pm', closed: false },
            tuesday: { open: '9:30 am', close: '7:00 pm', closed: false },
            wednesday: { open: '9:30 am', close: '7:00 pm', closed: false },
            thursday: { open: '9:30 am', close: '7:00 pm', closed: false },
            friday: { open: '9:30 am', close: '5:00 pm', closed: false },
            saturday: { open: '', close: '', closed: true },
            sunday: { open: '', close: '', closed: true }
          };
          
          const defaultOnlineHours = {
            monday: { open: '9:30 am', close: '7:00 pm', closed: false },
            tuesday: { open: '9:30 am', close: '7:00 pm', closed: false },
            wednesday: { open: '9:30 am', close: '7:00 pm', closed: false },
            thursday: { open: '9:30 am', close: '7:00 pm', closed: false },
            friday: { open: '9:30 am', close: '5:00 pm', closed: false },
            saturday: { open: '', close: '', closed: true },
            sunday: { open: '', close: '', closed: true }
          };
          
          setContactInfo(prev => ({
            ...prev,
            ...data.data,
            store_hours: {
              ...defaultStoreHours,
              ...(data.data.store_hours || {})
            },
            online_hours: {
              ...defaultOnlineHours,
              ...(data.data.online_hours || {})
            }
          }));
        }
      }
    } catch (error) {
      if (window.showToast) {
        window.showToast('Error al cargar la información de contacto', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setContactInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleHoursChange = (type, day, field, value) => {
    setContactInfo(prev => {
      // Asegurar que el tipo existe
      if (!prev[type]) {
        prev[type] = {};
      }
      
      // Asegurar que el día existe
      if (!prev[type][day]) {
        prev[type][day] = { open: '', close: '', closed: true };
      }
      
      return {
        ...prev,
        [type]: {
          ...prev[type],
          [day]: {
            ...prev[type][day],
            [field]: value
          }
        }
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    if (window.showToast) {
      window.showToast('', 'info');
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/contact-info', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        },
        body: JSON.stringify(contactInfo)
      });

      if (response.ok) {
        const data = await response.json();
        if (window.showToast) {
          window.showToast(data.message || 'Información de contacto actualizada correctamente', 'success');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar la información');
      }
    } catch (error) {
      if (window.showToast) {
        window.showToast('Error al actualizar la información de contacto: ' + error.message, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderHoursSection = (type, title) => (
    <div className="contact-hours-section">
      <h4>{title}</h4>
      <div className="hours-grid">
        {daysOfWeek.map(day => {
          // Validar que el día existe en contactInfo[type]
          const dayInfo = contactInfo[type]?.[day.key];
          if (!dayInfo) {
            return null; // No renderizar si no hay información del día
          }
          
          return (
            <div key={day.key} className="hours-row">
              <div className="day-label">{day.label}</div>
              <div className="hours-inputs">
                <label>
                  <input
                    type="checkbox"
                    checked={!dayInfo.closed}
                    onChange={(e) => handleHoursChange(type, day.key, 'closed', !e.target.checked)}
                  />
                  Abierto
                </label>
                {!dayInfo.closed && (
                  <>
                    <input
                      type="text"
                      placeholder="9:30 am"
                      value={dayInfo.open || ''}
                      onChange={(e) => handleHoursChange(type, day.key, 'open', e.target.value)}
                      className="time-input"
                    />
                    <span>a</span>
                    <input
                      type="text"
                      placeholder="7:00 pm"
                      value={dayInfo.close || ''}
                      onChange={(e) => handleHoursChange(type, day.key, 'close', e.target.value)}
                      className="time-input"
                    />
                  </>
                )}
                {dayInfo.closed && (
                  <span className="closed-label">Cerrado</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="admin-contact-manager">
        <div className="loading">Cargando información de contacto...</div>
      </div>
    );
  }

  return (
    <div className="admin-contact-manager">
      <div className="admin-contact-header">
        <h2>Gestionar Información de Contacto</h2>
        <p>Actualiza la información de contacto que se muestra en la página de contacto</p>
      </div>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
              </div>
      )}

      <form onSubmit={handleSubmit} className="contact-form">
        <div className="form-section">
          <h3>Información Básica</h3>

              <div className="form-group">
            <label>Dirección - Calle:</label>
                <input
                  type="text"
              value={contactInfo.address_street}
              onChange={(e) => handleInputChange('address_street', e.target.value)}
              placeholder="José María Izazaga 127 piso 2 Col."
            />
            </div>

            <div className="form-group">
            <label>Dirección - Ciudad:</label>
              <input
                type="text"
              value={contactInfo.address_city}
              onChange={(e) => handleInputChange('address_city', e.target.value)}
              placeholder="Centros México D.F. C.P. 06080"
              />
            </div>

            <div className="form-group">
            <label>Teléfono:</label>
            <input
              type="text"
              value={contactInfo.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="55-5542-4442"
              />
            </div>

              <div className="form-group">
            <label>Email:</label>
                <input
              type="email"
              value={contactInfo.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="cherryonline@cherry.com.mx"
                />
              </div>

              <div className="form-group">
            <label>URL del Mapa (Google Maps Embed):</label>
            <textarea
              value={contactInfo.map_url}
              onChange={(e) => handleInputChange('map_url', e.target.value)}
              placeholder="URL del mapa de Google Maps"
              rows="3"
                />
              </div>
            </div>

        <div className="form-section">
          <h3>Horarios de Atención</h3>
          
          {renderHoursSection('store_hours', 'Horario de Atención en Tienda')}
          {renderHoursSection('online_hours', 'Horario de Atención en Línea')}
            </div>

            <div className="form-actions">
          <button
            type="submit"
            disabled={submitting}
            className="submit-btn"
          >
            {submitting ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>

      <div className="preview-section">
        <h3>Vista Previa</h3>
        <div className="contact-preview">
          <div className="preview-info">
            <h4>Información de Contacto</h4>
            <p><strong>Dirección:</strong> {contactInfo.address_street}</p>
            <p><strong>Ciudad:</strong> {contactInfo.address_city}</p>
            <p><strong>Teléfono:</strong> {contactInfo.phone}</p>
            <p><strong>Email:</strong> {contactInfo.email}</p>
              </div>
              
          <div className="preview-hours">
            <h4>Horarios de Tienda</h4>
            {daysOfWeek.map(day => (
              <p key={day.key}>
                <strong>{day.label}:</strong> {
                  contactInfo.store_hours[day.key].closed 
                    ? 'Cerrado' 
                    : `${contactInfo.store_hours[day.key].open} - ${contactInfo.store_hours[day.key].close}`
                }
              </p>
            ))}
              </div>
            </div>
      </div>
    </div>
  );
};

export default AdminContactManager; 