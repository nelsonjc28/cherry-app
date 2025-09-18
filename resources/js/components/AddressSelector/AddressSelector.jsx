import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../config/axios';
import useUserStore from '../../store/userStore';
import CherryButton from '../CherryButton/CherryButton';
import CustomButton from '../CustomButton';
import './AddressSelector.css';

const AddressSelector = ({ 
  selectedAddressId, 
  onAddressChange, 
  showAddButton = true,
  className = '' 
}) => {
  const { token, user } = useUserStore();
  const navigate = useNavigate();
  
  // State for addresses
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load addresses from API
  useEffect(() => {
    if (token) {
      loadAddresses();
    } else {
      setLoading(false);
      setError('No hay token de autenticación');
    }
  }, [token]);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        setError('No hay token de autenticación');
        setLoading(false);
        return;
      }

      const response = await api.get('/addresses');
      setAddresses(response.data.addresses || []);
      setError(null);
    } catch (error) {
      console.error('Error loading addresses:', error);
      
      if (error.response?.status === 401) {
        setError('Token de autenticación expirado o inválido');
        if (window.showToast) {
          window.showToast('Token de autenticación expirado o inválido. Por favor, inicia sesión nuevamente.', 'error');
        }
      } else {
        const errorMessage = error.response?.data?.message || 'Error al cargar direcciones';
        setError(errorMessage);
        if (window.showToast) {
          window.showToast(errorMessage, 'error');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle address selection
  const handleAddressChange = (e) => {
    const addressId = e.target.value;
    const selectedAddress = addresses.find(addr => addr.id === parseInt(addressId));
    onAddressChange(selectedAddress);
  };

  // Handle add new address
  const handleAddAddress = () => {
    navigate('/perfil/direcciones');
  };

  // Get default address if no address is selected
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0];
      onAddressChange(defaultAddress);
    }
  }, [addresses, selectedAddressId, onAddressChange]);

  if (loading) {
    return (
      <div className={`address-selector ${className}`}>
        <div className="address-selector__loading">
          <div className="address-selector__spinner"></div>
          <span>Cargando direcciones...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`address-selector ${className}`}>
        <div className="address-selector__error">
          <span className="address-selector__error-icon">⚠️</span>
          <span className="address-selector__error-text">{error}</span>
          <CustomButton
            variant="outlined"
            size="small"
            onClick={loadAddresses}
            className="address-selector__retry-btn"
          >
            Reintentar
          </CustomButton>
        </div>
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <div className={`address-selector ${className}`}>
        <div className="address-selector__empty">
          <span className="address-selector__empty-icon">📍</span>
          <span className="address-selector__empty-text">No tienes direcciones registradas</span>
          {showAddButton && (
            <CherryButton
              variant="red"
              size="small"
              onClick={handleAddAddress}
              className="address-selector__add-btn"
            >
              Agregar dirección
            </CherryButton>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`address-selector ${className}`}>
      <div className="address-selector__field">
        <label className="address-selector__label">
          Dirección de entrega
        </label>
        <div className="address-selector__input-group">
          <select
            className="address-selector__select"
            value={selectedAddressId || ''}
            onChange={handleAddressChange}
          >
            <option value="">Selecciona una dirección</option>
            {addresses.map((address) => (
              <option key={address.id} value={address.id}>
                {address.name} - {address.street_address}, {address.city}
                {address.is_default && ' (Predeterminada)'}
              </option>
            ))}
          </select>
          {showAddButton && (
            <CustomButton
              variant="outlined"
              size="small"
              onClick={handleAddAddress}
              className="address-selector__add-btn"
            >
              + Agregar
            </CustomButton>
          )}
        </div>
      </div>
      
      {/* Display selected address details */}
      {selectedAddressId && (
        <div className="address-selector__selected-address">
          {(() => {
            const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
            if (!selectedAddress) return null;
            
            return (
              <div className="address-selector__address-details">
                <div className="address-selector__address-name">
                  <strong>{selectedAddress.name}</strong>
                  {selectedAddress.is_default && (
                    <span className="address-selector__default-badge">Predeterminada</span>
                  )}
                </div>
                <div className="address-selector__address-street">
                  {selectedAddress.street_address}
                </div>
                <div className="address-selector__address-location">
                  {selectedAddress.city}
                  {selectedAddress.state && `, ${selectedAddress.state}`}
                  {selectedAddress.postal_code && ` CP: ${selectedAddress.postal_code}`}
                  {selectedAddress.country && `, ${selectedAddress.country}`}
                </div>
                {selectedAddress.additional_info && (
                  <div className="address-selector__address-additional">
                    <small>{selectedAddress.additional_info}</small>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default AddressSelector;
