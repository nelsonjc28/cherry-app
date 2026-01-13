import { useState, useEffect } from 'react';
import './ContactPage.css';
import { getIconPath } from '../utils/assetPaths';

const ContactPage = () => {
  const [contactInfo, setContactInfo] = useState({
    address_street: 'José María Izazaga 127 piso 2 Col.',
    address_city: 'Centros México D.F. C.P. 06080',
    phone: '55-5542-4442',
    whatsapp: '',
    email: 'cherryonline@cherry.com.mx',
    map_url: 'https://www.google.com/maps/embed?pb=!1m12!1m8!1m3!1d3830947.253725377!2d-99.1779212!3d20.3350315!3m2!1i1024!2i768!4f13.1!2m1!1scherry%20tienda%20mx%20direccion!5e0!3m2!1ses-419!2sve!4v1753274350284!5m2!1ses-419!2sve',
    store_hours: {},
    online_hours: {}
  });

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        // Agregar timestamp para evitar caché del navegador
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/contact-info?t=${timestamp}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            // Valores por defecto para horarios
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
            
            // Función para fusionar horarios
            const mergeHours = (defaultHours, apiHours) => {
              if (!apiHours || typeof apiHours !== 'object') return defaultHours;
              
              const merged = { ...defaultHours };
              Object.keys(apiHours).forEach(day => {
                if (apiHours[day] && typeof apiHours[day] === 'object') {
                  merged[day] = {
                    open: apiHours[day].open || defaultHours[day]?.open || '',
                    close: apiHours[day].close || defaultHours[day]?.close || '',
                    closed: apiHours[day].closed !== undefined ? apiHours[day].closed : (defaultHours[day]?.closed || false)
                  };
                }
              });
              return merged;
            };
            
            setContactInfo(prev => ({
              ...prev,
              ...data.data,
              // Asegurar que map_url tenga un valor por defecto si viene vacío
              map_url: data.data.map_url || prev.map_url,
              // Fusionar horarios con valores por defecto
              store_hours: mergeHours(defaultStoreHours, data.data.store_hours),
              online_hours: mergeHours(defaultOnlineHours, data.data.online_hours)
            }));
          }
        }
      } catch (error) {
        console.error('Error al cargar información de contacto:', error);
      }
    };

    fetchContactInfo();
    
    // Recargar cuando la página vuelve a estar visible (por si se actualizó en otra pestaña)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchContactInfo();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div className="container">
      <div className="contact-page">
        {/* Right column: Card */}
        <div className="contact-card-col">
          <div className="contact-card">
            <h1 className="contact-title">Contáctanos</h1>
            <div className="cherry-divider"></div>
            <p className="contact-description">
              Con gusto te atenderemos, forma parte de la familia <span className="cherry-highlight">Cherry</span>
            </p>
            <div className="contact-info-list">
              <div className="contact-info-item contact-info-address">
                <div className="round-icon-contact">
                  <img src={getIconPath('Map Marker.svg')} alt="location" className="map-icon-contact" loading="lazy" />
                </div>
                <div>
                  <span className="contact-info-title">Dirección</span>
                  <div className="contact-text-address">
                    <span className="contact-info-text">{contactInfo.address_street}</span>
                    <span className="contact-info-text">{contactInfo.address_city}</span>
                  </div>
                </div>
              </div>
              <div className="contact-info-item contact-info-phone">
                <div className="round-icon-contact">
                  <img src={getIconPath('Map Phone.svg')} alt="phone" className="map-icon-contact" loading="lazy" />
                </div>
                <div>
                  <span className="contact-info-title">Llámanos</span>
                  <span className="contact-info-text">{contactInfo.phone}</span>
                </div>
              </div>
              {contactInfo.whatsapp && (
                <div className="contact-info-item contact-info-whatsapp">
                  <div className="round-icon-contact">
                    <img src={getIconPath('Whatsapp.svg')} alt="whatsapp" className="map-icon-contact" loading="lazy" />
                  </div>
                  <div>
                    <span className="contact-info-title">WhatsApp</span>
                    <a 
                      href={`https://wa.me/${contactInfo.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="contact-info-text whatsapp-link"
                    >
                      {contactInfo.whatsapp}
                    </a>
                  </div>
                </div>
              )}
              <div className="contact-info-item contact-info-email">
                <div className="round-icon-contact">
                  <img src={getIconPath('Map Email.svg')} alt="email" className="map-icon-contact" loading="lazy" />
                </div>
                <div>
                  <span className="contact-info-title">Vía email</span>
                  <span className="contact-info-text email">{contactInfo.email}</span>
                </div>
              </div>
            </div>
            <div className="contact-map-wrapper">
              <iframe
                title="Cherry"
                src={contactInfo.map_url}
                width="100%"
                height="200"
                style={{ border: 0, borderRadius: '4px' }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
            <div className="cherry-divider"></div>
            <div className="contact-hours-section">
              <div className="contact-hours-card">
                <div className="contact-hours-title">
                  <img src={getIconPath('Clock.svg')} className="contact-hours-icon" alt="clock" loading="lazy" />
                  <span>Horario de atención en tienda</span> 
                </div>
                <ul className="contact-hours-list">
                  {(() => {
                    const daysOfWeek = [
                      { key: 'monday', label: 'Lunes' },
                      { key: 'tuesday', label: 'Martes' },
                      { key: 'wednesday', label: 'Miércoles' },
                      { key: 'thursday', label: 'Jueves' },
                      { key: 'friday', label: 'Viernes' },
                      { key: 'saturday', label: 'Sábado' },
                      { key: 'sunday', label: 'Domingo' }
                    ];
                    
                    return daysOfWeek.map((day) => {
                      const dayHours = contactInfo.store_hours?.[day.key];
                      const isClosed = dayHours?.closed || !dayHours?.open || !dayHours?.close;
                      
                      return (
                        <li 
                          key={day.key} 
                          className={isClosed ? 'closed-text' : ''}
                        >
                          <span>{day.label}</span>
                          {isClosed ? (
                            <span className="closed">Cerrado</span>
                          ) : (
                            <span>{dayHours.open} – {dayHours.close}</span>
                          )}
                        </li>
                      );
                    });
                  })()}
                </ul>
              </div>
              <div className="contact-hours-card">
                <div className="contact-hours-title">
                  <img src={getIconPath('Clock.svg')} className="contact-hours-icon" alt="clock" loading="lazy" />
                  <span>Horario de atención en línea</span>
                </div>
                <ul className="contact-hours-list">
                  {(() => {
                    const daysOfWeek = [
                      { key: 'monday', label: 'Lunes' },
                      { key: 'tuesday', label: 'Martes' },
                      { key: 'wednesday', label: 'Miércoles' },
                      { key: 'thursday', label: 'Jueves' },
                      { key: 'friday', label: 'Viernes' },
                      { key: 'saturday', label: 'Sábado' },
                      { key: 'sunday', label: 'Domingo' }
                    ];
                    
                    return daysOfWeek.map((day) => {
                      const dayHours = contactInfo.online_hours?.[day.key];
                      const isClosed = dayHours?.closed || !dayHours?.open || !dayHours?.close;
                      
                      return (
                        <li 
                          key={day.key} 
                          className={isClosed ? 'closed-text' : ''}
                        >
                          <span>{day.label}</span>
                          {isClosed ? (
                            <span className="closed">Cerrado</span>
                          ) : (
                            <span>{dayHours.open} – {dayHours.close}</span>
                          )}
                        </li>
                      );
                    });
                  })()}
                </ul>
              </div>
            </div>
          </div>
        </div>
        {/* Left column: Image */}
        <div className="contact-image-col">
          <img
            src="/images/ContactPage/contact-girl.png"
            alt="Modelo Cherry"
            className="contact-model-image"
            draggable="false"
          />
          <img src="/images/ContactPage/small-ellipse.png" alt="Small Ellipse" className="small-ellipse-image"/>
          <img src="/images/ContactPage/large-ellipse.png" alt="Small Ellipse" className="large-ellipse-image"/>
        </div>
      </div>
    </div>
  );
};

export default ContactPage; 
