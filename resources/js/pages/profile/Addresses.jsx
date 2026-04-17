import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../../config/axios';
import './Addresses.css';
import CherryButton from '../../components/CherryButton/CherryButton';
import { getIconPath } from '../../utils/assetPaths';
import { buildStreetWithNumbers } from '../../utils/addressDisplay';
import useUserStore from '../../store/userStore';
// Removed AddressMapSelector import - mapa no funciona

const Addresses = () => {
  // Obtener token y usuario del store
  const { token, user } = useUserStore();

  // State for dropdown menu
  const [openMenuId, setOpenMenuId] = useState(null);

  // State for selected address
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // State for modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  // State for form
  const [formData, setFormData] = useState({
    street_address: '',
    street_number_ext: '',
    street_number_int: '',
    city: '',
    municipality: '',
    colonia: '',
    state: '',
    postal_code: '',
    country: 'México',
    additional_info: '',
    is_default: false
  });

  // State for SEPOMEX data
  const [settlements, setSettlements] = useState([]);
  const [loadingPostalCode, setLoadingPostalCode] = useState(false);

  // State for addresses from API
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

  // Fetch postal code data from SEPOMEX
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
          colonia: data.asentamientos[0] || '', // También guardar en colonia
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

  // Handle form input changes
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
        colonia: '',
      }));
    }
  };

  // Handle add new address
  const handleAddAddress = () => {
    if (!token) {
      if (window.showToast) {
        window.showToast('No hay token de autenticación. Por favor, inicia sesión nuevamente.', 'error');
      }
      return;
    }

    setFormData({
      street_address: '',
      street_number_ext: '',
      street_number_int: '',
      city: '',
      municipality: '',
      colonia: '',
      state: '',
      postal_code: '',
      country: 'México',
      additional_info: '',
      is_default: false
    });
    setSettlements([]);
    setShowAddModal(true);
  };

  // Handle edit address
  const handleEditAddress = (address) => {
    if (!token) {
      if (window.showToast) {
        window.showToast('No hay token de autenticación. Por favor, inicia sesión nuevamente.', 'error');
      }
      return;
    }

    setEditingAddress(address);
    setFormData({
      street_address: address.street_address || '',
      street_number_ext: address.street_number_ext || '',
      street_number_int: address.street_number_int || '',
      city: address.city || '',
      municipality: address.municipality || '',
      colonia: address.colonia || '',
      state: address.state || '',
      postal_code: address.postal_code || '',
      country: address.country || 'México',
      additional_info: address.additional_info || '',
      is_default: address.is_default || false
    });
    // Si hay código postal, cargar los asentamientos
    if (address.postal_code && address.postal_code.length === 5) {
      fetchPostalCodeData(address.postal_code);
    } else {
      setSettlements([]);
    }
    setShowEditModal(true);
  };

  // Handle save address (add or edit)
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

      if (editingAddress) {
        // Update existing address
        await api.post(`/addresses/${editingAddress.id}`, formData);
      } else {
        // Create new address
        await api.post('/addresses', formData);
      }

      // Close modal
      setShowAddModal(false);
      setShowEditModal(false);
      setEditingAddress(null);

      // Reload addresses
      await loadAddresses();

      // Show success message
      const successMessage = editingAddress ? 'Dirección actualizada correctamente' : 'Dirección agregada correctamente';
      if (window.showToast) {
        window.showToast(successMessage, 'success');
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

  // Handle delete address
  const handleDeleteAddress = async (addressId) => {
    if (!token) {
      if (window.showToast) {
        window.showToast('No hay token de autenticación. Por favor, inicia sesión nuevamente.', 'error');
      }
      return;
    }

    // Buscar la dirección para mostrar información en la confirmación
    const addressToDelete = addresses.find(addr => addr.id === addressId);
    const addressDescription = addressToDelete?.street_address || 'esta dirección';

    // Mostrar confirmación con SweetAlert2
    const result = await Swal.fire({
      title: '¿Eliminar dirección?',
      html: `
        <div class="text-center">
          <p>¿Estás seguro de que quieres eliminar <strong>${addressDescription}</strong>?</p>
          <p class="text-muted small">Esta acción no se puede deshacer.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        popup: 'swal-address-delete',
        confirmButton: 'btn btn-danger',
        cancelButton: 'btn btn-secondary'
      }
    });

    // Si el usuario confirma la eliminación
    if (result.isConfirmed) {
      try {
        // Mostrar loading
        Swal.fire({
          title: 'Eliminando...',
          text: 'Por favor espera mientras se elimina la dirección',
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        await api.delete(`/addresses/${addressId}`);
        await loadAddresses();

        // Cerrar loading y mostrar éxito
        Swal.fire({
          title: '¡Eliminada!',
          text: 'La dirección ha sido eliminada correctamente',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        if (window.showToast) {
          window.showToast('Dirección eliminada correctamente', 'success');
        }
      } catch (error) {

        // Cerrar loading y mostrar error
        Swal.fire({
          title: 'Error',
          text: 'No se pudo eliminar la dirección',
          icon: 'error',
          confirmButtonText: 'Entendido'
        });

        if (error.response?.status === 401) {
          if (window.showToast) {
            window.showToast('Token de autenticación expirado o inválido. Por favor, inicia sesión nuevamente.', 'error');
          }
        } else {
          const errorMessage = error.response?.data?.message || 'Error al eliminar la dirección';
          if (window.showToast) {
            window.showToast(errorMessage, 'error');
          }
        }
      }
    }
  };

  // Handle set default address
  const handleSetDefault = async (addressId) => {
    if (!token) {
      if (window.showToast) {
        window.showToast('No hay token de autenticación. Por favor, inicia sesión nuevamente.', 'error');
      }
      return;
    }

    try {
      await api.patch(`/addresses/${addressId}/set-default`);
      await loadAddresses();

      if (window.showToast) {
        window.showToast('Dirección marcada como predeterminada', 'success');
      }
    } catch (error) {

      if (error.response?.status === 401) {
        if (window.showToast) {
          window.showToast('Token de autenticación expirado o inválido. Por favor, inicia sesión nuevamente.', 'error');
        }
      } else {
        const errorMessage = error.response?.data?.message || 'Error al marcar como predeterminada';
        if (window.showToast) {
          window.showToast(errorMessage, 'error');
        }
      }
    }
  };

  // Handle menu toggle
  const handleMenuToggle = (addressId) => {
    setOpenMenuId(openMenuId === addressId ? null : addressId);
  };

  // Handle address selection
  const handleAddressSelect = (addressId) => {
    setSelectedAddressId(selectedAddressId === addressId ? null : addressId);
  };

  // Handle menu actions
  const handleMenuAction = (addressId, action) => {
    if (action === 'edit') {
      const address = addresses.find(addr => addr.id === addressId);
      if (address) {
        handleEditAddress(address);
      }
    } else if (action === 'setDefaultShipping') {
      handleSetDefault(addressId);
    } else if (action === 'delete') {
      handleDeleteAddress(addressId);
    }

    // Close menu
    setOpenMenuId(null);
  };

  // Close menu when clicking outside
  const handleClickOutside = (e) => {
    if (!e.target.closest('.address-card__menu')) {
      setOpenMenuId(null);
    }
  };

  // Add click outside listener
  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Check if user is authenticated
  if (!user) {
    return (
      <div className="addresses-page">
        <div className="addresses-page__header">
          <h1 className="addresses-page__title">Mis direcciones</h1>
        </div>
        <div className="text-center py-4">
          <p>Debes iniciar sesión para ver tus direcciones.</p>
          <a href="/login" className="btn btn-primary">
            Iniciar Sesión
          </a>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="addresses-page">
        <div className="addresses-page__header">
          <h1 className="addresses-page__title">Mis direcciones</h1>
        </div>
        <div className="text-center py-4">
          <p>Cargando direcciones...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="addresses-page">
        <div className="addresses-page__header">
          <h1 className="addresses-page__title">Mis direcciones</h1>
        </div>
        <div className="text-center py-4">
          <p className="text-danger">Error: {error}</p>
          <button onClick={loadAddresses} className="btn btn-primary">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="addresses-page">
      {/* Header */}
      <div className="addresses-page__header">
        <h1 className="addresses-page__title">Mis direcciones</h1>
      </div>

      {/* Addresses List */}
      <div className="addresses-page__list">
        {addresses.length === 0 ? (
          <div className="text-center py-4">
            <p>No tienes direcciones guardadas</p>
            <p>Haz clic en "Agregar dirección" para comenzar</p>
          </div>
        ) : (
          addresses.map((address) => (
            <div
              key={address.id}
              className={`address-card ${selectedAddressId === address.id ? 'address-card--selected' : ''}`}
              onClick={() => handleAddressSelect(address.id)}
            >
              <div className="address-card__card-content">
                {/* Location Icon */}
                <div className="address-card__icon">
                  <img src={getIconPath('Location.svg')} alt="Ubicación" style={{ width: 12, height: 17 }} />
                </div>
                {/* Address Content */}
                <div className="address-card__content">
                  <div className="address-card__street">
                    {buildStreetWithNumbers(address) || address.street_address}
                  </div>
                  <div className="address-card__city">
                    {address.city}
                    {address.state && `, ${address.state}`}
                    {address.postal_code && ` CP: ${address.postal_code}`}
                    {address.country && `, ${address.country}`}
                  </div>
                  {address.additional_info && (
                    <div className="address-card__additional">
                      <small className="text-muted">{address.additional_info}</small>
                    </div>
                  )}
                  {/* Tags */}
                  {address.is_default && (
                    <div className="address-card__tags">
                      <span className="address-card__tag address-card__tag--shipping">
                        Predeterminada
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="address-card__actions">
                <button
                  className="address-card__action-btn address-card__action-btn--edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditAddress(address);
                  }}
                  aria-label="Editar dirección"
                >
                  Editar
                </button>
                {/* {!address.is_default && (
                  <button
                    className="address-card__action-btn address-card__action-btn--default"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetDefault(address.id);
                    }}
                    aria-label="Usar como predeterminada"
                  >
                    Predeterminar
                  </button>
                )} */}
                <button
                  className="address-card__action-btn address-card__action-btn--delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAddress(address.id);
                  }}
                  aria-label="Eliminar dirección"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Address Button */}
      <div className="addresses-page__actions">
        <CherryButton
          variant="outline"
          size="small"
          icon={
            <img src={getIconPath('Plus.svg')} alt="Agregar" style={{ width: 11, height: 10 }} />
          }
          iconPosition="left"
          onClick={handleAddAddress}
        >
          Agregar dirección
        </CherryButton>
      </div>

      {/* Add Address Modal */}
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
                <div className="form-group form-group--full">
                  <label>Dirección (Calle):</label>
                  <input
                    type="text"
                    name="street_address"
                    value={formData.street_address}
                    onChange={handleInputChange}
                    placeholder="Calle"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>No. Ext.:</label>
                    <input
                      type="text"
                      name="street_number_ext"
                      value={formData.street_number_ext}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        handleInputChange({ target: { name: 'street_number_ext', value } });
                      }}
                      placeholder="Número exterior"
                    />
                  </div>
                  <div className="form-group">
                    <label>No. Int.:</label>
                    <input
                      type="text"
                      name="street_number_int"
                      value={formData.street_number_int}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        handleInputChange({ target: { name: 'street_number_int', value } });
                      }}
                      placeholder="Número interior"
                    />
                  </div>
                </div>
                <div className="form-group form-group--full">
                  <label>Código Postal:</label>
                  <input
                    type="text"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleInputChange}
                    placeholder="CP (5 dígitos)"
                    maxLength="5"
                    pattern="[0-9]{5}"
                    required
                  />
                  {loadingPostalCode && <small style={{ color: '#666' }}>Consultando SEPOMEX...</small>}
                </div>
                <div className="form-group form-group--full">
                  <label>Colonia:</label>
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
                      placeholder="Colonia"
                      disabled={!formData.postal_code || formData.postal_code.length !== 5}
                      required
                    />
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Municipio:</label>
                    <input
                      type="text"
                      name="municipality"
                      value={formData.municipality}
                      readOnly
                      placeholder="Municipio"
                      className="readonly-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Estado:</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      readOnly
                      placeholder="Estado"
                      className="readonly-input"
                    />
                  </div>
                </div>
                <div className="form-group form-group--full">
                  <label>País:</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    readOnly
                    placeholder="País"
                    className="readonly-input"
                  />
                </div>
                <div className="form-group form-group--full">
                  <label>Información adicional:</label>
                  <textarea
                    name="additional_info"
                    value={formData.additional_info}
                    onChange={handleInputChange}
                    placeholder="Referencias, entre calles, etc."
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

      {/* Edit Address Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Dirección</h3>
              <button
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleSaveAddress(); }}>
                <div className="form-group form-group--full">
                  <label>Dirección (Calle):</label>
                  <input
                    type="text"
                    name="street_address"
                    value={formData.street_address}
                    onChange={handleInputChange}
                    placeholder="Calle"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>No. Ext.:</label>
                    <input
                      type="text"
                      name="street_number_ext"
                      value={formData.street_number_ext}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        handleInputChange({ target: { name: 'street_number_ext', value } });
                      }}
                      placeholder="Número exterior"
                    />
                  </div>
                  <div className="form-group">
                    <label>No. Int.:</label>
                    <input
                      type="text"
                      name="street_number_int"
                      value={formData.street_number_int}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        handleInputChange({ target: { name: 'street_number_int', value } });
                      }}
                      placeholder="Número interior"
                    />
                  </div>
                </div>
                <div className="form-group form-group--full">
                  <label>Código Postal:</label>
                  <input
                    type="text"
                    name="postal_code"
                    value={formData.postal_code}
                    onChange={handleInputChange}
                    placeholder="CP (5 dígitos)"
                    maxLength="5"
                    pattern="[0-9]{5}"
                    required
                  />
                  {loadingPostalCode && <small style={{ color: '#666' }}>Consultando SEPOMEX...</small>}
                </div>
                <div className="form-group form-group--full">
                  <label>Colonia:</label>
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
                      placeholder="Colonia"
                      disabled={!formData.postal_code || formData.postal_code.length !== 5}
                      required
                    />
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Municipio:</label>
                    <input
                      type="text"
                      name="municipality"
                      value={formData.municipality}
                      readOnly
                      placeholder="Municipio"
                      className="readonly-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Estado:</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      readOnly
                      placeholder="Estado"
                      className="readonly-input"
                    />
                  </div>
                </div>
                <div className="form-group form-group--full">
                  <label>País:</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    readOnly
                    placeholder="País"
                    className="readonly-input"
                  />
                </div>
                <div className="form-group form-group--full">
                  <label>Información adicional:</label>
                  <textarea
                    name="additional_info"
                    value={formData.additional_info}
                    onChange={handleInputChange}
                    placeholder="Referencias, entre calles, etc."
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
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Actualizar
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

export default Addresses;
