import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../config/axios';
import useUserStore from '../../store/userStore';
import './AddressSelector.css';

const AddressSelector = ({ selectedAddressId, onAddressChange, className = '' }) => {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchAddresses();
    }
  }, [user]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);

      // Verificar si hay token de autenticación
      const token = localStorage.getItem('token');

      const response = await api.get('/addresses');

      // Verificar diferentes formatos de respuesta
      if (response.data.addresses && Array.isArray(response.data.addresses)) {

        setAddresses(response.data.addresses);
        
        // Si hay una dirección seleccionada, asegurar que esté en la lista
        if (selectedAddressId && !addresses.find(addr => addr.id === selectedAddressId)) {
          const selectedAddress = response.data.addresses.find(addr => addr.id === selectedAddressId);
          if (selectedAddress && onAddressChange) {
            onAddressChange(selectedAddress);
          }
        }
      } else if (Array.isArray(response.data)) {

        setAddresses(response.data);
      } else {

        setError('No se encontraron direcciones');
      }
    } catch (error) {

      let errorMessage = 'Error al cargar las direcciones';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'La conexión tardó demasiado. Verifica tu conexión a internet.';

      } else if (error.response?.status === 401) {
        errorMessage = 'Sesión expirada. Por favor, inicia sesión nuevamente.';

      } else if (error.response?.status === 403) {
        errorMessage = 'No tienes permisos para acceder a las direcciones.';

      } else if (error.response?.status === 500) {
        errorMessage = 'Error interno del servidor. Intenta nuevamente.';

      } else if (!error.response) {
        errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión.';

      }
      
      setError(errorMessage);
      
      // Mostrar toast si está disponible
      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddressChange = (event) => {
    const addressId = parseInt(event.target.value);
    const selectedAddress = addresses.find(addr => addr.id === addressId);
    
    if (selectedAddress && onAddressChange) {
      onAddressChange(selectedAddress);
    }
  };

  const handleAddNewAddress = () => {
    navigate('/perfil/direcciones');
  };

  if (loading) {
    return (
      <div className={`address-selector ${className}`}>
        <div className="address-selector__loading">
          <div className="spinner"></div>
          <span>Cargando direcciones...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`address-selector ${className}`}>
        <div className="address-selector__error">
          <p>Error al cargar las direcciones</p>
          <button onClick={fetchAddresses} className="address-selector__retry-btn">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`address-selector ${className}`}>
      <div className="address-selector__header">
        <h3>Dirección de entrega</h3>
      </div>
      
      <div className="address-selector__content">
        {addresses.length === 0 ? (
          <div className="address-selector__empty">
            <p>No tienes direcciones registradas</p>
            <button 
              onClick={handleAddNewAddress}
              className="address-selector__add-btn"
            >
              Agregar dirección
            </button>
          </div>
        ) : (
          <>
            <div className="address-selector__select-wrapper">
              <select
                value={selectedAddressId || ''}
                onChange={handleAddressChange}
                className="address-selector__select"
              >
                <option value="">Selecciona una dirección</option>
                {addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.name} {address.is_default && '(Predeterminada)'}
                  </option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={handleAddNewAddress}
              className="address-selector__add-btn address-selector__add-btn--secondary"
            >
              + Agregar nueva dirección
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AddressSelector;

