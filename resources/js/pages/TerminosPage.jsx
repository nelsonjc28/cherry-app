import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import './TerminosPage.css';
import apiClient from '../api/config/apiConfig';

const TerminosPage = () => {
  const navigate = useNavigate();
  const [termsContent, setTermsContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAcceptance, setShowAcceptance] = useState(false);

  useEffect(() => {
    loadTermsAndConditions();
  }, []);

  const loadTermsAndConditions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/terms-conditions');
      setTermsContent(response.data.data.content);
      setShowAcceptance(true);
    } catch (error) {
      setError('No se pudieron cargar los términos y condiciones');
      // Contenido por defecto en caso de error
      setTermsContent(`
        <h2>1. Aceptación de los Términos</h2>
        <p>Al acceder y utilizar este sitio web, usted acepta estar sujeto a estos términos y condiciones de uso. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestro servicio.</p>
        
        <h2>2. Descripción del Servicio</h2>
        <p>Cherry Central es una plataforma de comercio electrónico que ofrece productos de moda femenina. Nuestro servicio incluye la visualización de catálogos, información de productos y facilitación de transacciones comerciales.</p>
        
        <h2>3. Uso Aceptable</h2>
        <p>Usted se compromete a utilizar este sitio web únicamente para fines legales y de acuerdo con estos términos y condiciones.</p>
      `);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTerms = async () => {
    try {
      await apiClient.post('/api/user/terms/accept');
      if (window.showToast) {
        window.showToast('Términos y condiciones aceptados correctamente', 'success');
      }
      // Redirigir al perfil
      navigate('/perfil');
    } catch (error) {
      if (window.showToast) {
        window.showToast('Error al aceptar los términos y condiciones', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="terminos-page">
        <div className="container">
          <div className="terminos-content">
            <h1>Términos y Condiciones</h1>
            <p className="terminos-date">Última actualización: Enero 2025</p>
            <div className="terminos-loading">
              <p>Cargando términos y condiciones...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="terminos-page">
        <div className="container">
          <div className="terminos-content">
            <h1>Términos y Condiciones</h1>
            <p className="terminos-date">Última actualización: Enero 2025</p>
            <div className="terminos-error">
              <p>{error}</p>
              <button onClick={loadTermsAndConditions} className="terminos-retry-btn">
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Términos y Condiciones - Cherry Central</title>
        <meta name="description" content="Términos y condiciones de uso de Cherry Central. Conoce nuestros términos legales y políticas de uso." />
      </Helmet>

      <main className="terminos-page">
        <div className="container">
          <div className="terminos-content">
            <h1>Términos y Condiciones</h1>
            <p className="terminos-date">Última actualización: Enero 2025</p>

            <div 
              className="terminos-content-html"
              dangerouslySetInnerHTML={{ __html: termsContent }}
            />

            {showAcceptance && (
              <div className="terminos-acceptance">
                <button 
                  className="terminos-accept-btn"
                  onClick={handleAcceptTerms}
                >
                  Acepto los Términos y Condiciones
                </button>
                <p className="terminos-acceptance-note">
                  Al hacer clic en "Acepto los Términos y Condiciones", confirma que ha leído, 
                  entendido y acepta cumplir con todos los términos y condiciones establecidos.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
};

export default TerminosPage; 
