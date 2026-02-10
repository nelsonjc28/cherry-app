import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../config/axios';
import useUserStore from '../../store/userStore';
import AddressMapSelector from '../AddressMapSelector/AddressMapSelector';
import './AddressSelector.css';

const AddressSelector = ({ selectedAddressId, onAddressChange, className = '' }) => {
  const { token, user } = useUserStore();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loadingPostalCode, setLoadingPostalCode] = useState(false);

  const fetchPostalCodeData = async (postalCode) => {
    if (!postalCode || postalCode.length !== 5) {
      setSettlements([]);
      return;
    }

    setLoadingPostalCode(true);
    try {
      const response = await fetch(`https://sepomex.789.com.mx/${postalCode}`);
      const data = await response.json();

      if (data && data.asentamientos && data.asentamientos.length > 0) {
        setSettlements(data.asentamientos);
        setFormData(prev => ({
          ...prev,
          state: data.estados && data.estados.length > 0 ? data.estados[0] : '',
          municipality: data.municipios && data.municipios.length > 0 ? data.municipios[0] : '',
          city: data.asentamientos[0], // Seleccionar el primer asentamiento por defecto
        }));
      } else {
        setSettlements([]);
        if (window.showToast) {
          window.showToast('Código postal no encontrado', 'warning');
        }
      }
    } catch (error) {
      setSettlements([]);
      if (window.showToast) {
        window.showToast('Error al consultar el código postal', 'error');
      }
    } finally {
      setLoadingPostalCode(false);
    }
  };


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
      let addressList = [];
      if (response.data.addresses && Array.isArray(response.data.addresses)) {
        addressList = response.data.addresses;
        setAddresses(addressList);
      } else if (Array.isArray(response.data)) {
        addressList = response.data;
        setAddresses(addressList);
      } else {
        setError('No se encontraron direcciones');
        return;
      }

      // Si no hay dirección seleccionada, seleccionar la predeterminada automáticamente
      if (!selectedAddressId && addressList.length > 0 && onAddressChange) {
        const defaultAddress = addressList.find(addr => addr.is_default);
        if (defaultAddress) {
          onAddressChange(defaultAddress);
        } else {
          // Si no hay predeterminada, seleccionar la primera
          onAddressChange(addressList[0]);
        }
      } else if (selectedAddressId) {
        // Si hay una dirección seleccionada, asegurar que esté en la lista
        const selectedAddress = addressList.find(addr => addr.id === selectedAddressId);
        if (selectedAddress && onAddressChange) {
          onAddressChange(selectedAddress);
        }
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

  const formatAddressForSelect = (address) => {
    const parts = [];
    if (address.street_address) parts.push(address.street_address);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.postal_code) parts.push(`CP: ${address.postal_code}`);
    const addressString = parts.join(', ');
    return addressString + (address.is_default ? ' (Predeterminada)' : '');
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

  const [formData, setFormData] = useState({
    street_address: '',
    city: '',
    municipality: '',
    state: '',
    postal_code: '',
    country: 'México',
    additional_info: '',
    is_default: false,
    latitude: null,
    longitude: null
  });

  // State for modal
  const [showAddModal, setShowAddModal] = useState(false);


  const handleSaveAddress = async () => {
    try {
      // Validate required fields
      if (!formData.street_address || !formData.city) {
        if (window.showToast) {
          window.showToast('Por favor completa los campos requeridos', 'warning');
        }
        return;
      }

      if (!token) {
        if (window.showToast) {
          window.showToast('No hay token de autenticación. Por favor, inicia sesión nuevamente.', 'error');
        }
        return;
      }

      /* if (editingAddress) {
        // Update existing address
        await api.post(`/addresses/${editingAddress.id}`, formData);
      } else { */
        // Create new address
        await api.post('/addresses', formData);
      /* } */

      // Close modal
      setShowAddModal(false);

      // Show success message
      const successMessage = 'Dirección agregada correctamente';
      if (window.showToast) {
        window.showToast(successMessage, 'success');
        fetchAddresses();
      }
    } catch (error) {

      if (error.response?.status === 401) {
        if (window.showToast) {
          window.showToast('Token de autenticación expirado o inválido. Por favor, inicia sesión nuevamente.', 'error');
        }
      } else {
        const errorMessage = error.response?.data?.message || 'Error al guardar la dirección';
        if (window.showToast) {
          window.showToast(errorMessage, 'error');
        }
      }
    }
  };

  const handleAddAddress = () => {
    if (!token) {
      if (window.showToast) {
        window.showToast('No hay token de autenticación. Por favor, inicia sesión nuevamente.', 'error');
      }
      return;
    }

    setFormData({
      street_address: '',
      city: '',
      municipality: '',
      state: '',
      postal_code: '',
      country: 'México',
      additional_info: '',
      is_default: false,
      latitude: null,
      longitude: null
    });
    setSettlements([]);
    setShowAddModal(true);
  };


  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Si el código postal cambia y tiene 5 dígitos, buscar en SEPOMEX
    if (name === 'postal_code' && value.length === 5) {
      fetchPostalCodeData(value);
    } else if (name === 'postal_code' && value.length < 5) {
      setSettlements([]);
      setFormData(prev => ({
        ...prev,
        state: '',
        municipality: '',
        city: '',
      }));
    }
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
              onClick={handleAddAddress}
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
                    {formatAddressForSelect(address)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleAddAddress}
              className="address-selector__add-btn address-selector__add-btn--secondary"
            >
              + Agregar nueva dirección
            </button>
          </>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nueva Dirección</h3>
              <button
                className="modal-close"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleSaveAddress(); }}>
                <div className="form-row">
                  <div className="form-group">
                    <input
                      type="text"
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleInputChange}
                      placeholder="Código Postal (5 dígitos)"
                      maxLength="5"
                      pattern="[0-9]{5}"
                      required
                    />
                    {loadingPostalCode && <small style={{ color: '#666' }}>Consultando...</small>}
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      name="street_address"
                      value={formData.street_address}
                      onChange={handleInputChange}
                      placeholder="Calle y número"
                      required
                    />
                  </div>
                </div>
                <div className="form-info-label">
                  Autocompletado con código postal
                </div>
                <div className="form-row">
                  <div className="form-group">
                    {settlements.length > 0 ? (
                      <select
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Selecciona una colonia</option>
                        {settlements.map((settlement, index) => (
                          <option key={index} value={settlement}>
                            {settlement}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Colonia/Asentamiento"
                        disabled
                        required
                      />
                    )}
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      name="municipality"
                      value={formData.municipality}
                      readOnly
                      placeholder="Municipio"
                      className="readonly-input"
                    />
                  </div>
                </div>
                {/* Mapa de Google Maps para seleccionar ubicación exacta */}
                {formData.city && formData.municipality && formData.state && (
                  <AddressMapSelector
                    settlement={formData.city}
                    municipality={formData.municipality}
                    state={formData.state}
                    postalCode={formData.postal_code}
                    initialLat={formData.latitude}
                    initialLng={formData.longitude}
                    onLocationSelect={(location) => {
                      setFormData(prev => ({
                        ...prev,
                        latitude: location.lat,
                        longitude: location.lng
                      }));
                    }}
                  />
                )}
                <div className="form-row">
                  <div className="form-group">
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      readOnly
                      placeholder="Estado"
                      className="readonly-input"
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      readOnly
                      placeholder="País"
                      className="readonly-input"
                    />
                  </div>
                </div>
                <div className="form-group form-group--full">
                  <textarea
                    name="additional_info"
                    value={formData.additional_info}
                    onChange={handleInputChange}
                    placeholder="Información adicional (Referencias, entre calles, etc.)"
                    rows="3"
                  />
                </div>
                <div className="form-group form-group--full">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="is_default"
                      checked={formData.is_default}
                      onChange={handleInputChange}
                    />
                    Marcar como dirección predeterminada
                  </label>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>


  );
};

export default AddressSelector;

