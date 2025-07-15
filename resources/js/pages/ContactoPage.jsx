import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import CherryButton from '../components/CherryButton/CherryButton';
import { getIconPath } from '../utils/assetPaths';
import './ContactoPage.css';

const ContactoPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aquí iría la lógica para enviar el formulario
    alert('Mensaje enviado correctamente. Nos pondremos en contacto contigo pronto.');
  };

  return (
    <>
      <Helmet>
        <title>Contacto - Cherry Central</title>
        <meta name="description" content="Contáctanos para cualquier consulta sobre nuestros productos, programa de afiliados o soporte técnico." />
      </Helmet>

      <main className="contacto-page">
        <div className="container">
          <div className="contacto-content">
            {/* Información de contacto */}
            <div className="contacto-info">
              <h1 className="contacto-title">Contáctanos</h1>
              <p className="contacto-subtitle">
                ¿Tienes alguna pregunta? Estamos aquí para ayudarte.
              </p>

              <div className="contacto-methods">
                <div className="contact-method">
                  <div className="contact-icon">
                    <img src={getIconPath('Phone.svg')} alt="Teléfono" />
                  </div>
                  <div className="contact-details">
                    <h3>Teléfono</h3>
                    <p>+52 (55) 1234-5678</p>
                    <p>Lun - Vie: 9:00 AM - 6:00 PM</p>
                  </div>
                </div>

                <div className="contact-method">
                  <div className="contact-icon">
                    <img src={getIconPath('Whatsapp.svg')} alt="WhatsApp" />
                  </div>
                  <div className="contact-details">
                    <h3>WhatsApp</h3>
                    <p>+52 (55) 1234-5678</p>
                    <p>Respuesta en menos de 1 hora</p>
                  </div>
                </div>

                <div className="contact-method">
                  <div className="contact-icon">
                    <img src={getIconPath('File Alt.svg')} alt="Email" />
                  </div>
                  <div className="contact-details">
                    <h3>Email</h3>
                    <p>info@cherrycentral.com</p>
                    <p>soporte@cherrycentral.com</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulario de contacto */}
            <div className="contacto-form-container">
              <h2>Envíanos un mensaje</h2>
              <form onSubmit={handleSubmit} className="contacto-form">
                <div className="form-group">
                  <label htmlFor="name">Nombre completo *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Teléfono</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Asunto *</label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="form-select"
                  >
                    <option value="">Selecciona un asunto</option>
                    <option value="productos">Consulta sobre productos</option>
                    <option value="afiliados">Programa de afiliados</option>
                    <option value="soporte">Soporte técnico</option>
                    <option value="ventas">Ventas y pedidos</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="message">Mensaje *</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows="5"
                    className="form-textarea"
                    placeholder="Cuéntanos cómo podemos ayudarte..."
                  ></textarea>
                </div>

                <CherryButton type="submit" variant="red" size="large" fullWidth>
                  Enviar mensaje
                </CherryButton>
              </form>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default ContactoPage; 