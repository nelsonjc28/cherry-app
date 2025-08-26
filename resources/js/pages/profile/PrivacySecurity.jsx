import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './PrivacySecurity.css';

const PrivacySecurity = () => {
  const navigate = useNavigate();
  const [policyContent, setPolicyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [termsStatus, setTermsStatus] = useState(null);

  useEffect(() => {
    loadPrivacyPolicy();
    loadTermsStatus();
  }, []);

  const loadPrivacyPolicy = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/privacy-policy');
      setPolicyContent(response.data.data.content);
    } catch (error) {
      setError('No se pudo cargar la política de privacidad');
      // Contenido por defecto en caso de error
      setPolicyContent(`
        <section class="privacy-section">
          <h2 class="privacy-section__title">1. Introducción</h2>
          <p class="privacy-section__text">
            En Cherry, valoramos tu privacidad y estamos comprometidos a proteger tus
            datos personales. Esta política describe cómo recopilamos, usamos,
            almacenamos y protegemos tu información cuando visitas nuestro sitio web.
          </p>
        </section>
        
        <section class="privacy-section">
          <h2 class="privacy-section__title">2. Información que Recopilamos</h2>
          <p class="privacy-section__text">
            Recopilamos diferentes tipos de información para ofrecerte una experiencia de
            compra personalizada.
          </p>
        </section>
        
        <section class="privacy-section">
          <h2 class="privacy-section__title">3. Uso de la Información</h2>
          <p class="privacy-section__text">
            Utilizamos la información que recopilamos para procesar pedidos, mejorar
            nuestros productos y servicios, y brindar atención al cliente.
          </p>
        </section>
      `);
    } finally {
      setLoading(false);
    }
  };

  const loadTermsStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const response = await axios.get('/api/user/terms/status', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setTermsStatus(response.data.data);
      }
    } catch (error) {
      // Error silencioso para evitar spam en consola
    }
  };

  const handleViewTerms = () => {
    navigate('/terminos');
  };

  if (loading) {
    return (
      <div className="privacy-security-page">
        <div className="privacy-security-page__header">
          <h1 className="privacy-security-page__title">Privacidad y seguridad</h1>
        </div>
        <div className="privacy-security-page__content">
          <div className="privacy-security-page__loading">
            <p>Cargando política de privacidad...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="privacy-security-page">
        <div className="privacy-security-page__header">
          <h1 className="privacy-security-page__title">Privacidad y seguridad</h1>
        </div>
        <div className="privacy-security-page__content">
          <div className="privacy-security-page__error">
            <p>{error}</p>
            <button onClick={loadPrivacyPolicy} className="privacy-security-page__retry-btn">
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="privacy-security-page">
      {/* Header */}
      <div className="privacy-security-page__header">
        <h1 className="privacy-security-page__title">Privacidad y seguridad</h1>
      </div>

      {/* Content */}
      <div className="privacy-security-page__content">
        {/* Renderizar el contenido HTML de la política */}
        <div 
          className="privacy-security-page__policy-content"
          dangerouslySetInnerHTML={{ __html: policyContent }}
        />

        {/* Terms and Conditions Status */}
        {termsStatus && (
          <div className="privacy-security-page__terms-status">
            <h3 className="privacy-security-page__terms-title">Términos y Condiciones</h3>
            <div className="privacy-security-page__terms-info">
              <p>
                <strong>Estado:</strong> {termsStatus.terms_accepted ? 'Aceptados' : 'No aceptados'}
              </p>
              {termsStatus.terms_accepted && (
                <>
                  <p>
                    <strong>Versión aceptada:</strong> {termsStatus.terms_version}
                  </p>
                  <p>
                    <strong>Fecha de aceptación:</strong> {new Date(termsStatus.terms_accepted_at).toLocaleDateString()}
                  </p>
                </>
              )}
              {termsStatus.needs_acceptance && (
                <p className="privacy-security-page__terms-warning">
                  ⚠️ Necesitas aceptar los términos y condiciones actuales
                </p>
              )}
              <button 
                className="privacy-security-page__view-terms-btn"
                onClick={handleViewTerms}
              >
                {termsStatus.terms_accepted ? 'Ver Términos' : 'Aceptar Términos'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PrivacySecurity;
